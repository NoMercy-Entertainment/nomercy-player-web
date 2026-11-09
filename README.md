# NoMercy Player Web

The web player libraries of NoMercy Entertainment, in one repository. Each package still publishes to npm on its own.

| Package | Folder | What it is |
| --- | --- | --- |
| `@nomercy-entertainment/nomercy-player-core` | `packages/core` | The headless engine and plugin system |
| `@nomercy-entertainment/nomercy-video-player` | `packages/video-player` | The video player |
| `@nomercy-entertainment/nomercy-music-player` | `packages/music-player` | The music player |
| `@nomercy-entertainment/media-session` | `packages/media-session` | Wrapper for the browser Media Session API |
| `@nomercy-entertainment/eslint-plugin-player` | `packages/eslint-plugin` | The player's ESLint rules |

## Layout

```
config/               shared vitest, vite and playwright presets
scripts/              repository scripts (fixture ffmpeg, pack-time files)
packages/             the five packages
eslint.config.js      the one ESLint config
tsconfig.base.json    the TypeScript settings every package extends
.github/workflows/    CI, publish and retract
```

A package holds only what is true for that package: its source, its README, CHANGELOG and MIGRATION, and short config files that call the shared presets.

## Install

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

The layout commit is listed in `.git-blame-ignore-revs`. Run `git config blame.ignoreRevsFile .git-blame-ignore-revs` once so `git blame` skips it. GitHub reads the file by itself.

## How a change reaches a release

1. Make the change and run the commands above. [CONTRIBUTING.md](./CONTRIBUTING.md) has the commit and pull request rules.
2. Push to a branch or to `master`. CI runs for the packages the change touches and the packages that depend on them. A push never publishes.
3. For a release, follow [RELEASING.md](./RELEASING.md): bump the version, then create a GitHub release tagged `<package>-v<version>`.

## More

- [CONTRIBUTING.md](./CONTRIBUTING.md), [RELEASING.md](./RELEASING.md), [TESTING.md](./TESTING.md), [SECURITY.md](./SECURITY.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- `CLAUDE.md` holds the architecture rules of each package.
- Full documentation: [docs.nomercy.tv/player](https://docs.nomercy.tv/player/)
