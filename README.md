# NoMercy Player Web

Headless web players for video and music, built on one shared engine. They give you playback, a queue, subtitles, crossfade, a typed event bus and a plugin system. They draw no interface of their own unless you add a plugin that does.

This repository holds five packages. Each one publishes to npm on its own.

| Package | What it is | npm |
| --- | --- | --- |
| [`nomercy-player-core`](packages/core) | The headless engine: queue, transport, plugin system, event bus, adapters. | [![npm](https://img.shields.io/npm/v/@nomercy-entertainment/nomercy-player-core)](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-player-core) |
| [`nomercy-video-player`](packages/video-player) | The video player: HLS, VTT, ASS and SSA subtitles, chapters, Chromecast, keyboard and touch input. | [![npm](https://img.shields.io/npm/v/@nomercy-entertainment/nomercy-video-player)](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-video-player) |
| [`nomercy-music-player`](packages/music-player) | The music player: crossfade, gapless playback, equalizer, synced lyrics. | [![npm](https://img.shields.io/npm/v/@nomercy-entertainment/nomercy-music-player)](https://www.npmjs.com/package/@nomercy-entertainment/nomercy-music-player) |
| [`media-session`](packages/media-session) | A wrapper for the browser Media Session API. | [![npm](https://img.shields.io/npm/v/@nomercy-entertainment/media-session)](https://www.npmjs.com/package/@nomercy-entertainment/media-session) |
| [`eslint-plugin-player`](packages/eslint-plugin) | The ESLint rules that keep plugin code on the player's safe paths. | [![npm](https://img.shields.io/npm/v/@nomercy-entertainment/eslint-plugin-player)](https://www.npmjs.com/package/@nomercy-entertainment/eslint-plugin-player) |

The video and music players depend on core. Most apps install only one of them.

`packages/test-support` holds test helpers for the other packages. It is private and never published.

## First player

Install the video player. It brings core with it.

```bash
npm install @nomercy-entertainment/nomercy-video-player
```

Create a player in the element with the id `player`, add the built-in controls, and play the first item.

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

The music player has the same shape. See its [README](packages/music-player) for the example.

## Documentation

The full documentation is at [docs.nomercy.tv/player](https://docs.nomercy.tv/player/). Each package has its own section:

- [Core](https://docs.nomercy.tv/nomercy-player-core/)
- [Video player](https://docs.nomercy.tv/nomercy-video-player/)
- [Music player](https://docs.nomercy.tv/nomercy-music-player/)

## Layout

```
config/               shared vitest, vite and playwright presets
scripts/              repository scripts (fixture ffmpeg, pack-time files)
packages/             the five packages, plus private test-support
eslint.config.js      the one ESLint config
tsconfig.base.json    the TypeScript settings every package extends
.github/workflows/    CI, publish and retract
```

A package holds only what is true for that package: its source, its README, CHANGELOG and MIGRATION, and short config files that call the shared presets.

## Install and build

You need Node.js 24 and Corepack.

```bash
git clone https://github.com/NoMercy-Entertainment/nomercy-player-web.git
cd nomercy-player-web
corepack enable
yarn install
```

## Daily commands

Run these from the root.

| Command | What it does |
| --- | --- |
| `yarn build` | Builds every package, core first |
| `yarn build:iife` | Builds the CDN bundles (after `yarn build`) |
| `yarn typecheck` | Builds core, then type-checks every package |
| `yarn lint` | Lints everything. `yarn lint packages/core` lints one package |
| `yarn lint:fix` | Lints and fixes what can be fixed |
| `yarn test` | Runs every unit test |
| `yarn test:e2e` | Runs the browser tests for video and music |

To work on one package, use `yarn workspace <name> run <script>`, for example `yarn workspace @nomercy-entertainment/nomercy-video-player run test:watch`.

Unit tests of video and music read core from its source, so a change across packages is tested together without a build.

## How a change reaches a release

1. Make the change and run the commands above. [CONTRIBUTING.md](CONTRIBUTING.md) has the commit and pull request rules.
2. Push to a branch or to `master`. CI runs for the packages the change touches and the packages that depend on them. A push never publishes.
3. For a release, follow [RELEASING.md](RELEASING.md): bump the version, then create a GitHub release tagged `<package>-v<version>`.

## More

- [CONTRIBUTING.md](CONTRIBUTING.md), [RELEASING.md](RELEASING.md), [TESTING.md](TESTING.md), [SECURITY.md](SECURITY.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- `CLAUDE.md` holds the architecture rules of each package.

## License

[Apache-2.0](LICENSE)
