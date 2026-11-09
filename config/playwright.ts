// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import process from 'node:process';
import { defineConfig } from '@playwright/test';

export interface PlayerPlaywrightOptions {
	/** Dev server port. Each package has its own so both suites can run at once. */
	port: number;
	workers?: number;
	retries?: number;
}

export function playerPlaywrightConfig(options: PlayerPlaywrightOptions) {
	return defineConfig({
		testDir: 'e2e',
		timeout: 30_000,
		workers: options.workers ?? (process.env.CI ? 2 : undefined),
		retries: options.retries ?? (process.env.CI ? 1 : 0),
		reporter: [['html', { outputFolder: 'reports/playwright' }]],
		use: {
			baseURL: `http://localhost:${options.port}`,
			headless: true,
		},
		webServer: {
			command: `yarn run -T vite --port ${options.port} --force`,
			port: options.port,
			reuseExistingServer: !process.env.CI,
		},
	});
}
