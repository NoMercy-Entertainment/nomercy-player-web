// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import { vi } from 'vitest';

/** Web Audio mocks whose nodes record `connect` targets, for tests that assert the graph shape. */

export class MockDestinationNode {
  label = 'destination';
}

export class MockGainNode {
  _connections: unknown[] = [];
  gain = { value: 1 };

  connect(target: unknown): void {
    this._connections.push(target);
  }

  disconnect(): void {
    this._connections = [];
  }
}

export class MockAnalyserNode {
  fftSize = 2048;
  _connections: unknown[] = [];

  connect(target: unknown): void {
    this._connections.push(target);
  }

  disconnect(): void {
    this._connections = [];
  }
}

export class MockSourceNode {
  _connections: unknown[] = [];

  connect(target: unknown): void {
    this._connections.push(target);
  }

  disconnect(): void {
    this._connections = [];
  }
}

export class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = new MockDestinationNode() as unknown as AudioDestinationNode;
  sampleRate = 44100;

  createGain = vi.fn((): MockGainNode => new MockGainNode());
  createAnalyser = vi.fn((): MockAnalyserNode => new MockAnalyserNode());
  createMediaElementSource = vi.fn((): MockSourceNode => new MockSourceNode());
  resume = vi.fn(() => Promise.resolve());
}
