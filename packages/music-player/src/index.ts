// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import type {
  ActionOptions,
  BasePlaylistItem,
  BeforeDispatchOutcome,
  ComposedPlayerMethods,
  IPlayer,
  TimeState as KitTimeState,
  PlayerPhase,
} from '@nomercy-entertainment/nomercy-player-core';
import type { BackendEventPayload, IAudioBackend } from './adapters/audio-backend/IAudioBackend';
import type {
  AudioBackendKind,
  CrossfadeOptions,
  IMusicPlayer,
  MusicEventMap,
  MusicPlayerConfig,
  MusicPlaylistItem,
} from './types';
import {
  bridgeBackendPlayState,
  claimPlayerInstance,
  composeMixins,
  CrossfadeTransitionStrategy,
  EventEmitter,
  MediaFormatError,
  playerCoreMethods,
  setPlayerAudioContext,
  StateError,
} from '@nomercy-entertainment/nomercy-player-core';
import { AudioElementBackend } from './adapters/audio-backend/html5-audio';
import { WebAudioBackend } from './adapters/audio-backend/web-audio';
import { MusicPreloadStrategy } from './player/preload';
import { PlayState } from './types';

export { MusicPreloadStrategy } from './player/preload';

export { V1MusicCompatPlugin } from './plugins/v1-compat';

export type {
  AudioBackendFactory,
  AudioBackendKind,
  CrossfadeCurve,
  CrossfadeOptions,
  IMusicPlayer,
  MusicEventMap,
  MusicPlayerConfig,
  MusicPlaylistItem,
  TimeState,
} from './types';

export {
  AudioTrackState,
  PlayState,
  QualityState,
  RepeatState,
  ShuffleState,
  VolumeState,
} from './types';

export { NotImplementedError } from '@nomercy-entertainment/nomercy-player-core';

const _instances = new Map<string, NMMusicPlayer<MusicPlaylistItem>>();

/**
 * Narrow view of the composed kit internals accessed by `_wireBackend`.
 * These fields are written onto the instance by playerCoreMethods via
 * composeMixins — they exist at runtime but are not declared on the class
 * (they live on the Internals interface in the kit). The cast is isolated
 * inside `_wireBackend`; all mutations go through the declared helpers or
 * direct assignment on the typed surface.
 *
 * `_dispatchBefore` is the shared cancellable-`before*`-event primitive
 * (`core/mixins/player-state.ts`) — used by `crossfadeTo()` to dispatch
 * `beforeCrossfade` the same way every kit-composed `before*` hook does.
 */
interface WireInternals {
  _phase: PlayerPhase;
  _playState: PlayState;
  _transitionPhase: (next: PlayerPhase) => void;
  _checkItemEndingSoon: (currentTime: number, duration: number) => void;
  _timeStateAt: (position: number) => KitTimeState;
  _mediaIsStale: (() => boolean) | undefined;
  _dispatchBefore: <TData>(beforeEvent: string, data: TData) => Promise<BeforeDispatchOutcome<TData>>;
}

export interface NMMusicPlayer<T extends MusicPlaylistItem = MusicPlaylistItem> extends ComposedPlayerMethods<T> {}

/**
 * Headless music player. Plugin-driven, event-driven, no UI in core.
 *
 * The shared player core (lifecycle, transport, queue, state, volume, time,
 * plugins, i18n, cue parsers, baseUrl, audioContext, experimental override
 * surface) is composed onto the prototype from `playerCoreMethods` exported by
 * `@nomercy-entertainment/nomercy-player-core` — the LOGIC lives there, not
 * here. NMMusicPlayer adds only:
 *
 *  - The per-library registry (own `_instances` Map)
 *  - The three-form factory constructor
 *  - Library-typed method declarations (so consumers see `PlayState`, not
 *    the kit's internal string token — the runtime impl comes from the mixin)
 *  - Music-specific stubs (backends, crossfade, audio output devices, etc.)
 */
