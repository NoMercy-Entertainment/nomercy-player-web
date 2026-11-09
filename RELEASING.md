# Releasing

Each package releases on its own version from this repository.

## How a release works

1. Bump `version` in `packages/<dir>/package.json` and add a `CHANGELOG.md` entry.
2. Push to `master`. A push never publishes.
3. Create a GitHub release tagged `<short>-v<semver>`. `<short>` is `core`, `video`, `music`, `media-session` or `eslint-plugin`, for example `core-v2.6.1`.
4. `.github/workflows/publish.yml` checks the tag against `package.json`, runs the gates, packs with `yarn pack` (which rewrites `workspace:*` to the exact version), and publishes with npm provenance on a GitHub-hosted runner.

A manual run of `publish.yml` with `dry_run` stops before `npm publish`. A prerelease version (one with a `-`) publishes under the `rc` dist-tag; any other version publishes under `latest`.

To withdraw a release, run `.github/workflows/retract.yml`.

## Order across packages

Video and music depend on an exact core version. When core changes, release core first and confirm it is on npm; the publish workflow refuses a video or music release whose core version is not there yet. `core`, `video` and `music` follow this order.

## What each package ships

- `core`: ESM from `tsc` plus `scripts/`, which video and music run at build time.
- `video` and `music`: ESM from `tsc` plus a CDN bundle, `dist/*.iife.js`, from Vite (`vite.iife.config.ts`). `yarn build` wipes `dist/`, so `build:iife` runs after it; `build:all` does both.
- Every package gets `LICENSE`, and the trio also gets the contributor documents from the repository root. `scripts/pack-files.mjs` copies them in while packing and removes them afterward.
