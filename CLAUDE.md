# NoMercy Player Web

One repository for the web player packages. The [README](./README.md) explains the layout and the commands.

## Tech stack

- TypeScript (ES2022), ESM through `tsc`. Video and music also build an IIFE CDN bundle with Vite (`build:iife`).
- Testing: Vitest (unit), Playwright (e2e for video and music). `eslint-plugin` tests with `node --test`.
- Linting and formatting: ESLint with `@antfu/eslint-config` and `@nomercy-entertainment/eslint-plugin-player`, from the root `eslint.config.js`. Tabs, single quotes, semicolons.
- Module type: ESM (`"type": "module"`). npm scope: `@nomercy-entertainment`.

## Rules for every package

- Run `yarn typecheck` and `yarn test` before committing changes.
- Files are camelCase (`playerStorage.ts`), classes and types PascalCase, functions and variables camelCase.
- Tests go in `__tests__/` or next to the source as `*.test.ts`.
- Every plugin uses core's `Plugin` base: `static readonly id`, `use()`, `dispose()`.
- Listeners go through `this.listen()` / `this.on()` (auto-cleaned). Inline arrows are forbidden.
- Timers go through `this.timeout` / `this.interval` (auto-cleared).
- Plugins surface errors only through `this.throw({ ... })`, never `this.player.emit('error', ...)` directly.
- Plugin teardown is enforced by core's leak harness, which runs in CI on every plugin.

## core: `packages/core`

Headless, plugin-driven engine shared by music and video. It carries everything not specific to audio or video: queue, transport, auth, i18n, storage, the plugin system, the typed event bus.

```
src/
  core/            # mixins composed onto per-library player prototypes (queue, transport, time, volume, auth, etc.)
  adapters/        # swappable interfaces + defaults (storage, logger, fetch, realtime, preload, url-resolver, shuffle, ...)
  plugins/         # cross-library plugins (cast-sender, media-session, key-handler, embed, ...)
  types/           # BasePlaylistItem, BasePlayerConfig, BaseEventMap, IPlayer, ...
  testing/         # describePlugin conformance harness
  errors/          # PlayerError hierarchy
  i18n/            # kit's own English bundle
  base-player.ts   # shared base-player composition helper
  index.ts         # public API entry point
```

- Subpath exports for adapters, plugins, streams and testing, all tree-shakable.
- Every method here must be identical in behavior for music and video, with no domain twist. A branch on "is this music or video" means the method belongs in a per-library player class, not here: pull it back down.
- Adapters are interfaces with a default implementation, swappable through `setup()`. No subclassing to override cross-cutting concerns.

## video: `packages/video-player`

Headless, event-driven video player engine. No UI; consumers build their own.

```
src/
  player/       # Core modules (base, playback, volume, subtitles, etc.)
  plugins/      # Plugin system (octopusPlugin, keyHandlerPlugin, etc.)
  types/        # Type definitions per feature
  __tests__/    # Test files (also co-located *.test.ts)
  index.ts      # Public API entry point
```

