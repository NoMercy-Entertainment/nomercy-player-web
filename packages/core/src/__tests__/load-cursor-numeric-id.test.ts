// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Regression: load() must move the queue cursor for NUMERIC item ids.
 *
 * MediaList.setCurrent treats an integer as an INDEX; passing a numeric id
 * (every NoMercy API id) resolved out of range and silently left the cursor
 * on the previous item — next()/auto-advance loaded the right media but the
 * player state never advanced.
 */

import type { BasePlaylistItem } from '../types';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  composeMixins,
  playerCoreMethods,
} from '../index';
import { MockPlayerBase } from './helpers/mock-player-base';

class MockPlayer extends MockPlayerBase {
  declare setup: (config: any) => this;
  declare ready: () => Promise<void>;
  declare load: (item: BasePlaylistItem, opts?: any) => Promise<void>;
  declare next: (opts?: any) => Promise<void>;
  declare index: () => number;
  declare item: { (): BasePlaylistItem | undefined; (target: unknown, opts?: any): void };
  declare queue: { (): ReadonlyArray<BasePlaylistItem>; (items: BasePlaylistItem[]): void };
}

composeMixins(MockPlayer.prototype, ...playerCoreMethods);

function makePlayer(divId: string): MockPlayer {
  const div = document.createElement('div');

  div.id = divId;
  document.body.appendChild(div);

  return new MockPlayer(divId);
}

function stubBackend(player: MockPlayer): void {
  (player as unknown as { _resolveBackend: () => unknown })._resolveBackend = () => ({
    load: async () => {},
    play: async () => {},
    pause: () => {},
  });
}

describe('load() cursor move with numeric ids', () => {
  beforeEach(() => {
    MockPlayer._resetRegistry();
    document.body.innerHTML = '';
  });

  it('moves the cursor to the loaded item when ids are numbers', async () => {
    const player = makePlayer('cursor-num').setup({});

    await player.ready();

    player.queue([
      { id: 4237712, url: 'http://example.test/e1.mp4' },
      { id: 4680388, url: 'http://example.test/e2.mp4' },
    ]);

    stubBackend(player);

    await player.load(player.queue()[1]!);

    expect(player.index()).toBe(1);
    expect(player.item()?.id).toBe(4680388);
  });

  it('next() advances state end-to-end with numeric ids', async () => {
    const player = makePlayer('cursor-next').setup({});

    await player.ready();

    player.queue([
      { id: 101, url: 'http://example.test/a.mp4' },
      { id: 202, url: 'http://example.test/b.mp4' },
    ]);

    stubBackend(player);

    await player.load(player.queue()[0]!);
    expect(player.index()).toBe(0);

    await player.next();

    expect(player.index()).toBe(1);
    expect(player.item()?.id).toBe(202);
  });
});