// eslint-disable-next-line ts/no-unsafe-declaration-merging -- composeMixins sets these members at runtime
export class NMMusicPlayer<T extends MusicPlaylistItem = MusicPlaylistItem>
  extends EventEmitter<MusicEventMap<T>>
  implements IPlayer<MusicEventMap<T>>, IMusicPlayer<T> {
  readonly playerId: string = '';
  container!: HTMLElement;

  get id(): string {
    return this.playerId;
  }

  /**
   * Phantom brand — never assigned at runtime. Declared explicitly here so
   * `PlayerEventMap<NMMusicPlayer<T>>` resolves to `MusicEventMap` without
   * TypeScript having to walk the `EventEmitter` inheritance chain (which
   * stalls in conditional-type inference for complex class hierarchies).
   */
  declare readonly __eventMap__: MusicEventMap<T>;

  declare options: MusicPlayerConfig<T>;

  // The methods composed from `playerCoreMethods` are typed by
  // `ComposedPlayerMethods`; only the music-typed entry point is declared here.
  declare setup: (config: MusicPlayerConfig<T>) => this;

  constructor(id?: string | number) {
    super();
    // The registry stores the base item type; a subclass is assignment-compatible.
    const existing = claimPlayerInstance(this as unknown as NMMusicPlayer<MusicPlaylistItem>, id, _instances, 'NMMusicPlayer');

    if (existing) {
      return existing as unknown as this; // polymorphic return: resolved instance IS this subclass
    }

    this._wireAutomaticCrossfade();
  }

  /** Test-only: clear the registry. Not part of the public API. */
  static _resetRegistry(): void {
    _instances.clear();
  }

  // ── Backend ──
  // The active audio backend. `_isTransitioning` flips true during a crossfade
  // so that simultaneous calls are rejected. The crossfade dual-buffer logic
  // lives inside each backend implementation (loadSecondary / crossfade / etc.).
  private _backend?: IAudioBackend;
  private _isTransitioning = false;
  private _automaticCrossfadeWired = false;

  private _createBackend(kind: AudioBackendKind, opts: MusicPlayerConfig<T> | undefined): IAudioBackend {
    const factory = opts?.backendFactory;

    if (factory)
      return factory(kind, opts as MusicPlayerConfig<BasePlaylistItem>);

    if (kind === 'webaudio')
      return new WebAudioBackend(this.container);

    return new AudioElementBackend(this.container);
  }

  backend(): IAudioBackend;
  backend(kind: AudioBackendKind): Promise<void>;
  backend(kind?: AudioBackendKind): IAudioBackend | Promise<void> {
    if (kind === undefined) {
      if (!this._backend) {
        const opts = this.options as MusicPlayerConfig<T> | undefined;
        const configKind = opts?.backend ?? 'audio-element';

        this._backend = this._createBackend(configKind, opts);
        this._wireBackend(this._backend);
      }

      return this._backend;
    }

    return Promise.resolve().then(() => {
      if (this._backend) {
        this._backend.dispose();
        this._backend = undefined;
      }

      const opts = this.options as MusicPlayerConfig<T> | undefined;

      this._backend = this._createBackend(kind, opts);
      this._wireBackend(this._backend);
      this.emit('backend:changed', { kind });
    });
  }

  private _firstFrameEmitted = false;
  private _announcedDuration = 0;

  private _makeTimeupdateHandler(instance: IAudioBackend): () => void {
    return () => {
      // Between a `next()` and the incoming track's mount, this element is
      // still the OUTGOING track's — the cursor already moved. Publishing
      // its position here hands every listener the previous track's
      // position stamped with the new track's identity. Optional call:
      // the dependency range admits a core that predates the reader, and
      // an older core must degrade to the old behaviour, not throw on
      // every tick.
      if ((this as unknown as WireInternals)._mediaIsStale?.()) return;

      const currentTime = instance.currentTime();
      const totalDuration = instance.duration();
      const safeD = Number.isFinite(totalDuration) && totalDuration > 0
        ? totalDuration
        : 0;

      // The payload is core's full TimeState snapshot, built from the
      // backend's fresh position — the internal slot syncs FROM this event.
      this.emit('time', (this as unknown as WireInternals)._timeStateAt(currentTime));

      // A streamed track has no length at `loadedmetadata` — the element
      // reports Infinity/NaN until enough of the container has arrived.
      // Nothing re-reads it afterwards, so without this the player is
      // stuck on a zero duration for the whole track: no seekbar, and
      // every duration-gated policy (ending-soon, preload, crossfade)
      // stays switched off.
      if (safeD > 0 && safeD !== this._announcedDuration) {
        this._announcedDuration = safeD;
        this.emit('duration', { duration: safeD });
      }

      // Core fires `itemEndingSoon` when the threshold is crossed.
      // `_checkItemEndingSoon` is idempotent — it latches internally.
      (this as unknown as WireInternals)._checkItemEndingSoon(currentTime, safeD);
    };
  }

  private _makeLoadedMetadataHandler(instance: IAudioBackend): () => void {
    // Read duration from the backend. If the backend hasn't resolved a valid
    // duration yet (returns NaN / 0), fall back to the item's consumer-supplied
    // `duration` field so seekbars have a length before metadata arrives.
    return () => {
      const backendDuration = instance.duration();

      // A stream reports Infinity until its length is known. Publishing
      // that poisons every consumer of the value — remaining time,
      // percentage, drift comparisons — so it counts as no duration.
      if (Number.isFinite(backendDuration) && backendDuration > 0) {
        this.emit('duration', { duration: backendDuration });

        return;
      }

      const itemDuration = this.item?.()?.duration;

      if (typeof itemDuration === 'number' && itemDuration > 0) {
        this.emit('duration', { duration: itemDuration });
      }
    };
  }

  private _makePlayStateHandlers(instance: IAudioBackend): void {
    const internals = this as unknown as WireInternals; // accesses private phase fields not on the public type

    instance.on('canplay', () => {
      if (this._firstFrameEmitted) return;

      this._firstFrameEmitted = true;

      if (internals._phase === 'starting') {
        internals._transitionPhase('playing');
      }

      this.emit('firstFrame', undefined);
    });

    // `onPlayEvent` covers the phase transition 'starting' → 'playing' on
    // every raw `play` event, even when `_playState` was already `PLAYING`
    // — needed for the "load → wait → play" pattern where `canplay`
    // already fired during load (setting `_firstFrameEmitted = true`) and
    // won't re-fire on `instance.play()`.
    bridgeBackendPlayState<BackendEventPayload>(instance, {
      isPlaying: () => internals._playState === PlayState.PLAYING,
      setPlaying: (playing) => {
        internals._playState = playing
          ? PlayState.PLAYING
          : PlayState.PAUSED;
      },
      onPlay: () => { this.emit('play', undefined); },
      onPlayEvent: () => {
        if (internals._phase === 'starting') {
          internals._transitionPhase('playing');
        }
      },
      onPlaying: () => { this.emit('playing', undefined); },
      onPause: () => { this.emit('pause', undefined); },
      onReset: () => {
        this._firstFrameEmitted = false;
        this._announcedDuration = 0;
      },
    });

    instance.on('ended', () => {
      // The outgoing track of a crossfade may end before the swap; the incoming one plays on.
      if (this._isTransitioning) return;

      if (internals._phase !== 'ended') {
        internals._transitionPhase('ended');
      }

      this.emit('ended', undefined);
    });
  }

  private _wireBackend(instance: IAudioBackend): void {
    this._firstFrameEmitted = false;

    // Authenticated media servers need the Authorization header on every
    // hls.js manifest/segment request. The provider reads the auth config
    // lazily so getter-style tokens (Vue refs, stores) stay live.
    // Read per request rather than captured, so a consumer whose token or
    // rule changes mid-session is not answered from a stale closure.
    // Live config, not `options.auth`: setup seeds it and `player.auth()`
    // updates it, so a rule set after setup reaches media requests too.
    instance.setAuthHeaderProvider?.((url: string) =>
      this._mediaAuthorization(url));

    // AudioElementBackend has no audioContext(); only WebAudioBackend does.
    // Registering it here keeps AudioGraphPlugin on the one shared context.
    if (typeof instance.audioContext === 'function') {
      setPlayerAudioContext(this, instance.audioContext());
    }

    // Native <audio controls> — useful when no UI plugin is loaded. Re-applied
    // on every backend (re)creation, including runtime `backend(kind)` swaps.
    if (this.options?.controls) {
      instance.mediaElement().controls = true;
    }

    this._makePlayStateHandlers(instance);
    instance.on('timeupdate', this._makeTimeupdateHandler(instance));
    instance.on('loadedmetadata', this._makeLoadedMetadataHandler(instance));
    this._wireAutomaticCrossfade();
  }

  /**
   * The kit's transition runner reports the overlap window and ramps the
   * secondary gain, but it never loads a secondary, so on its own the gain
   * writes to an empty slot and one track cuts to the next.
   *
   * `crossfadeTo` is the path that loads, primes and ramps, so the automatic
   * window hands off to it. Its own in-flight guard makes a second caller a
   * no-op, which is what keeps this from stacking with an auto-advance plugin
   * that crossfades on its own.
   */
  private _wireAutomaticCrossfade(): void {
    if (this._automaticCrossfadeWired) return;

    this._automaticCrossfadeWired = true;

    this.on('transitionStart', ({ incoming }) => {
      if (this.options?.crossfadeEnabled === false) return;

      if (!incoming?.url) return;

      if (!this.backend().supportsCrossfade()) return;

      void this.crossfadeTo(incoming as T).catch(() => {
        // crossfadeTo reports its own failures through the error channel.
      });
    });
  }

  // ── Crossfade — dual-element implementation ──
  /**
   * Fade the active element out while a second element fades in, then swap
   * them. Ignored while a crossfade is already in flight. Dispatches
   * `beforeCrossfade` first; a listener may `preventDefault()` to cancel, in
   * which case `crossfadePrevented` fires and no buffers are touched.
   *
   * The gain trajectory resolves per-call `opts.curve` first, then
   * `crossfadeDefaults.curve` from the config, then linear. Throws
   * `StateError('core:player/crossfade-unsupported')` when the active
   * backend reports `supportsCrossfade() === false`.
   */
  async crossfadeTo(item: T, opts?: CrossfadeOptions & ActionOptions): Promise<void> {
    if (this._isTransitioning) return; // idempotent guard — reject stacked crossfades

    const durationMs = ((opts?.duration ?? this.options?.crossfadeDefaults?.duration ?? 5) * 1000);
    const curve = opts?.curve ?? this.options?.crossfadeDefaults?.curve;

    if (!item.url) {
      throw new MediaFormatError({
        code: 'core:media/missing-url',
        severity: 'error',
        scope: { kind: 'core' },
        message: 'crossfadeTo(item) requires `item.url` to be present.',
        context: { id: item.id },
      });
    }

    const backend = this.backend();

    if (!backend.supportsCrossfade()) {
      throw new StateError({
        code: 'core:player/crossfade-unsupported',
        severity: 'error',
        scope: { kind: 'core' },
        message: 'crossfadeTo() requires a backend with dual-playback support — the active backend returned supportsCrossfade() === false.',
        context: { backend: backend.kind },
      });
    }

    const fromItem = this.item?.() ?? null;

    const internals = this as unknown as WireInternals; // accesses the kit-composed _dispatchBefore, not on the public type
    const result = await internals._dispatchBefore<{
      from: T | null;
      to: T;
      duration: number;
    }>('beforeCrossfade', {
      from: fromItem,
      to: item,
      duration: durationMs,
    });

    if (result.prevented) {
      this.emit('crossfadePrevented', {
        reason: result.reason ?? 'listener-prevented',
        cause: result.cause,
      });

      return;
    }

    // Re-validate — a listener may have swapped `data.to` for a different item.
    const targetItem = result.data.to;
    const targetDurationMs = result.data.duration;
    const url = targetItem.url;

    if (!url) {
      throw new MediaFormatError({
        code: 'core:media/missing-url',
        severity: 'error',
        scope: { kind: 'core' },
        message: 'crossfadeTo(item) requires `item.url` to be present.',
        context: { id: targetItem.id },
      });
    }

    this._isTransitioning = true;

    this.emit('crossfadeStart', {
      from: result.data.from,
      to: targetItem,
      duration: targetDurationMs,
    });

    try {
      // Delegate all dual-buffer logic to the backend. The curve argument is
      // omitted (not passed as undefined) when unresolved so the backend call
      // stays identical to the pre-curve contract.
      // Through the same seam the primary load() uses (loading.ts:
      // `resolveUrl(rawUrl, 'media')`). Handed the raw item URL, the
      // secondary element resolves a relative path against the page origin
      // instead of `baseUrl` and 404s — and every consumer keeps item URLs
      // relative, because that is how the media server sends them.
      const resolvedUrl = (await this.resolveUrl(url, 'media')).href;

      await backend.loadSecondary(resolvedUrl);
      await backend.primeSecondary(opts?.startAt);

      await (curve === undefined
        ? backend.crossfade(targetDurationMs)
        : backend.crossfade(targetDurationMs, curve));
    } catch (err) {
      this._isTransitioning = false;
      throw err;
    }

    // Cursor only, not the `item()` setter: the setter loads, and the swapped
    // element already plays the incoming track.
    const state = this as unknown as { _queueList: { setCurrent: (target: T | string | number) => void }; _mountedItemId?: string | number };

    // Mounted first: until it matches the cursor, every position is dropped as stale.
    state._mountedItemId = targetItem.id;
    state._queueList.setCurrent(targetItem.id ?? targetItem);

    this._isTransitioning = false;
    this.emit('crossfadeComplete', { item: targetItem });
  }

  isTransitioning(): boolean {
    return this._isTransitioning;
  }

  /** @internal */
  declare _mediaAuthorization: (url: string) => string | undefined;
}

