# Contributing

Thanks for your interest in the NoMercy web player packages. The [README](./README.md) explains the layout and the daily commands.

## Reporting issues

- Bug? File a [GitHub issue](https://github.com/NoMercy-Entertainment/nomercy-player-web/issues) with a minimal reproduction. Include the package, its version, the browser, and a stack trace if you have one.
- Security? Do not file a public issue. See [SECURITY.md](./SECURITY.md).
- Question? The full docs live at [docs.nomercy.tv/player/](https://docs.nomercy.tv/player/).

## Local development

```bash
git clone https://github.com/NoMercy-Entertainment/nomercy-player-web.git
cd nomercy-player-web
corepack enable
yarn install
yarn build
yarn typecheck
yarn lint
yarn test
yarn test:e2e   # video and music; generates its fixtures with the NoMercy ffmpeg fork
```

## Pull requests

- Branch off `master`. Feature branches: `feat/<short-description>`. Fixes: `fix/<short-description>`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`). Imperative, lowercase subject, no trailing period.
- New features need tests. Bug fixes need a regression test.
- Run `yarn lint:fix` before you push. CI rejects lint failures.
- No `Co-Authored-By` trailers unless you paired live.

## Plugin contributions

Built-in plugins live in `packages/<package>/src/plugins/`. Most plugins belong in consumer packages, not in the kit. The kit ships only plugins that are universal (event bus, logger, retry policy). A domain-specific plugin (a scrobbler, a custom DRM) belongs in its own package.

If you would like to host a domain-specific plugin alongside the kit, open a discussion first.

## Releases

See [RELEASING.md](./RELEASING.md).
