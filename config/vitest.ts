// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type { Alias } from 'vite';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { nomercyTranslationsPlugin } from '../packages/core/src/vite-plugin';
import { coreSourceAliases } from './core-aliases';

export interface PlayerVitestOptions {
  /** The caller's `import.meta.url`. */
  configUrl: string;
  /** Coverage floors; each package sets its own. */
  thresholds?: {
    lines: number;
    functions: number;
  };
  /** Test against core's source instead of its build, so a change across packages is tested together. */
  coreSource?: boolean;
  /** Replace hls.js with the package's stub. Packages that never load the real hls.js set this. */
  hlsMock?: boolean;
  environment?: 'happy-dom' | 'node';
  include?: string[];
}

export function playerVitestConfig(options: PlayerVitestOptions) {
  const packageUrl = new URL('./', options.configUrl);
  const path = (relative: string) => fileURLToPath(new URL(relative, packageUrl));
  const { name } = JSON.parse(readFileSync(path('package.json'), 'utf8')) as { name: string };

  const alias: Alias[] = [
    {
      find: new RegExp(`^${name}$`),
      replacement: path('src/index.ts'),
    },
    ...(options.hlsMock
      ? [{
          find: 'hls.js',
          replacement: fileURLToPath(new URL('../packages/test-support/src/hls.js.ts', import.meta.url)),
        }]
      : []),
    ...(options.coreSource
      ? coreSourceAliases()
      : []),
  ];

  return defineConfig({
    plugins: [nomercyTranslationsPlugin()],
    resolve: { alias },
    test: {
      globals: true,
      testTimeout: process.env.CI
        ? 20_000
        : 5_000,
      environment: options.environment ?? 'happy-dom',
      include: options.include ?? ['src/**/__tests__/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/__tests__/**', 'src/**/*.d.ts'],
        ...(options.thresholds
          ? { thresholds: options.thresholds }
          : {}),
      },
    },
  });
}
