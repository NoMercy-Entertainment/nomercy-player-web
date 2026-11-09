[![npm](https://img.shields.io/npm/v/@nomercy-entertainment/nomercy-music-player/latest?label=latest)](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-music-player)
[![license](https://img.shields.io/npm/l/@nomercy-entertainment/nomercy-music-player)](https://www.apache.org/licenses/LICENSE-2.0)
[![bundlephobia](https://img.shields.io/bundlephobia/minzip/@nomercy-entertainment/nomercy-music-player)](https://bundlephobia.com/package/@nomercy-entertainment/nomercy-music-player)

# nomercy-music-player

A headless audio player for the web, built around the hand-off between two tracks: crossfade, or a hard gapless cut.

It ships no interface. You get the transport, the queue, an equalizer and synced lyrics, all behind a typed event bus. You build the UI.

What sets it apart:

- **Track transitions are the core feature.** A crossfade starts by itself near the end of a track, or on demand with `crossfadeTo()`. You can swap it for a gapless strategy at any time.
- **Headless by design.** The player owns playback and state. The controls are yours.
- **Everything else is a plugin.** Lyrics, equalizer, lock-screen controls, auto-advance, scrobbling and the rest are separate imports. You only ship what you register.
- **Swappable parts.** Pass your own storage, URL resolver, shuffle strategy or logger to `setup()`. No subclassing.

It is built on [`nomercy-player-core`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-player-core), the shared engine for the queue, auth, plugins, i18n and storage. The video sibling is [`nomercy-video-player`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-video-player).

## Install

```sh
npm install @nomercy-entertainment/nomercy-music-player
```

`nomercy-player-core` is a regular dependency, so it installs with the player. So does `hls.js`, which the core package depends on. There is no peer dependency to add.

### Script tag

The published package carries a prebuilt bundle at `dist/nomercy-music-player.iife.js`. It defines one global, `nmMPlayer`, which is the player factory. Use it when your page loads scripts by tag instead of importing modules.

## Quick start

```ts
import { nmplayer } from '@nomercy-entertainment/nomercy-music-player';
import { AutoAdvancePlugin, MediaSessionPlugin } from '@nomercy-entertainment/nomercy-music-player/plugins';

const player = nmplayer('main')
  .addPlugin(AutoAdvancePlugin)
  .addPlugin(MediaSessionPlugin)
  .setup({
    baseUrl: 'https://raw.githubusercontent.com/NoMercy-Entertainment/nomercy-media/master/Music',
    playlist: [
      {
        id: 'bent-wyre-01',
        name: 'Ants Of The Beat',
        url: '/B/bent.wyre/If.Only.Life.Was.This.Easy.Volume.5.The.Beat.Misdirect.(2025)/01.Ants.Of.The.Beat.mp3',
        artist: 'bent wyre',
      },
    ],
  });

player.on('ready', () => {
  player.item(0, { autoplay: true });
});
```

`AutoAdvancePlugin` plays the next track when one ends. `MediaSessionPlugin` wires the lock-screen and notification controls.

## Common tasks

### Load and move through a playlist

```ts
player.queue([
  { id: 'a', name: 'First track', artist: 'Artist', url: '/a.mp3' },
  { id: 'b', name: 'Second track', artist: 'Artist', url: '/b.mp3' },
]);

player.item('b');       // jump by id, by index, or by item
await player.next();
await player.previous();
await player.shuffleState(true);
```

`queueAppend()` adds to the end of the queue. `repeatState()` reads and sets repeat.

### Listen to events

```ts
player.on('time', ({ position, duration }) => {
  console.log(position, duration);
});

player.on('item', ({ item, index }) => {
  console.log('now playing', index, item?.name);
});

player.on('fatal', error => console.error(error));
```

Every event is typed. `once()` and `off()` work the same way.

### Add a plugin

```ts
import { LyricsPlugin, ScrobblePlugin } from '@nomercy-entertainment/nomercy-music-player/plugins';

player.addPlugin(LyricsPlugin).addPlugin(ScrobblePlugin);
```

`addPlugin` returns the player, so calls chain. Each plugin also has its own subpath import, such as `@nomercy-entertainment/nomercy-music-player/plugins/lyrics`. `LyricsPlugin` fetches the `lyricsUrl` of each item and emits `plugin:lyrics:lineEnter` and `plugin:lyrics:lineExit` as lines change. `ScrobblePlugin` does nothing until you give it an `IScrobbler` backend.

### Crossfade

```ts
import { CrossfadeTransitionStrategy } from '@nomercy-entertainment/nomercy-player-core';

player.setup({
  transitionStrategy: new CrossfadeTransitionStrategy({ leadSeconds: 3, tailSeconds: 3, curve: 'equal-power' }),
  playlist: [],
});

// or fade to a specific track right now
const [upcoming] = player.queue();
if (upcoming)
  await player.crossfadeTo(upcoming, { duration: 4, curve: 'equal-power' });
```

The strategy decides how the automatic hand-off between queue items works. `crossfadeTo()` is the manual version. `duration` is in seconds. `GaplessTransitionStrategy` gives a hard cut with no overlap instead. `linear` is the default curve and `equal-power` keeps the combined loudness steady through the join.

### Equalizer

```ts
import { AudioGraphPlugin, EqualizerPlugin } from '@nomercy-entertainment/nomercy-music-player/plugins';

player.addPlugin(AudioGraphPlugin).addPlugin(EqualizerPlugin);
```

`EqualizerPlugin` builds ten filters and a pre-gain into the audio graph. It requires `AudioGraphPlugin`, and registration fails without it.

## Built-in plugins

16 plugin classes are exported from `@nomercy-entertainment/nomercy-music-player/plugins`. 6 are written in this package. 10 are re-exported from `nomercy-player-core`.

| Plugin | What it does |
| --- | --- |
| `AutoAdvancePlugin` | Plays the next track when one ends, using a strategy you can replace. |
| `LyricsPlugin` | Fetches and parses lyrics for the current track, and emits line-enter and line-exit events. |
| `ScrobblePlugin` | Reports listens to an `IScrobbler` backend after a threshold, and does nothing until you supply one. |
| `MediaSessionPlugin` | Fills the OS Now Playing text and lock-screen controls from the current track. |
| `KeyHandlerPlugin` | Keyboard bindings, with `n`, `p`, `r` and `s` added for next, previous, repeat and shuffle. |
| `CastSenderPlugin` | Chromecast sender with audio metadata. |
| `AudioGraphPlugin` | Owns the `AudioContext` and the signal chain the audio plugins share. |
| `EqualizerPlugin` | Ten peaking filters and a pre-gain, with presets. Needs `AudioGraphPlugin`. |
| `MixerPlugin` | Master gain in decibels and stereo pan. |
| `SpectrumPlugin` | Emits spectrum, waveform and band-energy frames. |
| `CanvasPlugin` | A shared canvas mount and render loop for visualizers. |
| `VisualizationPlugin` | Abstract base for canvas visualizers. |
| `VolumeMemoryPlugin` | Restores the volume and mute state a listener chose. |
| `EmbedPlugin` | A `postMessage` bridge between a host page and a player in an iframe. |
| `MessagePlugin` | Toast messages and persistent overlays on the player container. |
| `TabLeaderPlugin` | Keeps playback to one tab at a time, using the Web Locks API. |

Per-plugin pages are in the [plugin docs](https://docs.nomercy.tv/nomercy-music-player/plugins-adapters/auto-advance).

## API overview

The surface is shared with the core package, plus the music additions. Most methods read when called with no argument and write when called with one.

| Purpose | Methods |
| --- | --- |
| Playback | `play()`, `pause()`, `stop()`, `time()`, `forward()`, `rewind()`, `restart()`, `volume()`, `mute()`, `unmute()`, `playbackRate()` |
| Transitions | `crossfadeTo()`, `isTransitioning()`, `setTransitionStrategy()` |
| Queue | `queue()`, `queueAppend()`, `item()`, `next()`, `previous()`, `backlog()`, `repeatState()`, `shuffleState()` |
| Tracks | `audioTracks()`, `audioTrack()`, `qualityLevels()`, `chapters()`, `seekToChapter()` |
| Events | `on()`, `once()`, `off()` |
| Plugins | `addPlugin()`, `getPlugin()` |

The full list is in the [API methods reference](https://docs.nomercy.tv/nomercy-music-player/reference/player-methods) and the [events reference](https://docs.nomercy.tv/nomercy-music-player/reference/events).

## HLS and formats

A track URL counts as HLS when its path ends in `.m3u8`, ahead of any query string or fragment. HLS plays through `hls.js`, or through the element directly when the browser plays HLS natively. `hls.js` loads only when an `.m3u8` arrives.

Every other URL goes straight to the audio element. The playable formats, such as `.mp3`, are whatever the browser can decode.

Two audio backends ship, `audio-element` (the default) and `webaudio`. Choose one with the `backend` option in `setup()`. The default backend drives its fade from a `requestAnimationFrame` loop, which is not sample-accurate, so expect a small seam at track boundaries.

## Documentation and examples

- [Introduction](https://docs.nomercy.tv/nomercy-music-player/introduction) and [Quick Start](https://docs.nomercy.tv/nomercy-music-player/quickstart)
- [Guided Tour](https://docs.nomercy.tv/nomercy-music-player/tour/transport): transport, queue, [crossfade](https://docs.nomercy.tv/nomercy-music-player/tour/crossfade), [equalizer](https://docs.nomercy.tv/nomercy-music-player/tour/equalizer) and [lyrics](https://docs.nomercy.tv/nomercy-music-player/tour/lyrics). Most pages include a running example.
- [Crossfade and gapless recipe](https://docs.nomercy.tv/nomercy-music-player/recipes/crossfade-gapless)
- [Build a Player](https://docs.nomercy.tv/nomercy-music-player/build/shell): a tutorial that builds your own UI plugin
- Recipes for [Vue](https://docs.nomercy.tv/nomercy-music-player/recipes/vue-integration), [React](https://docs.nomercy.tv/nomercy-music-player/recipes/react-integration), [Svelte](https://docs.nomercy.tv/nomercy-music-player/recipes/svelte-integration) and [vanilla JS](https://docs.nomercy.tv/nomercy-music-player/recipes/vanilla-integration)
- Reference: [Configuration](https://docs.nomercy.tv/nomercy-music-player/reference/config) and [Types](https://docs.nomercy.tv/nomercy-music-player/reference/types)

Upgrading from v1: see [MIGRATION.md](https://github.com/NoMercy-Entertainment/nomercy-player-web/blob/master/packages/music-player/MIGRATION.md). It lists renamed methods, changed event payloads, and the `item.path` to `item.url` rename.

## Related packages

- [`nomercy-player-core`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-player-core): the shared engine
- [`nomercy-video-player`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-video-player): the video sibling
- [`media-session`](https://www.npmjs.com/package/@nomercy-entertainment/media-session): framework-free Media Session wiring

## License

Apache-2.0

Source: [packages/music-player in nomercy-player-web](https://github.com/NoMercy-Entertainment/nomercy-player-web/tree/master/packages/music-player). Version history: [CHANGELOG.md](https://github.com/NoMercy-Entertainment/nomercy-player-web/blob/master/packages/music-player/CHANGELOG.md).
