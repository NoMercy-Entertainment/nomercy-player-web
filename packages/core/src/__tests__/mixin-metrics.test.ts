// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Slice 03 — consequence-pinning tests for `metricsMethods`.
 *
 * Pinned consequences:
 *  10. `metrics()` returns an object with a `sessionDurationMs` field of type number.
 *  11. `recordMetric('ttfb', 99)` causes the next `metrics()` call to return an
 *      object where `ttfb === 99`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	composeMixins,
	playerCoreMethods,
} from '../index';
import { MockPlayerBase } from './helpers/mock-player-base';

class MockPlayer extends MockPlayerBase {
	declare setup: (config: any) => this;
	declare ready: () => Promise<void>;
	declare dispose: () => void;
	declare metrics: () => Record<string, number | null>;
	declare recordMetric: (name: string, value: number) => void;
}

composeMixins(MockPlayer.prototype, ...playerCoreMethods);

function makePlayer(divId: string): MockPlayer {
	const div = document.createElement('div');
	div.id = divId;
	document.body.appendChild(div);
	return new MockPlayer(divId);
}

describe('metricsMethods (slice 03)', () => {
	beforeEach(() => {
		MockPlayer._resetRegistry();
	});

	afterEach(() => {
		MockPlayer._resetRegistry();
		document.body.innerHTML = '';
	});

	it('metrics() returns an object containing sessionDurationMs as a number', () => {
		const player = makePlayer('metrics-1');

		const snapshot = player.metrics();

		expect(snapshot).toBeDefined();
		expect(typeof snapshot['sessionDurationMs']).toBe('number');
	});

	it('recordMetric("ttfb", 99) causes metrics().ttfb to equal 99', () => {
		const player = makePlayer('metrics-2');

		player.recordMetric('ttfb', 99);
		const snapshot = player.metrics();

		expect(snapshot['ttfb']).toBe(99);
	});
});