- This is a headless library. Never add UI elements or DOM manipulation beyond the video element.
- `addSubtitleTrack()` / `removeSubtitleTrack()` (runtime sidecar subtitle injection, for example for a search-and-download-subtitles feature) are implemented once in core's `media-tracks.ts` mixin alongside `subtitle()`. They emit the core `'subtitles'` event on change; `DesktopUiPlugin` listens for it (`domMethods.ts`) to refresh button visibility and repaint an open subtitles pane live, with no reload.
- `DesktopUiOptions.subtitleMenuActions` (consumer action rows appended to the native subtitles sub-menu, for example a "Search subtitles online…" entry that opens the consumer's own dialog) is a `desktop-ui` plugin concern, not a player primitive. The player has no opinion on what the action does: it only renders the row and forwards the click through `onSelect(player)`. Rows use plain button/menuitem semantics (`.language-button.menu-action-row`, no `role="switch"` or `aria-checked`). Never reuse `settingsItems`' toggle-row shape for an action that isn't a boolean state. `refreshCapabilityVisibility()` (`transportStateMethods.ts`) treats a non-empty `subtitleMenuActions` the same as "has tracks" for the subtitles button and category gating, so the row stays reachable at zero tracks. A live `.options({ subtitleMenuActions: [...] })` call re-triggers that gate through the plugin's own `opts:changed` handler (`domMethods.ts`).
- Casting and device-switch orchestration is a consumer concern, never a player concern. The cast affordance (a top-bar button, `DesktopUiButtonOptions.cast`, default off) is the player's. Clicking it only emits the bare `'cast'` player event (`VideoEventMap`, `types.ts`). It never calls `CastSenderPlugin` or `session.loadMedia()`. The consumer's own `on('cast', ...)` listener owns the device picker and the server-orchestrated handoff (`VideoHub.ChangeDeviceCommand` + `WakeForVideo`, in app-web's Sidebar/DeviceOverlay). `DesktopUiOptions.settingsMenuActions` is the separate, still-live extension point for an arbitrary consumer action row in the settings menu; the top-bar button doesn't replace it.
- All player features are exposed through events. New functionality must emit events.
- The public API is exported from `src/index.ts`. Don't export internal modules directly.
- `playSegment` / `clearSegment` (bounded time-window playback with loop, hold and advance) stay video-only: they model disc-menu state windows and chapter-range or intro-loop playback, concepts with no music analogue. Music's `repeatState('one')` already covers whole-track looping.

## music: `packages/music-player`

Headless, plugin-driven, event-driven music player engine, built on core.

```
src/
  adapters/
    audio-backend/   # IAudioBackend + audio-element + webaudio impls
  player/
    *.ts             # mixins composed onto NMMusicPlayer prototype
  plugins/           # auto-advance, equalizer, spectrum, lyrics, + re-exports
  streams/           # re-exports of the kit's streams/ for ergonomic imports
  types.ts           # MusicEventMap, MusicPlayerConfig, enums
  index.ts           # nmplayer factory (default export) + NMMusicPlayer class
```

- Files: camelCase (`audioElementBackend.ts`). Subpath exports for plugins, backends and streams, all tree-shakable.
- Headless. No UI in core. UI is a plugin concern.
- Every feature beyond raw transport is a plugin.
- Artwork reads `item.image` first (the cross-library canonical field on `BasePlaylistItem`), `item.cover` as a fallback. `cover` stays on `MusicPlaylistItem` for existing consumers but is legacy; new code populates `image`.
- **Method shape:** stateful = overloaded function (`volume()` reads, `volume(v)` writes). Action = verb. State = enum-returning function (`playState()` returns `PlayState`).
- **Position is set through `currentTime(t)`.** No `seek(t)` method.
- **Queue API delegates to `MediaList<T>` in core.** `queue()`, `queueAppend`, `queuePrepend`, `queueInsert`, `queueRemove`, `queueRemoveAt`, `queueMove`, `queueClear`, `queueShuffle`, `queueSort`, `peekNext`, `peekPrevious`.
- **Error categories:** stream(01), media(02), auth(03), network(04), drm(05), cue(06), policy(07), resource(08), player(09, collapsed lifecycle and state), plugin(10), mediasession(11), visualization(12).
- **Decode errors split:** `media/decode-fatal-variant` (try next rendition) vs `media/decode-fatal-all` (no fallback).
- **401 vs 403 are never conflated.** 401 may refresh and retry once. 403 propagates immediately.
- **Visualization architecture:** three layers. Layer 1 (`SpectrumAnalyzer` data source through events), Layer 2 (`VisualizationPlugin` canvas convenience), Layer 3 (render-lib bridges, separate packages).
- **Embed context:** `embedPlugin` (in core) handles iframe postMessage. It does NOT touch MediaSession; each frame owns its own.
- **iframe `allow` directive:** `autoplay` is load-bearing for OS-level controls.

## media-session: `packages/media-session`

Thin wrapper around the browser Media Session API. No dependency on the trio.

## eslint-plugin: `packages/eslint-plugin`

The player ESLint rules (`player/*`), in plain JavaScript. Each rule has a `node --test` spec in `tests/`.
