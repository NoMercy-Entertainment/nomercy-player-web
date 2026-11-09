// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type { BaseEventMap } from '../../types';
import {
	EventEmitter,
	initPlayerCoreState,
	resolvePlayerConstructor,
} from '../../index';

const registries = new WeakMap<object, Map<string, MockPlayerBase>>();

function registryOf(ctor: object): Map<string, MockPlayerBase> {
	let registry = registries.get(ctor);
	if (!registry) {
		registry = new Map();
		registries.set(ctor, registry);
	}
	return registry;
}

/**
 * The player shell the mixin tests share: id, container and a registry per
 * subclass. A test extends it, declares the mixin methods it checks, then calls
 * `composeMixins(MockPlayer.prototype, ...)`.
 */
export class MockPlayerBase extends EventEmitter<BaseEventMap> {
	readonly playerId: string = '';
	container: HTMLElement = {} as HTMLElement;

	get id(): string {
		return this.playerId;
	}

	declare options: any;

	constructor(id?: string | number) {
		super();
		initPlayerCoreState(this, { className: 'MockPlayer' });
		const instances = registryOf(new.target);
		const resolved = resolvePlayerConstructor(id, instances, 'MockPlayer');
		if (resolved.kind === 'existing') {
			return resolved.instance as unknown as this;
		}
		(this as { playerId: string }).playerId = resolved.id;
		this.container = resolved.div;
		instances.set(resolved.id, this);
	}

	static _resetRegistry(): void {
		registryOf(this).clear();
	}
}
