// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type {
	ActionOptions,
	AriaLiveLevel,
	AudioTrack,
	AudioTrackState,
	AuthConfig,
	BasePlaylistItem,
	BufferState,
	CanPlayResult,
	CastState,
	CastTarget,
	Chapter,
	CurrentAudioTrackSelection,
	CurrentQualitySelection,
	DeviceCapabilities,
	ICueParser,
	IPlatform,
	IPreloadStrategy,
	IStreamFactory,
	ITransitionStrategy,
	IUrlResolver,
	LoadOptions,
	NetworkState,
	PlaybackMetrics,
	PlayerExperimental,
	PlayerPhase,
	PlayState,
	Plugin,
	PluginCtorWithId,
	QualityLevel,
	QualityState,
	RepeatState,
	ResolvedUrl,
	SetupState,
	ShuffleState,
	TimeState,
	Translations,
	UrlCategory,
	VisibilityState,
	VolumeState,
} from '../index';

/** Type-only view of what `playerCoreMethods` composes onto a player; a per-library class merges it with an interface of its own name. */
export interface ComposedPlayerMethods<T extends BasePlaylistItem = BasePlaylistItem> {
	/** Bumped only by `item(target)` navigations — distinguishes a real consumer preselection from the queue's default cursor. */
	_currentEpoch: number | undefined;

	ready: () => Promise<void>;
	dispose: () => Promise<void>;
	setupState: () => SetupState;
	phase: () => PlayerPhase;
	dispatching: () => ReadonlyArray<string>;
	platform: () => IPlatform;

	baseUrl: {
		(): string | undefined;
		(url: string): void;
	};

	audioContext: () => AudioContext | undefined;
	experimental: PlayerExperimental;

	t: {
		(key: string, vars?: Record<string, string>): string;
		(PluginClass: PluginCtorWithId, key: string, vars?: Record<string, string>): string;
	};

	language: {
		(): string;
		(lang: string): Promise<void>;
	};

	addTranslations: (bundle: Translations) => void;
	translation: {
		(lang: string, key: string): string | undefined;
		(lang: string, key: string, value: string): void;
	};

	removeTranslations: (prefix: string, lang?: string) => void;

	registerCueParser: (parser: ICueParser, prepend?: boolean) => void;
	unregisterCueParser: (id: string) => void;
	resolveCueParser: (url: string) => ICueParser | undefined;

	play: (opts?: ActionOptions) => Promise<void>;
	pause: (opts?: ActionOptions) => Promise<void>;
	stop: (opts?: ActionOptions) => Promise<void>;
	togglePlayback: (opts?: ActionOptions) => Promise<void>;
	next: (opts?: LoadOptions) => Promise<void>;
	previous: (opts?: LoadOptions) => Promise<void>;
	rewind: (seconds?: number, opts?: ActionOptions) => Promise<void>;
	forward: (seconds?: number, opts?: ActionOptions) => Promise<void>;
	restart: (opts?: ActionOptions) => Promise<void>;
	registerTitleTokens: (tokens: Record<string, string>) => void;

	time: {
		(): number;
		(seconds: number, opts?: ActionOptions): Promise<void>;
	};

	duration: () => number;
	buffered: () => number;
	bufferedRanges: () => TimeRanges;
	seekable: () => TimeRanges;
	timeData: () => TimeState;
	/** Seek to a position expressed as a percentage (0–100) of total duration. */
	seekByPercentage: (pct: number, opts?: ActionOptions) => void;

	playbackRate: {
		(): number;
		(rate: number): Promise<void>;
	};

	playbackRates: () => number[];

	volume: {
		(): number;
		(level: number): Promise<void>;
	};

	mute: () => Promise<void>;
	unmute: () => Promise<void>;
	toggleMute: () => void;
	volumeUp: (step?: number) => void;
	volumeDown: (step?: number) => void;

	bumpActivity: () => void;
	activityTracking: {
		(): boolean;
		(enabled: boolean): void;
	};

	playState: () => PlayState;
	volumeState: () => VolumeState;
	repeatState: {
		(): RepeatState;
		(state: RepeatState): Promise<void>;
	};

	shuffleState: {
		(): ShuffleState;
		(state: ShuffleState | boolean): Promise<void>;
	};

	queue: {
		(): ReadonlyArray<T>;
		(items: T[], opts?: ActionOptions): void;
	};

	queueAppend: (item: T | T[], opts?: ActionOptions) => void;
	queuePrepend: (item: T | T[], opts?: ActionOptions) => void;
	queueInsert: (item: T | T[], index: number, opts?: ActionOptions) => void;
	queueRemove: (id: string | number, opts?: ActionOptions) => void;
	queueRemoveAt: (index: number, opts?: ActionOptions) => void;
	queueMove: (from: number, to: number, opts?: ActionOptions) => void;
	queueClear: (opts?: ActionOptions) => void;
	queueShuffle: (opts?: ActionOptions) => void;
	queueSort: (compare: (itemA: T, itemB: T) => number, opts?: ActionOptions) => void;
	peekNext: () => T | undefined;
	peekPrevious: () => T | undefined;
	queueLength: () => number;
	queueIndexOf: (id: string | number) => number;

