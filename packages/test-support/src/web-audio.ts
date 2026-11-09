// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import { vi } from 'vitest';

/** Web Audio mocks shared by the player tests. Each class is the exact shape the tests built locally. */

export interface MockGainParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  setValueCurveAtTime: ReturnType<typeof vi.fn>;
  setTargetAtTime: ReturnType<typeof vi.fn>;
  cancelScheduledValues: ReturnType<typeof vi.fn>;
}

/** An AudioParam whose scheduling calls move the value at once, so a test reads the end level. */
export function makeMockGain(initial = 1): MockGainParam {
  let level = initial;

  return {
    get value(): number { return level; },
    set value(next: number) { level = next; },
    setValueAtTime: vi.fn((target: number) => { level = target; }),
    linearRampToValueAtTime: vi.fn((target: number) => { level = target; }),
    setValueCurveAtTime: vi.fn((curve: Float32Array) => { level = curve[curve.length - 1]!; }),
    setTargetAtTime: vi.fn((target: number) => { level = target; }),
    cancelScheduledValues: vi.fn(),
  };
}

export class MockGainNode {
  gain = makeMockGain(1);
  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockAnalyserNode {
  fftSize = 2048;
  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockAudioContext {
  static lastInstance: MockAudioContext | null = null;

  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {} as AudioDestinationNode;

  createGain = vi.fn(() => new MockGainNode());
  createAnalyser = vi.fn(() => ({
    fftSize: 2048,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  createMediaElementSource = vi.fn(() => new MockSourceNode());
  resume = vi.fn(() => Promise.resolve());

  constructor() {
    MockAudioContext.lastInstance = this;
  }
}
