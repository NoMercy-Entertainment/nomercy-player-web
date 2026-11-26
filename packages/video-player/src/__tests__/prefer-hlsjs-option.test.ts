// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * `preferHlsJs` (default off): an element that reports native HLS ('probably')
 * still plays through hls.js when MediaSource exists, so audio tracks and
 * quality levels are listed. Unset, the element's own HLS is used as before.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Html5VideoBackend } from '../adapters/video-backend/html5';
import { NMVideoPlayer } from '../index';

const hlsState = vi.hoisted(() => ({ constructed: 0, supported: true }));

vi.mock('hls.js', () => {
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

    constructor() {
      hlsState.constructed++;
    }

    static isSupported = (): boolean => hlsState.supported;
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

    on(): void { /* stub */ }
    attachMedia(): void { /* stub */ }
    loadSource(): void { /* stub */ }
    detachMedia(): void { /* stub */ }
    destroy(): void { /* stub */ }
    startLoad(): void { /* stub */ }
    stopLoad(): void { /* stub */ }
    recoverMediaError(): void { /* stub */ }
  }

  return { default: FakeHls };
});

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

describe('preferHlsJs option', () => {
  let container: HTMLDivElement;
  let backend: Html5VideoBackend;

  beforeEach(() => {
    hlsState.constructed = 0;
    hlsState.supported = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    backend = new Html5VideoBackend(container);
    const el = container.querySelector('video') as HTMLVideoElement;

    el.canPlayType = () => 'probably';
    vi.stubGlobal('MediaSource', class {});
  });

  afterEach(() => {
    try { backend.dispose(); } catch { /* defensive */ }

    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps the element\'s native HLS when the option is not set', async () => {
    void backend.load('https://example.invalid/test.m3u8').catch(() => undefined);
    await flush();

    expect(hlsState.constructed).toBe(0);
  });

  it('uses hls.js on a native-HLS element when the option is set and MediaSource exists', async () => {
    backend.setPreferHlsJs(true);
    void backend.load('https://example.invalid/test.m3u8').catch(() => undefined);
    await flush();

    expect(hlsState.constructed).toBe(1);
  });

  it('keeps native HLS when the option is set but MediaSource is missing', async () => {
    vi.stubGlobal('MediaSource', undefined);
    backend.setPreferHlsJs(true);
    void backend.load('https://example.invalid/test.m3u8').catch(() => undefined);
    await flush();

    expect(hlsState.constructed).toBe(0);
  });

  it('keeps native HLS when the option is set but hls.js is unsupported', async () => {
    hlsState.supported = false;
    backend.setPreferHlsJs(true);
    void backend.load('https://example.invalid/test.m3u8').catch(() => undefined);
    await flush();

    expect(hlsState.constructed).toBe(0);
  });
});

describe('NMVideoPlayer preferHlsJs option', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="prefer-hlsjs-test"></div>';
    (NMVideoPlayer as unknown as { _resetRegistry: () => void })._resetRegistry();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    (NMVideoPlayer as unknown as { _resetRegistry: () => void })._resetRegistry();
    vi.restoreAllMocks();
  });

  it('passes the option to the backend', () => {
    const spy = vi.spyOn(Html5VideoBackend.prototype, 'setPreferHlsJs');

    new NMVideoPlayer('prefer-hlsjs-test').setup({ preferHlsJs: true }).backend();

    expect(spy).toHaveBeenCalledWith(true);
  });

  it('passes false when none is set', () => {
    const spy = vi.spyOn(Html5VideoBackend.prototype, 'setPreferHlsJs');

    new NMVideoPlayer('prefer-hlsjs-test').setup({}).backend();

    expect(spy).toHaveBeenCalledWith(false);
  });
});
