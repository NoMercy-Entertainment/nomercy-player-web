// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type { PluginOption } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { nomercyTranslationsPlugin } from '../packages/core/src/vite-plugin';

function packagePath(configUrl: string, relative: string): string {
  return fileURLToPath(new URL(relative, new URL('./', configUrl)));
}

export interface PlayerIifeOptions {
  /** The caller's `import.meta.url`. */
  configUrl: string;
  /** The global the bundle assigns. */
  globalName: string;
  /** Output file name inside `dist`. */
  fileName: string;
}

/** The CDN bundle. The npm build itself is plain `tsc`; see each package's `build` script. */
export function playerIifeConfig(options: PlayerIifeOptions) {
  return defineConfig({
    base: '/',
    plugins: [nomercyTranslationsPlugin()],
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: false,
      minify: 'oxc',
      target: 'es2022',
      rollupOptions: {
        // CDN consumers add hls.js with their own script tag; core travels inside the bundle.
        external: ['hls.js'],
        output: { globals: { 'hls.js': 'Hls' } },
      },
      lib: {
        entry: packagePath(options.configUrl, 'src/iife-entry.ts'),
        name: options.globalName,
        formats: ['iife'],
        fileName: () => options.fileName,
      },
    },
    clearScreen: true,
  });
}

export interface PlayerE2eServerOptions {
  /** The caller's `import.meta.url`. */
  configUrl: string;
  plugins?: PluginOption[];
}

/** The dev server Playwright drives; only the e2e suite uses it. */
export function playerE2eServerConfig(options: PlayerE2eServerOptions) {
  const { name } = JSON.parse(readFileSync(packagePath(options.configUrl, 'package.json'), 'utf8')) as { name: string };

  return defineConfig({
    base: '/',
    publicDir: packagePath(options.configUrl, 'public'),
    plugins: [nomercyTranslationsPlugin(), ...(options.plugins ?? [])],
    resolve: {
      alias: [{
        find: new RegExp(`^${name}$`),
        replacement: packagePath(options.configUrl, 'src/index.ts'),
      }],
    },
    // Scan the e2e fixtures too, or the dev server reloads every page mid-run.
    optimizeDeps: { entries: ['src/index.ts', 'e2e/*.html'] },
    clearScreen: true,
  });
}
