// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * hls.js stub for tests that build a player without exercising HLS itself.
 * `playerVitestConfig({ hlsMock: true })` aliases every `hls.js` import to it.
 * A test that needs HLS internals uses an inline `vi.mock('hls.js', ...)`.
 */

type HlsListener = (event: string, data: unknown) => void;

class FakeHls {
  levels: unknown[] = [];
  audioTracks: unknown[] = [];
  subtitleTracks: unknown[] = [];
  audioTrack = 0;
  subtitleTrack = -1;
  currentLevel = -1;
  loadLevel = -1;
  nextLevel = -1;
  autoLevelCapping = -1;
  bandwidthEstimate = 0;

  private _listeners = new Map<string, HlsListener[]>();

  static isSupported = (): boolean => true;

  static Events: Record<string, string> = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
    FRAG_LOADED: 'hlsFragLoaded',
    LEVEL_SWITCHED: 'hlsLevelSwitched',
    FRAG_CHANGED: 'hlsFragChanged',
  };

  static ErrorTypes: Record<string, string> = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
  };

  on(event: string, fn: HlsListener): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }

    this._listeners.get(event)!.push(fn);
  }

  attachMedia(_el: HTMLVideoElement): void { /* stub */ }
  loadSource(_url: string): void { /* stub */ }
  detachMedia(): void { /* stub */ }
  destroy(): void { /* stub */ }
  startLoad(): void { /* stub */ }
  stopLoad(): void { /* stub */ }
  recoverMediaError(): void { /* stub */ }
}

export default FakeHls;
