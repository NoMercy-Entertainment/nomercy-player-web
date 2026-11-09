[![npm](https://img.shields.io/npm/v/@nomercy-entertainment/nomercy-video-player/latest?label=latest)](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-video-player)
[![license](https://img.shields.io/npm/l/@nomercy-entertainment/nomercy-video-player)](https://www.apache.org/licenses/LICENSE-2.0)
[![bundlephobia](https://img.shields.io/bundlephobia/minzip/@nomercy-entertainment/nomercy-video-player)](https://bundlephobia.com/package/@nomercy-entertainment/nomercy-video-player)

# nomercy-video-player

A headless video player for the web, with HLS built in and every feature beyond playback a plugin you opt into.

It ships no interface by default. You get the transport, the queue, subtitle and audio track selection, and a typed event bus. You build the UI yourself, or add the prebuilt `DesktopUiPlugin`.

What sets it apart:

- **Headless by design.** The player owns playback and state. The controls are yours.
- **Everything is a plugin.** Keyboard, touch, Chromecast, DRM, ASS subtitles and the rest are separate imports. You only ship what you register.
- **Typed end to end.** Methods, events and plugin options are TypeScript types.
- **Swappable parts.** Pass your own storage, URL resolver, logger or retry policy to `setup()`. No subclassing.

It is built on [`nomercy-player-core`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-player-core), the shared engine for the queue, auth, plugins, i18n and storage. The music sibling is [`nomercy-music-player`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-music-player).

## Install

```sh
npm install @nomercy-entertainment/nomercy-video-player
```

`nomercy-player-core` is a regular dependency, so it installs with the player. So does `hls.js`, which the core package depends on. There is no peer dependency to add.

### Script tag

The published package carries a prebuilt bundle at `dist/nomercy-video-player.iife.js`. It defines one global, `nmplayer`, which is the player factory. Use it when your page loads scripts by tag instead of importing modules.

## Quick start

```ts
import { nmplayer } from '@nomercy-entertainment/nomercy-video-player';
import { DesktopUiPlugin } from '@nomercy-entertainment/nomercy-video-player/plugins';

const player = nmplayer('player')
  .addPlugin(DesktopUiPlugin)
  .setup({
    baseUrl: 'https://raw.githubusercontent.com/NoMercy-Entertainment/nomercy-media/master/Films',
    playlist: [
      {
        id: 'sintel',
        title: 'Sintel',
        url: '/Sintel.(2010)/Sintel.(2010).NoMercy.m3u8',
        duration: 888,
      },
    ],
  });

player.on('ready', () => {
  player.item(0, { autoplay: true });
});
```

`'player'` is the id of the element the player mounts into. This gives you a working player with the full built-in UI. Drop `DesktopUiPlugin` and you get playback with no controls.

## Common tasks

### Load and move through a playlist

```ts
player.queue([
  { id: 'a', title: 'Episode 1', url: '/show/s01e01.m3u8', duration: 1320 },
  { id: 'b', title: 'Episode 2', url: '/show/s01e02.m3u8', duration: 1290 },
]);

player.item('b');       // jump by id, by index, or by item
await player.next();
await player.previous();
```

`queueAppend()` adds to the end of the queue. `repeatState()` and `shuffleState()` read and set repeat and shuffle.

### Listen to events

```ts
player.on('time', ({ position, duration }) => {
  console.log(position, duration);
});

player.on('item', ({ item, index }) => {
  console.log('now playing', index, item?.title);
});

player.on('fatal', error => console.error(error));
```

Every event is typed. `once()` and `off()` work the same way.

### Add a plugin

```ts
import { KeyHandlerPlugin, TouchZonesPlugin } from '@nomercy-entertainment/nomercy-video-player/plugins';

player.addPlugin(KeyHandlerPlugin).addPlugin(TouchZonesPlugin);
```

`addPlugin` returns the player, so calls chain. Each plugin also has its own subpath import, such as `@nomercy-entertainment/nomercy-video-player/plugins/octopus`.

### Subtitles

```ts
import { OctopusPlugin, SubtitleOverlayPlugin } from '@nomercy-entertainment/nomercy-video-player/plugins';

player.addPlugin(SubtitleOverlayPlugin).addPlugin(OctopusPlugin);

player.queue([
  {
    id: 'sintel',
    title: 'Sintel',
    url: '/Sintel.m3u8',
    subtitles: [
      { id: 'en', label: 'English', language: 'en', url: '/Sintel.en.vtt' },
      { id: 'en-ass', label: 'English (styled)', language: 'en', url: '/Sintel.en.ass' },
    ],
  },
]);

await player.subtitle(0);     // pick a track by its position in subtitles()
await player.subtitle(null);  // captions off
```

The player parses the tracks and emits `subtitleCue` events. It paints nothing itself, so register a renderer. `SubtitleOverlayPlugin` draws WebVTT as DOM. `OctopusPlugin` renders ASS and SSA through libass, including embedded fonts. Register both if your library holds both formats. `cycleSubtitles()` steps through the tracks and back to off.

### The built-in UI

`DesktopUiPlugin` is a top bar, a center play button, a scrubber with sprite previews, seven menu panes and an auto-hide cycle. It calls the same public methods your own code can call, and you restyle it with plain CSS. Pass `DesktopUiOptions` as the second argument of `addPlugin` to configure it.

## Built-in plugins

21 plugin classes are exported from `@nomercy-entertainment/nomercy-video-player/plugins`. 11 are written in this package. 10 are re-exported from `nomercy-player-core`.

| Plugin | What it does |
| --- | --- |
| `DesktopUiPlugin` | The prebuilt overlay: top bar, scrubber, menu panes. |
| `SubtitleOverlayPlugin` | Draws WebVTT cues as a positioned DOM tree over the video. |
| `OctopusPlugin` | Renders ASS and SSA subtitles with libass, with embedded fonts. |
| `KeyHandlerPlugin` | The keyboard binding set, with each group overridable. |
| `TvKeyHandlerPlugin` | Adapts the keyboard set for a TV remote. |
| `TouchZonesPlugin` | A tap grid over the picture: tap to toggle controls or playback, double tap to seek. |
| `CastSenderPlugin` | Chromecast sender with video metadata. |
| `MediaSessionPlugin` | Fills the OS Now Playing text and controls from the current item. |
| `DrmPlugin` | Key-system probing and license requests for Widevine, PlayReady and FairPlay. |
| `LiveTranscodingPlugin` | Coordinates playback with a server that transcodes segment by segment on demand. |
| `TwitchPlugin` | Plays Twitch clip, VOD and live links. |
| `EmbedPlugin` | A `postMessage` bridge between a host page and a player in an iframe. |
| `MessagePlugin` | Toast messages and persistent overlays on the player container. |
| `TabLeaderPlugin` | Keeps playback to one tab at a time, using the Web Locks API. |
| `AudioGraphPlugin` | Owns the `AudioContext` and the signal chain the audio plugins share. |
| `EqualizerPlugin` | Ten peaking filters and a pre-gain, with presets. Needs `AudioGraphPlugin`. |
| `MixerPlugin` | Master gain in decibels and stereo pan. |
| `SpectrumPlugin` | Emits spectrum, waveform and band-energy frames. |
| `CanvasPlugin` | A shared canvas mount and render loop for visualizers. |
| `VisualizationPlugin` | Abstract base for canvas visualizers. |
| `VolumeMemoryPlugin` | Restores the volume and mute state a viewer chose. |

Per-plugin pages are in the [plugin docs](https://docs.nomercy.tv/nomercy-video-player/plugins-adapters/desktop-ui).

## API overview

The surface is shared with the core package, plus the video additions. Most methods read when called with no argument and write when called with one.

| Purpose | Methods |
| --- | --- |
| Playback | `play()`, `pause()`, `stop()`, `time()`, `forward()`, `rewind()`, `restart()`, `volume()`, `mute()`, `unmute()`, `playbackRate()` |
| Queue | `queue()`, `queueAppend()`, `item()`, `next()`, `previous()`, `backlog()`, `repeatState()`, `shuffleState()` |
| Tracks | `subtitles()`, `subtitle()`, `cycleSubtitles()`, `audioTracks()`, `audioTrack()`, `qualityLevels()`, `quality()`, `chapters()`, `seekToChapter()` |
| Display | `fullscreen()`, `aspectRatio()`, `cycleAspectRatio()`, `videoRect()` |
| Events | `on()`, `once()`, `off()` |
| Plugins | `addPlugin()`, `getPlugin()` |

The full list is in the [API methods reference](https://docs.nomercy.tv/nomercy-video-player/reference/player-methods) and the [events reference](https://docs.nomercy.tv/nomercy-video-player/reference/events).

## HLS and formats

A URL counts as HLS when it contains `.m3u8` followed by `?`, `#` or the end of the string. HLS plays through the browser's own support when it has it, and through `hls.js` otherwise. `hls.js` loads only when it is needed.

Any other URL goes straight to the video element. The playable formats, such as `.mp4` and `.webm`, are whatever the browser can decode.

## Documentation and examples

- [Introduction](https://docs.nomercy.tv/nomercy-video-player/introduction) and [Quick Start](https://docs.nomercy.tv/nomercy-video-player/quickstart)
- [Guided Tour](https://docs.nomercy.tv/nomercy-video-player/tour/transport): transport, volume, queue, [subtitles](https://docs.nomercy.tv/nomercy-video-player/tour/subtitles), quality and chapters. Most pages include a running example.
- [Build a Player](https://docs.nomercy.tv/nomercy-video-player/build/shell): a tutorial that builds your own UI plugin
- Recipes for [Vue](https://docs.nomercy.tv/nomercy-video-player/recipes/vue-integration), [React](https://docs.nomercy.tv/nomercy-video-player/recipes/react-integration), [Svelte](https://docs.nomercy.tv/nomercy-video-player/recipes/svelte-integration) and [vanilla JS](https://docs.nomercy.tv/nomercy-video-player/recipes/vanilla-integration)
- Reference: [Configuration](https://docs.nomercy.tv/nomercy-video-player/reference/config), [Playlist item](https://docs.nomercy.tv/nomercy-video-player/reference/playlist-item), [Streams](https://docs.nomercy.tv/nomercy-video-player/reference/streams)

Upgrading from v1: see [MIGRATION.md](https://github.com/NoMercy-Entertainment/nomercy-player-web/blob/master/packages/video-player/MIGRATION.md). It lists renamed methods, changed event payloads, and the `item.file` to `item.url` rename.

## Related packages

- [`nomercy-player-core`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-player-core): the shared engine
- [`nomercy-music-player`](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-music-player): the audio sibling
- [`media-session`](https://www.npmjs.com/package/@nomercy-entertainment/media-session): framework-free Media Session wiring

## License

Apache-2.0

Source: [packages/video-player in nomercy-player-web](https://github.com/NoMercy-Entertainment/nomercy-player-web/tree/master/packages/video-player). Version history: [CHANGELOG.md](https://github.com/NoMercy-Entertainment/nomercy-player-web/blob/master/packages/video-player/CHANGELOG.md).