// Compose every shared player method onto the prototype. The kit's logic
// gets wired into the class here — no inheritance, no per-library duplication.
composeMixins(NMMusicPlayer.prototype, ...playerCoreMethods);

{
  const composedDispose: () => Promise<void> = NMMusicPlayer.prototype.dispose;

  // The composed (kit) `dispose()` now dispatches the cancellable
  // `beforeDispose` hook before it does anything else — a plugin may
  // `preventDefault()` and leave the player fully alive. Teardown of the
  // music-specific backend + registry entry MUST wait until that dispatch
  // has actually resolved AND the kit confirms it proceeded (phase reached
  // 'disposed'); tearing the backend down unconditionally first (as before)
  // would kill playback even when a plugin blocked the disposal.
  NMMusicPlayer.prototype.dispose = async function (this: NMMusicPlayer<MusicPlaylistItem>): Promise<void> {
    // The container id is released before the first await, not after the
    // teardown resolves. A consumer re-creating on the same container in the
    // same tick was handed back the very player it had just asked to
    // dispose, and `setup()` then threw `already-setup` — leaving that
    // player attached and playing with nobody holding a reference.
    const claimedId: string = this.playerId;

    _instances.delete(claimedId);

    await composedDispose.call(this);

    if (this.phase() !== 'disposed') {
      // beforeDispose was prevented — the player is still alive, so it
      // takes its id back and the backend stays intact.
      _instances.set(claimedId, this);

      return;
    }

    const self = this as unknown as { _backend?: IAudioBackend }; // dispose needs write access to the private _backend field

    try { self._backend?.dispose?.(); } catch { /* defensive — kit must still finish disposing */ }

    self._backend = undefined;
    _instances.delete(this.playerId);
  };
}

