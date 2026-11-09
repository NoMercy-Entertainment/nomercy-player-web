// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type { Translations } from '../types';

export interface V1TranslationEntry {
	key: string;
	value: string;
}

/** The members the v1 translation shims read and replace on a player. */
export interface V1TranslationShimTarget {
	language: () => string;
	t: (key: string, vars?: Record<string, string>) => string;
	translation: (lang: string, key: string, value: string) => unknown;
	localize: (key: string, vars?: Record<string, string>) => string;
	addTranslation: (key: string, value: string) => void;
	addTranslations: (bundle: Translations) => void;
	setTitle: (title: string) => void;
}

export function v1DeprecationMessage(method: string): string {
	return `@deprecated player.${method}() is a v1 compatibility shim — migrate to the v2 API before it is removed.`;
}

export function isV1TranslationEntryList(value: Translations | ReadonlyArray<V1TranslationEntry>): value is ReadonlyArray<V1TranslationEntry> {
	return Array.isArray(value);
}

export function installV1TranslationShims(player: V1TranslationShimTarget, warn: (method: string) => void): void {
	const originalAddTranslations = player.addTranslations.bind(player);

	player.localize = (key: string, vars?: Record<string, string>): string => {
		warn('localize');
		return player.t(key, vars);
	};

	player.addTranslation = (key: string, value: string): void => {
		warn('addTranslation');
		player.translation(player.language(), key, value);
	};

	function addTranslations(bundle: Translations): void;
	function addTranslations(entries: ReadonlyArray<V1TranslationEntry>): void;
	function addTranslations(bundleOrEntries: Translations | ReadonlyArray<V1TranslationEntry>): void {
		warn('addTranslations');
		if (isV1TranslationEntryList(bundleOrEntries)) {
			const lang = player.language();
			for (const entry of bundleOrEntries) {
				player.translation(lang, entry.key, entry.value);
			}
			return;
		}
		originalAddTranslations(bundleOrEntries);
	}
	player.addTranslations = addTranslations;

	player.setTitle = (title: string): void => {
		warn('setTitle');
		if (typeof document !== 'undefined') {
			document.title = title;
		}
	};
}
