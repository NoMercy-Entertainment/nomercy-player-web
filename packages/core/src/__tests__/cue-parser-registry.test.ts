// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Cue parser registry behavior — kit-default registration, resolution order,
 * consumer override.
 *
 * Kit-default parsers (LRC, VTT-subtitle, sprite-VTT) auto-register in
 * `setup()` AS LOW-PRIORITY entries, so consumer-supplied parsers
 * registered via `setup({ cueParsers })` win the resolution.
 */

import type { ICueParser } from '../adapters/cue-parser/ICueParser';
import type { PlayerTestInternals } from '../testing/player-test-internals';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { playerCoreMethods } from '../base-player';
import { composeMixins } from '../core/compose';
import { MockPlayerBase } from './helpers/mock-player-base';

class MockPlayer extends MockPlayerBase {
  declare setup: (config: any) => this;
  declare ready: () => Promise<void>;
  declare dispose: () => void;
  declare registerCueParser: (parser: ICueParser, prepend?: boolean) => void;
  declare unregisterCueParser: (id: string) => void;
}

composeMixins(MockPlayer.prototype, ...playerCoreMethods);

function make(divId: string, opts?: any): MockPlayer {
  const div = document.createElement('div');

  div.id = divId;
  document.body.appendChild(div);

  return new MockPlayer(divId).setup(opts ?? {});
}

describe('Cue parser registry — kit defaults', () => {
  beforeEach(() => MockPlayer._resetRegistry());

  afterEach(() => {
    MockPlayer._resetRegistry();
    document.body.innerHTML = '';
  });

  it('kit auto-registers the three built-in parsers (lrc, vtt, sprite-vtt) on setup', async () => {
    const mockPlayer = make('p1');

    await mockPlayer.ready();
    // Indirect check: registry's `_cueParsers` field is internal but we can
    // resolve URL patterns to confirm a parser claims them.
    const reg = (mockPlayer as unknown as PlayerTestInternals)._cueParsers;

    expect(reg.resolve('lyrics.lrc')?.id).toBe('lrc');
    expect(reg.resolve('subs.vtt')?.id).toBe('vtt');
    expect(reg.resolve('thumbs.sprite.vtt')?.id).toBe('sprite-vtt');
  });

  it('matches by content-type when extension is ambiguous', async () => {
    const mockPlayer = make('p2');

    await mockPlayer.ready();
    const reg = (mockPlayer as unknown as PlayerTestInternals)._cueParsers;

    expect(reg.resolve('https://x/lyrics', 'application/x-lrc')?.id).toBe('lrc');
    expect(reg.resolve('https://x/subs', 'text/vtt')?.id).toBe('vtt');
  });

  it('consumer-supplied parser via setup() wins over a built-in for the same URL', async () => {
    const customLrc: ICueParser = {
      id: 'custom-lrc',
      canParse: (url: string) => /\.lrc(?:\?|$)/i.test(url),
      parse: () => ({
        get: () => [],
        at: () => undefined,
        after: () => undefined,
        before: () => undefined,
      } as any),
    };
    const mockPlayer = make('p3', { cueParsers: [customLrc] });

    await mockPlayer.ready();
    const reg = (mockPlayer as unknown as PlayerTestInternals)._cueParsers;

    expect(reg.resolve('lyrics.lrc')?.id).toBe('custom-lrc');
  });

  it('a parser registered before setup() wins over a built-in for the same URL', async () => {
    const div = document.createElement('div');

    div.id = 'p-early';
    document.body.appendChild(div);
    const earlyVtt: ICueParser = {
      id: 'early-vtt',
      canParse: (url: string) => /\.vtt(?:\?|$)/i.test(url),
      parse: () => ({
        get: () => [],
        at: () => undefined,
        after: () => undefined,
        before: () => undefined,
      } as any),
    };
    const mockPlayer = new MockPlayer('p-early');

    mockPlayer.registerCueParser(earlyVtt);
    mockPlayer.setup({});
    await mockPlayer.ready();
    const reg = (mockPlayer as unknown as PlayerTestInternals)._cueParsers;

    expect(reg.resolve('subs.vtt')?.id).toBe('early-vtt');
    expect(reg.resolve('lyrics.lrc')?.id).toBe('lrc');
  });

  it('unrecognized URL returns undefined (caller decides whether absence is an error)', async () => {
    const mockPlayer = make('p4');

    await mockPlayer.ready();
    const reg = (mockPlayer as unknown as PlayerTestInternals)._cueParsers;

    expect(reg.resolve('https://x/something.xyz')).toBeUndefined();
  });

  it('runtime registerCueParser appends to back so latest wins', async () => {
    const mockPlayer = make('p5');

    await mockPlayer.ready();
    const customVtt: ICueParser = {
      id: 'late-vtt',
      canParse: (url: string) => /\.vtt(?:\?|$)/i.test(url),
      parse: () => ({
        get: () => [],
        at: () => undefined,
        after: () => undefined,
        before: () => undefined,
      } as any),
    };

    mockPlayer.registerCueParser(customVtt);
    const reg = (mockPlayer as unknown as PlayerTestInternals)._cueParsers;

    expect(reg.resolve('subs.vtt')?.id).toBe('late-vtt');
  });

  it('unregisterCueParser removes by id', async () => {
    const mockPlayer = make('p6');

    await mockPlayer.ready();
    const reg = (mockPlayer as unknown as PlayerTestInternals)._cueParsers;

    expect(reg.resolve('lyrics.lrc')?.id).toBe('lrc');
    mockPlayer.unregisterCueParser('lrc');
    expect(reg.resolve('lyrics.lrc')).toBeUndefined();
  });
});