// Wrap the kit-composed `setup` with the music-domain defaults every entry
// point must get — crossfade defaults + first-track priming. This lives on
// the class, not in a factory, so `nmplayer()` and `new NMMusicPlayer()`
// both behave identically.
{
  type _KitSetupFn = (config: MusicPlayerConfig<MusicPlaylistItem>) => NMMusicPlayer<MusicPlaylistItem>;
  const kitSetup: _KitSetupFn = NMMusicPlayer.prototype.setup as _KitSetupFn;

  const wrappedSetup: _KitSetupFn = function (this: NMMusicPlayer<MusicPlaylistItem>, config: MusicPlayerConfig<MusicPlaylistItem>): NMMusicPlayer<MusicPlaylistItem> {
    // Music defaults to crossfading between tracks. Consumer-supplied
    // strategies always win — only inject when absent.
    const leadSeconds = config.preloadLeadSeconds ?? 10;
    const crossfadeLeadSeconds = config.crossfadeLeadSeconds ?? 3;
    const crossfadeTailSeconds = config.crossfadeTailSeconds ?? 3;
    const itemEndingSoonThreshold = config.itemEndingSoonThreshold;

    const enrichedConfig: MusicPlayerConfig<MusicPlaylistItem> = {
      crossfadeEnabled: true,
      ...config,
      preloadLeadSeconds: leadSeconds,
      crossfadeLeadSeconds,
      crossfadeTailSeconds,
      ...(itemEndingSoonThreshold !== undefined
        ? { itemEndingSoonThreshold }
        : {}),
      preloadStrategy: config.preloadStrategy ?? new MusicPreloadStrategy(leadSeconds),
      transitionStrategy: config.transitionStrategy ?? new CrossfadeTransitionStrategy({
        leadSeconds: crossfadeLeadSeconds,
        tailSeconds: crossfadeTailSeconds,
        curve: config.crossfadeDefaults?.curve ?? 'equal-power',
      }),
    };
    const instance = kitSetup.call(this, enrichedConfig);

    // Every setup with a non-empty playlist primes the first track —
    // loads it so the player never mounts blank. Music has no autoPlay
    // config knob (unlike video), so the prime never plays; setup() only
    // arms the queue and play() does not lazy-load, so waiting for
    // mediaReady here would deadlock.
    void this.ready()
      .then(() => {
        const items = this.queue();

        if (items.length === 0) return;

        // A consumer that pre-picked a track between setup() and
        // ready() keeps its choice — the queue cursor DEFAULTS to
        // item 0 the moment items exist, so only an explicit
        // `item(target)` navigation (which bumps `_currentEpoch`)
        // counts as a real preselection.
        const preselected = this._currentEpoch
          ? this.item()
          : undefined;

        this.item(preselected ?? 0, {
          autoplay: false,
          source: 'auto-play',
        });
      })
      .catch(() => { /* setup failed — error surfaced via the 'error' event */ });

    return instance;
  };

  Object.defineProperty(NMMusicPlayer.prototype, 'setup', {
    value: wrappedSetup,
    writable: true,
    configurable: true,
  });
}

/**
 * Canonical v2 entry point.
 *
 * Returns an `NMMusicPlayer` instance — no compat shims, the fully typed v2
 * surface and nothing else.
 *
 * ```ts
 * import nmplayer from '@nomercy-entertainment/nomercy-music-player';
 * nmplayer('my-div').setup({ ...config });
 * ```
 */
export function nmplayer<T extends MusicPlaylistItem = MusicPlaylistItem>(id?: string | number): NMMusicPlayer<T> {
  return new NMMusicPlayer<T>(id);
}

/**
 * Default export is the canonical `nmplayer` factory — clean v2, no v1 baggage.
 */
export default nmplayer;
