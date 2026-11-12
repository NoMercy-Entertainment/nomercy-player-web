// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/** `audioTrack` fires when the backend has switched the audio, not when the pick is made (as on KMP, core-kmp a30c06f). */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Html5VideoBackend } from '../adapters/video-backend/html5';
import { NMVideoPlayer } from '../index';

describe('NMVideoPlayer audioTrack after the backend applies the switch', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="audio-applied-test"></div>';
    (NMVideoPlayer as unknown as { _resetRegistry: () => void })._resetRegistry();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    (NMVideoPlayer as unknown as { _resetRegistry: () => void })._resetRegistry();
  });

  it('fires audioTrack only when the backend reports the switch', async () => {
    const backend = new Html5VideoBackend(document.createElement('div'));
    const player = new NMVideoPlayer('audio-applied-test').setup({ backendFactory: () => backend });

    await player.backend('html5');

    backend.audioTracks = () => [
      {
        id: 'audio-0',
        language: 'en',
        label: 'English',
      },
      {
        id: 'audio-1',
        language: 'fr',
        label: 'French',
      },
    ];

    backend.setAudioTrack = () => { /* applies later */ };

    const seen: Array<number | null> = [];

    player.on('audioTrack', (data) =>
      seen.push(data.id));

    const pending = player.audioTrack(1);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen).toEqual([]);

    backend.emit('audio-track-switched', { index: 1 });
    await pending;

    expect(seen).toEqual([1]);
  });
});
