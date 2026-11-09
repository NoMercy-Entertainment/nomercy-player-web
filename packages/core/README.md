[![npm](https://img.shields.io/npm/v/@nomercy-entertainment/nomercy-player-core/latest?label=latest)](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-player-core)
[![license](https://img.shields.io/npm/l/@nomercy-entertainment/nomercy-player-core)](https://www.apache.org/licenses/LICENSE-2.0)
[![bundlephobia](https://img.shields.io/bundlephobia/minzip/@nomercy-entertainment/nomercy-player-core)](https://bundlephobia.com/package/@nomercy-entertainment/nomercy-player-core)

Full documentation: https://docs.nomercy.tv/nomercy-player-core/

# nomercy-player-core

The shared, headless engine that the video and music players are built on.

It carries everything that is not specific to video or audio: the queue, auth, the plugin system, the typed event bus, i18n, and storage.

**You stay in charge.**

Nothing renders a UI on its own. Nothing is forced on you.

- **Everything is opt-in.** No plugin runs until you `addPlugin` it. The engine ships quiet, you add only what you want.
- **Swap any behavior through adapters.** Storage, logger, translator, cue parsers, preload and transition strategies, the shuffle strategy, the URL resolver and the stream registry are each an interface with a default. Pass your own in `setup()`, or register it at runtime where the surface allows. No subclassing.
- **Plain events and methods.** The engine reports through a typed event bus. How you react, and what you build, is yours.

You rarely install this package directly.

Pull in [`nomercy-video-player`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-video-player) or [`nomercy-music-player`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-music-player) and the core comes with it.

Install it on its own only when you are writing a plugin or building a new player package on the core.

```
npm install @nomercy-entertainment/nomercy-player-core
```

## Quick start

The core is the player engine. Compose its method bundle onto a class and you have a player with the queue, transport, loading pipeline, time and volume, the typed event bus, auth, and the plugin system. A library on top of the core adds only the medium-specific piece, the backend that turns a source into sound or picture.

```ts
import {
  composeMixins,
  EventEmitter,
  initPlayerCoreState,
  playerCoreMethods,
  resolvePlayerConstructor,
  type BaseEventMap,
  type BasePlayerConfig,
  type PlayerPhase,
  type PluginCtorWithId,
} from '@nomercy-entertainment/nomercy-player-core';

const instances = new Map<string, CorePlayer>();

class CorePlayer extends EventEmitter<BaseEventMap> {
  playerId = '';
  container: HTMLElement = {} as HTMLElement;

  // composeMixins adds these at runtime, so declare what you call.
  declare setup: (config: BasePlayerConfig) => this;
  declare ready: () => Promise<void>;
  declare dispose: () => Promise<void>;
  declare phase: () => PlayerPhase;
  declare addPlugin: (PluginClass: PluginCtorWithId) => this;

  constructor(id?: string | number) {
    super();
    const resolved = resolvePlayerConstructor(id, instances, 'CorePlayer');
    if (resolved.kind === 'existing') {
      return resolved.instance as unknown as this;
    }

    initPlayerCoreState(this, { className: 'CorePlayer' });
    this.playerId = resolved.id;
    this.container = resolved.div;
    instances.set(resolved.id, this);
  }
}

composeMixins(CorePlayer.prototype, ...playerCoreMethods);

const player = new CorePlayer('player'); // needs <div id="player"> in the page
player.setup({ logLevel: 'info' });
await player.ready();
console.log(player.phase()); // 'ready'
await player.dispose();
```

This class has no media backend, so playback methods have nothing to drive. That backend is what `nomercy-video-player` and `nomercy-music-player` add. Reach for the core directly when you are building a new player package like those, not when you just want to play video or audio.

Two extension points put you in control of the rest. **Adapters** replace any cross-cutting concern through `setup()`, no subclassing. Override only what you want; everything else keeps its default:

```ts
import { LocalStorageBackend } from '@nomercy-entertainment/nomercy-player-core';

player.setup({
  storage: new LocalStorageBackend(),   // or your own IStorage
  logger: myLogger,                      // your own ILogger
  shuffleStrategy: myShuffle,            // your own IShuffleStrategy
  urlResolver: mySignedUrls,             // your own IUrlResolver
});
```

**Plugins** are opt-in and ride the same typed event bus. Nothing registers itself; you add what you want. A plugin reads through `this.on`, emits its own events, and needs no manual teardown, the base disposes every `this.on` subscription and mounted element for it:

```ts
import { Plugin } from '@nomercy-entertainment/nomercy-player-core';

export class PlayCountPlugin extends Plugin {
  static override readonly id = 'play-count';

  override use(): void {
    this.on('play', () => this.emit('play-count:changed', undefined));
  }
}

player.addPlugin(PlayCountPlugin);
```

## Documentation

The [docs site](https://docs.nomercy.tv/nomercy-player-core/) is the full reference, ordered from first player to plugin author:

- [Introduction](https://docs.nomercy.tv/nomercy-player-core/introduction) and [Quick Start](https://docs.nomercy.tv/nomercy-player-core/quickstart), composing the core into a player
- The Guided Tour over the [lifecycle](https://docs.nomercy.tv/nomercy-player-core/tour/lifecycle), the [event bus](https://docs.nomercy.tv/nomercy-player-core/tour/event-bus), the [adapter ports](https://docs.nomercy.tv/nomercy-player-core/tour/adapters), and the [plugin base](https://docs.nomercy.tv/nomercy-player-core/tour/plugin-base)
- [Build a Player](https://docs.nomercy.tv/nomercy-player-core/build/compose-methods) and [Recipe: use authFetch](https://docs.nomercy.tv/nomercy-player-core/recipes/auth-fetch)
- The full [type reference](https://docs.nomercy.tv/nomercy-player-core/reference/composition) and [Testing your plugins](https://github.com/NoMercy-Entertainment/nomercy-player-web/blob/master/TESTING.md) with the `describePlugin` conformance helper the kit ships

Upgrading from an earlier version: [MIGRATION.md](https://github.com/NoMercy-Entertainment/nomercy-player-web/blob/master/packages/core/MIGRATION.md).

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)

Source: [packages/core in nomercy-player-web](https://github.com/NoMercy-Entertainment/nomercy-player-web/tree/master/packages/core). Version history: [CHANGELOG.md](https://github.com/NoMercy-Entertainment/nomercy-player-web/blob/master/packages/core/CHANGELOG.md).
