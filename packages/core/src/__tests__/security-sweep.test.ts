// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

// One test per code-scanning finding: each proves the input the scanner
// named can no longer do harm, and that normal input still behaves.

import { afterEach, describe, expect, it } from 'vitest';
import { parseVttSprite, parseVttSubtitles } from '../adapters/cue-parser/vtt';
import { DefaultTranslator } from '../adapters/translator/translator';
import { StubPlayer } from '../testing/stub-player';
import { nomercyTranslationsPlugin } from '../vite-plugin';

const SLOW_MS = 250;

function timed(fn: () => void): number {
  const start = performance.now();

  fn();

  return performance.now() - start;
}

describe('vTT subtitle markup', () => {
  it('keeps only <i> <b> <u>, even when tags are nested to rebuild one', () => {
    const vtt = 'WEBVTT\n\n00:00.000 --> 00:01.000\n<script>x</script><i>hi</i> <scr<script>ipt>y\n';
    const cue = parseVttSubtitles(vtt).cues[0]!;

    expect(cue.payload.markup).not.toMatch(/<(?!\/?[ibu]>)/i);
    expect(cue.payload.markup).toContain('<i>hi</i>');
  });
});

describe('vTT sprite URL join', () => {
  it('joins a relative sprite path to the base folder', () => {
    const vtt = 'WEBVTT\n\n00:00.000 --> 00:01.000\nsprite.webp#xywh=0,0,10,10\n';

    expect(parseVttSprite(vtt, 'https://x.test/a/b/thumbs.vtt').cues[0]!.payload.url)
      .toBe('https://x.test/a/b/sprite.webp');

    expect(parseVttSprite(vtt, 'thumbs.vtt').cues[0]!.payload.url).toBe('sprite.webp');
  });

  it('stays linear on a base with a long run of dots', () => {
    const vtt = 'WEBVTT\n\n00:00.000 --> 00:01.000\nsprite.webp#xywh=0,0,10,10\n';
    const base = `${'.'.repeat(60_000)}/x/`;

    expect(timed(() => parseVttSprite(vtt, base))).toBeLessThan(SLOW_MS);
  });
});

describe('vite translations plugin id cleanup', () => {
  it('stays linear on an id with a long run of #', () => {
    const plugin = nomercyTranslationsPlugin();
    const id = `${'#'.repeat(30_000)}\n!`;

    expect(timed(() => plugin.transform('translationsFromGlob(', id))).toBeLessThan(SLOW_MS);
  });
});

describe('translation keys cannot reach Object.prototype', () => {
  afterEach(() => {
    delete (Object.prototype as Record<string, unknown>)['polluted'];
  });

  it('defaultTranslator ignores __proto__ / constructor / prototype', () => {
    const translator = new DefaultTranslator();

    translator.translation('__proto__', 'polluted', 'yes');
    translator.translation('constructor', 'polluted', 'yes');
    translator.translation('en', '__proto__', 'yes');

    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    translator.translation('en', 'hello', 'Hello');
    expect(translator.translation('en', 'hello')).toBe('Hello');
  });

  it('stubPlayer ignores __proto__ / constructor / prototype', () => {
    const player = new StubPlayer();

    player.translation('__proto__', 'polluted', 'yes');
    player.translation('constructor', 'polluted', 'yes');

    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    player.translation('en', 'hello', 'Hello');
    expect(player.translation('en', 'hello')).toBe('Hello');
  });
});
