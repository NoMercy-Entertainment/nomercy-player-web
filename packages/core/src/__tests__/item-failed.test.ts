// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * `itemFailed` fires once for every item that fails to start, whatever the
 * cause: a codec the browser refuses, a fatal stream error, a missing URL, a
 * missing file or a server error.
 */

import type { BasePlaylistItem } from '../types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  composeMixins,
  playerCoreMethods,
  PlayerError,
} from '../index';
import { MockPlayerBase } from './helpers/mock-player-base';

class MockPlayer extends MockPlayerBase {
  declare setup: (config: Record<string, unknown>) => this;
  declare ready: () => Promise<void>;
  declare load: (item: BasePlaylistItem, opts?: Record<string, unknown>) => Promise<void>;
  declare next: (opts?: unknown) => Promise<void>;
  declare queue: { (): ReadonlyArray<unknown>; (items: unknown[], opts?: unknown): void };
  declare item: { (): unknown; (target: unknown, opts?: unknown): void };
  declare auth: (config: Record<string, unknown>) => void;
}

composeMixins(MockPlayer.prototype, ...playerCoreMethods);

const ITEMS: BasePlaylistItem[] = [
  {
    id: 'a',
    title: 'A',
    url: 'https://media.example/a.m3u8',
  },
  {
    id: 'b',
    title: 'B',
    url: 'https://media.example/b.m3u8',
  },
  {
    id: 'c',
    title: 'C',
    url: 'https://media.example/c.m3u8',
  },
];

interface ItemFailed { item: BasePlaylistItem; error: PlayerError }

function streamFailure(code: string, status?: number): PlayerError {
  return new PlayerError({
    code,
    severity: 'error',
    scope: {
      kind: 'stream',
      id: 'hls',
    },
    message: `HLS fatal: ${code}`,
    ...(status === undefined
      ? {}
      : { context: { httpStatus: status } }),
  });
}

/** A player whose backend runs `outcome` for every load, keyed by item id. */
function setup(outcome: (id: string) => Promise<void>): { player: MockPlayer; failed: ItemFailed[] } {
  const div = document.createElement('div');

  div.id = 'item-failed-mock';
  document.body.appendChild(div);
  const player = new MockPlayer('item-failed-mock').setup({});

  (player as unknown as { backend: () => unknown }).backend = (): unknown => ({
    load: (url: string): Promise<void> => outcome(url.slice(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))),
  });

  player.queue(ITEMS);

  const failed: ItemFailed[] = [];

  player.on('itemFailed' as never, (data: ItemFailed) =>
    failed.push(data));

  return {
    player,
    failed,
  };
}

