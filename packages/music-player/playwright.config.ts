// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import process from 'node:process';
import { playerPlaywrightConfig } from '../../config/playwright';

export default playerPlaywrightConfig({
  port: 5504,
  // Real-audio specs contend for the AudioContext and device; run them serially.
  workers: 1,
  retries: process.env.CI ? 2 : 1,
});
