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
  globalName: 'nmplayer',
  fileName: 'nomercy-video-player.iife.js',
});
