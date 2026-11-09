// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import { playerIifeConfig } from '../../config/vite';

export default playerIifeConfig({
  configUrl: import.meta.url,
  globalName: 'nmMPlayer',
  fileName: 'nomercy-music-player.iife.js',
});
