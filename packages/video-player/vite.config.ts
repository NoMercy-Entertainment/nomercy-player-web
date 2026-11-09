// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type { Plugin } from 'vite';
import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { playerE2eServerConfig } from '../../config/vite';

/** Vite would compile MPEG-TS media segments as TypeScript; serve those raw instead. */
const serveTsMediaSegments: Plugin = {
  name: 'serve-ts-media-segments',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = request.url ?? '';

      if (!url.startsWith('/e2e/media/') || !url.endsWith('.ts')) {
        next();
        return;
      }

      const filePath = resolve(__dirname, url.slice(1).replace(/\?.*$/, ''));

      if (!existsSync(filePath)) {
        response.statusCode = 404;
        response.end('not found');
        return;
      }

      response.setHeader('Content-Type', 'video/mp2t');
      response.setHeader('Cache-Control', 'no-cache');
      createReadStream(filePath).pipe(response);
    });
  },
};

export default playerE2eServerConfig({
  configUrl: import.meta.url,
  plugins: [serveTsMediaSegments],
});
