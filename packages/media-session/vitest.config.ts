// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import { playerVitestConfig } from '../../config/vitest';

export default playerVitestConfig({
	configUrl: import.meta.url,
	environment: 'node',
	include: ['src/**/*.test.ts'],
});