describe('itemFailed', () => {
  beforeEach(() => MockPlayer._resetRegistry());
  afterEach(() => { MockPlayer._resetRegistry(); document.body.innerHTML = ''; });

  it('carries the stream error of a fatal HLS failure', async () => {
    const error = streamFailure('manifestIncompatibleCodecsError');
    const { player, failed } = setup(async () => { throw error; });

    await player.ready();
    await expect(player.load(ITEMS[0]!)).rejects.toBe(error);

    expect(failed).toEqual([{ item: expect.objectContaining({ id: 'a' }), error }]);
  });

  it('wraps a media element error of an unsupported codec in a PlayerError', async () => {
    const mediaError = {
      code: 4,
      message: 'MEDIA_ELEMENT_ERROR: Format error',
    };
    const { player, failed } = setup(async () => { throw mediaError; });

    await player.ready();
    await expect(player.load(ITEMS[0]!)).rejects.toBe(mediaError);

    expect(failed).toHaveLength(1);
    expect(failed[0]!.item).toMatchObject({ id: 'a' });
    expect(failed[0]!.error).toBeInstanceOf(PlayerError);
    expect(failed[0]!.error.code).toBe('core:media/load-failed');
    expect(failed[0]!.error.message).toContain('Format error');
    expect(failed[0]!.error.cause).toBe(mediaError);
    expect(failed[0]!.error.context).toMatchObject({ mediaErrorCode: 4 });
  });

  it('fires for an item without a URL', async () => {
    const { player, failed } = setup(async () => {});
    const item = {
      id: 'no-url',
      title: 'No URL',
    } as BasePlaylistItem;

    await player.ready();
    await expect(player.load(item)).rejects.toMatchObject({ code: 'core:media/missing-url' });

    expect(failed).toHaveLength(1);
    expect(failed[0]!.item).toMatchObject({ id: 'no-url' });
    expect(failed[0]!.error.code).toBe('core:media/missing-url');
  });

  it('fires when resolveUrl throws before the backend is reached', async () => {
    const error = streamFailure('resolveFailed');
    const { player, failed } = setup(async () => {});

    (player as unknown as { resolveUrl: () => Promise<never> }).resolveUrl = async () => { throw error; };

    await player.ready();
    await expect(player.load(ITEMS[0]!)).rejects.toBe(error);

    expect(failed).toEqual([{ item: expect.objectContaining({ id: 'a' }), error }]);
  });

  it('fires when resolveItemTrackUrls throws before the backend is reached', async () => {
    const cause = new Error('track url rejected');
    const { player, failed } = setup(async () => {});

    (player as unknown as { resolveItemTrackUrls: () => Promise<never> }).resolveItemTrackUrls = async () => { throw cause; };

    await player.ready();
    await expect(player.load(ITEMS[0]!)).rejects.toBe(cause);

    expect(failed).toHaveLength(1);
    expect(failed[0]!.error.code).toBe('core:media/load-failed');
    expect(failed[0]!.error.cause).toBe(cause);
  });

  it('fires when item(target) starts an item that fails, where the rejection reaches no caller', async () => {
    const error = streamFailure('levelParsingError');
    const { player, failed } = setup(async (id) => {
      if (id === 'b')
        throw error;
    });

    await player.ready();
    player.item(ITEMS[1]!);

    await vi.waitFor(() => expect(failed).toHaveLength(1));
    expect(failed[0]).toEqual({ item: expect.objectContaining({ id: 'b' }), error });
  });

  it('stays silent for a load that succeeds', async () => {
    const { player, failed } = setup(async () => {});

    await player.ready();
    await player.load(ITEMS[0]!);

    expect(failed).toHaveLength(0);
  });

  it('stays silent for a failed load that a newer load replaced', async () => {
    let failFirst: ((err: Error) => void) | undefined;
    const { player, failed } = setup((id) =>
      id === 'a'
        ? new Promise<void>((_resolve, reject) => { failFirst = reject; })
        : Promise.resolve());

    await player.ready();
    const first = player.load(ITEMS[0]!);

    await vi.waitFor(() => expect(failFirst).toBeDefined());
    await player.load(ITEMS[1]!);
    failFirst!(new Error('late failure'));
    await first.catch(() => {});

    expect(failed).toHaveLength(0);
  });

  describe('next()', () => {
    it('fires once for a missing item, beside itemSkipped', async () => {
      const { player, failed } = setup(async (id) => {
        if (id === 'b')
          throw streamFailure('manifestLoadError', 404);
      });
      const skipped: unknown[] = [];

      player.on('itemSkipped' as never, (data: unknown) =>
        skipped.push(data));

      await player.ready();
      await player.load(ITEMS[0]!);
      await player.next();

      expect(skipped).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0]!.item).toMatchObject({ id: 'b' });
      expect(failed[0]!.error.context).toMatchObject({ httpStatus: 404 });
    });

    it('fires once for a server error, beside fatal', async () => {
      const { player, failed } = setup(async (id) => {
        if (id === 'b')
          throw streamFailure('manifestLoadError', 500);
      });
      const fatal: unknown[] = [];

      player.on('fatal' as never, (data: unknown) =>
        fatal.push(data));

      await player.ready();
      await player.load(ITEMS[0]!);
      await expect(player.next()).rejects.toMatchObject({ context: { httpStatus: 500 } });

      expect(fatal).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0]!.item).toMatchObject({ id: 'b' });
    });

    it('stays silent when a token refresh repairs a 401', async () => {
      let attempts = 0;
      const { player, failed } = setup(async (id) => {
        if (id === 'b' && ++attempts === 1)
          throw streamFailure('manifestLoadError', 401);
      });

      player.auth({ refreshOnUnauthenticated: vi.fn().mockResolvedValue(undefined) });

      await player.ready();
      await player.load(ITEMS[0]!);
      await player.next();

      expect(attempts).toBe(2);
      expect(failed).toHaveLength(0);
    });

    it('fires once when the server still answers 401 after the refresh', async () => {
      let attempts = 0;
      const { player, failed } = setup(async (id) => {
        if (id === 'b') {
          attempts += 1;

          throw streamFailure('manifestLoadError', 401);
        }
      });

      player.auth({ refreshOnUnauthenticated: vi.fn().mockResolvedValue(undefined) });

      await player.ready();
      await player.load(ITEMS[0]!);
      await expect(player.next()).rejects.toMatchObject({ context: { httpStatus: 401 } });

      expect(attempts).toBe(2);
      expect(failed).toHaveLength(1);
      expect(failed[0]!.item).toMatchObject({ id: 'b' });
    });
  });
});
