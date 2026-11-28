// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type { WarmEntries, WarmEntry } from './hls-warm-cache';
import { warmKey } from './hls-warm-cache';

/** The part of an hls.js `Fragment` the prefetch reads. */
export interface PrefetchFragment {
  start: number;
  duration: number;
  /** Absolute URL, as hls.js passes it to its loader. */
  url: string;
  byteRangeStartOffset?: number | undefined;
  byteRangeEndOffset?: number | undefined;
}

export interface SeekPrefetchOptions {
  /** Length of the window to fetch from the position. */
  seconds: number;
  /** Stop starting new fetches once this many bytes are held. */
  maxBytes?: number;
  authHeader?: (url: string) => string | undefined;
  fetch?: typeof fetch;
}

interface PrefetchWindow {
  from: number;
  to: number;
  settled: boolean;
}

const DEFAULT_MAX_BYTES = 48 * 1024 * 1024;

/**
 * Fetches the fragments of the CURRENT source around a future seek target into
 * memory. The bodies sit in `entries`, which the warm loader reads, so hls.js
 * answers the seek from memory instead of the network.
 */
export class SeekPrefetch {
  readonly entries: WarmEntries;
  private _windows: PrefetchWindow[] = [];
  private _abort = new AbortController();
  private _bytes = 0;

  constructor(entries: WarmEntries = new Map()) {
    this.entries = entries;
  }

  /** Fetch the fragments of every stream that overlap `[from, from + seconds)`. Resolves when all have settled. */
  async prefetch(streams: PrefetchFragment[][], from: number, opts: SeekPrefetchOptions): Promise<void> {
    const to = from + opts.seconds;
    const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
    const signal = this._abort.signal;
    const pending: Array<Promise<WarmEntry | undefined>> = [];
    let covered: PrefetchWindow | undefined;

    for (const fragments of streams) {
      const inside = fragments.filter((frag) => frag.start + frag.duration > from && frag.start < to);

      if (inside.length === 0) continue;

      const first = inside[0]!;
      const last = inside[inside.length - 1]!;
      const start = first.start;
      const end = last.start + last.duration;

      covered = covered
        ? {
            from: Math.max(covered.from, start),
            to: Math.min(covered.to, end),
            settled: false,
          }
        : {
            from: start,
            to: end,
            settled: false,
          };

      for (const frag of inside) {
        const key = warmKey(frag.url, frag.byteRangeStartOffset, frag.byteRangeEndOffset);
        const held = this.entries.get(key);

        if (held) {
          pending.push(held);

          continue;
        }

        if (this._bytes >= maxBytes) continue;

        const startedAt = performance.now();
        const authorization = opts.authHeader?.(frag.url);
        const headers = new Headers();

        if ((frag.byteRangeStartOffset ?? 0) !== 0 || (frag.byteRangeEndOffset ?? 0) !== 0) {
          headers.set('Range', `bytes=${frag.byteRangeStartOffset}-${(frag.byteRangeEndOffset ?? 1) - 1}`);
        }

        if (authorization) {
          headers.set('Authorization', authorization);
        }

        const request = doFetch(frag.url, {
          signal,
          headers,
        }).then(async (response): Promise<WarmEntry | undefined> => {
          if (!response.ok)
            return undefined;

          const data = await response.arrayBuffer();

          this._bytes += data.byteLength;

          return {
            data,
            fetchMs: performance.now() - startedAt,
          };
        })
          .catch(() => undefined);

        this.entries.set(key, request);
        pending.push(request);
      }
    }

    if (covered === undefined) return;

    const window = covered;

    this._windows.push(window);

    const results = await Promise.all(pending);

    if (signal.aborted) return;

    if (results.includes(undefined)) {
      this._windows = this._windows.filter((item) => item !== window);
    } else {
      window.settled = true;
    }
  }

  /** `true` once every fragment of a window that covers `seconds` has been fetched. */
  isPrerolled(seconds: number): boolean {
    return this._windows.some((window) => window.settled && seconds >= window.from && seconds < window.to);
  }

  /** Abort in-flight fetches and drop everything held. Idempotent. */
  clear(): void {
    this._abort.abort();
    this._abort = new AbortController();
    this.entries.clear();
    this._windows = [];
    this._bytes = 0;
  }
}
