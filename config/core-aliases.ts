// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type { Alias } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORE_NAME = '@nomercy-entertainment/nomercy-player-core';
const CORE_ROOT = fileURLToPath(new URL('../packages/core/', import.meta.url));

/** Maps every published core subpath to its TypeScript source, longest first so `.` cannot shadow a subpath. */
export function coreSourceAliases(): Alias[] {
  const manifest = JSON.parse(readFileSync(`${CORE_ROOT}package.json`, 'utf8')) as {
    exports: Record<string, string | { import?: string }>;
  };
  const aliases: Alias[] = [];

  for (const [subpath, target] of Object.entries(manifest.exports)) {
    const importTarget = typeof target === 'string'
      ? target
      : target.import;

    if (!importTarget?.startsWith('./dist/') || !importTarget.endsWith('.js')) {
      continue;
    }

    aliases.push({
      find: `${CORE_NAME}${subpath.slice(1)}`,
      replacement: `${CORE_ROOT}${importTarget.replace('./dist/', 'src/').replace(/\.js$/, '.ts')}`,
    });
  }

  return aliases.sort((first, second) => String(second.find).length - String(first.find).length);
}