	item: {
		(): T | undefined;
		(target: T | string | number, opts?: LoadOptions): void;
	};

	index: () => number;
	seekToIndex: (position: number, opts?: ActionOptions) => void;

	playItem: (
		target: BasePlaylistItem | string | number | ((item: BasePlaylistItem) => boolean),
		opts?: LoadOptions,
	) => void;

	playNow: (
		items: BasePlaylistItem[],
		start?: BasePlaylistItem | string | number | ((item: BasePlaylistItem) => boolean),
		opts?: LoadOptions,
	) => void;

	backlog: {
		(): ReadonlyArray<T>;
		(items: T[]): void;
	};

	backlogAppend: (item: T | T[]) => void;
	backlogRemove: (id: string | number) => void;
	backlogClear: () => void;

	addPlugin: <P extends Plugin<any, any, any>>(PluginClass: PluginCtorWithId & (new () => P), opts?: P['opts']) => this;
	getPlugin: <P extends object>(PluginClass: PluginCtorWithId & (new () => P)) => P | undefined;
	getPluginById: <P extends object = object>(id: string) => P | undefined;
	removePlugin: <P extends Plugin<any, any, any>>(PluginClass: PluginCtorWithId & (new () => P)) => void;
	removePluginById: (id: string) => void;
	plugins: () => ReadonlyArray<Plugin>;
	enabledPlugins: () => ReadonlyArray<Plugin>;

	registerStream: (factory: IStreamFactory, prepend?: boolean) => this;
	unregisterStream: (id: string) => this;
	streams: () => ReadonlyArray<string>;
	getStreamFactory: (id: string) => IStreamFactory | undefined;

	load: (item: T, opts?: LoadOptions) => Promise<void>;
	loadQueue: (url: string, parser?: (raw: string) => T[]) => Promise<void>;

	bufferState: () => BufferState;
	networkState: () => NetworkState;
	streamState: () => string;
	visibilityState: () => VisibilityState;
	qualityMode: {
		(): QualityState;
		(target: number | 'auto'): void;
	};

	audioTrackMode: {
		(): AudioTrackState;
		(idx: number): void;
	};

	isTv: () => boolean;
	isMobile: () => boolean;
	isDesktop: () => boolean;
	device: () => DeviceCapabilities;

	canPlay: (profile: { contentType: string; width?: number; height?: number; bitrate?: number; framerate?: number }) => Promise<CanPlayResult>;
	bandwidth: () => number;
	bandwidthEstimator: {
		(): (() => number) | undefined;
		(fn: () => number): void;
	};

	audioOutputs: () => Promise<MediaDeviceInfo[]>;
	selectAudioOutput: () => Promise<MediaDeviceInfo | null>;
	audioOutput: {
		(): Promise<string | null>;
		(deviceId: string): Promise<void>;
	};

	audioTracks: () => AudioTrack[];
	audioTrack: {
		(): CurrentAudioTrackSelection | null;
		(idx: number): Promise<void>;
	};

	qualityLevels: {
		(): QualityLevel[];
		(opts: { includeUnsupported: true }): QualityLevel[];
	};

	quality: {
		(): CurrentQualitySelection | 'auto';
		(idx: number | 'auto'): void;
	};

	chapters: () => Chapter[];
	chapter: {
		(): Chapter | null;
		(idx: number): void;
	};

	seekToChapter: (idx: number, opts?: ActionOptions) => void;
	nextChapter: (opts?: ActionOptions) => void;
	previousChapter: (opts?: ActionOptions) => void;

	castState: () => CastState;
	transferTo: (target: CastTarget) => Promise<void>;

	auth: {
		(): Readonly<AuthConfig> | undefined;
		(config: AuthConfig): void;
		(partial: Partial<AuthConfig>): void;
		(clear: null): void;
	};

	refreshAuth: () => Promise<void>;
	resolveUrl: (url: string, category?: UrlCategory) => Promise<ResolvedUrl>;
	urlResolver: {
		(): IUrlResolver | undefined;
		(resolver: IUrlResolver | undefined): void;
	};

	metrics: () => PlaybackMetrics;
	recordMetric: (name: string, value: number) => void;
	now: () => number;
	announce: (text: string, level?: AriaLiveLevel) => void;

	setPreloadStrategy: (strategy: IPreloadStrategy) => void;
	setTransitionStrategy: (strategy: ITransitionStrategy) => void;
	preloadStrategy: () => IPreloadStrategy;
	transitionStrategy: () => ITransitionStrategy;
}
