# eslint-plugin-player

[![npm](https://img.shields.io/npm/v/@nomercy-entertainment/eslint-plugin-player)](https://www.npmjs.com/package/@nomercy-entertainment/eslint-plugin-player)
[![license](https://img.shields.io/npm/l/@nomercy-entertainment/eslint-plugin-player)](https://www.apache.org/licenses/LICENSE-2.0)

ESLint rules for code that builds on the NoMercy players. Use them in a plugin or a player package to keep it on the paths that scope, authenticate and clean up for you.

The player trio (core, video, music) shares one code standard. This plugin makes the mechanical parts of that standard enforceable, so a violation fails lint at write time instead of surfacing in review weeks later. It encodes only the rules that a machine can judge without guessing.

## Install

The plugin needs ESLint 9 or newer and a flat config.

```bash
npm install --save-dev @nomercy-entertainment/eslint-plugin-player
```

## Use

Spread the `recommended` preset into your flat config. It registers the plugin as `player` and turns every rule on at `error`.

```js
// eslint.config.js
import player from '@nomercy-entertainment/eslint-plugin-player';

export default [
  {
    files: ['src/**/*.ts'],
    ...player.configs.recommended,
  },
];
```

Each rule's name starts with `player/`, for example `player/no-raw-fetch-in-plugin`.

## Compatibility

These rules target the v2 player trio (the `2.0.x` line of `nomercy-player-core`, `nomercy-video-player`, and `nomercy-music-player`). This package keeps its own version line rather than matching the trio, because the rules evolve on their own cadence: a version bump here means a rule changed, not that the player did. Pin it independently and read this note for the player line it tracks.

## Rules

Every rule ships in the `recommended` preset at `error`.

| Rule | Catches |
|------|---------|
| `player/no-single-letter-ident` | Single-letter parameter and variable names. Allows `x` `y` `z` (maths) and `i` `j` `k` (loops). Covers interface method signatures and overloads, not just implementations. |
| `player/no-compat-vocab` | The v1 factory names, the `*StateToken` types, the `PlayerCore` class, and compat markers in comments (`@deprecated`, "compatible alias", `v1-compat`). The v2 classes `NMVideoPlayer` and `NMMusicPlayer` stay allowed. |
| `player/no-history-comments` | Bug-number history, spec citations (`§`), and naked `TODO`/`FIXME` with no issue reference. |
| `player/no-object-literal-cast` | `{ ... } as SomeType`. Type the object at construction instead. `as const` is exempt. |
| `player/no-unknown-cast` | `x as unknown as T` with no adjacent comment. A short justification on the same line or the line above keeps a structurally forced cast legal. |
| `player/no-raw-player-bus` | `this.player.on/once/off/emit(...)` inside a plugin. Bypasses scoping and auto-dispose; use the plugin's own `this.on/once/off/emit`. Only fires inside a class that `extends Plugin` — core mixins are untouched. |
| `player/no-raw-timers-in-plugin` | Raw `setTimeout`/`setInterval`/`requestAnimationFrame`/`addEventListener` and `new ResizeObserver`/`MutationObserver`/`IntersectionObserver`/`PerformanceObserver` inside a plugin. No auto-cleanup; use `this.timeout/interval/frame/listen` and `this.lifecycle.observe(new ResizeObserver(...))`. |
| `player/no-raw-throw-in-plugin` | `throw new Error(...)` (and other raw error ctors) inside a plugin. Skips the structured error surface; use `this.throw({...})` or `this.report({...})`. Re-throwing a caught value is allowed. |
| `player/no-raw-fetch-in-plugin` | The global `fetch` (bare, `window.fetch`, `globalThis.fetch`) inside a plugin. Sends no auth and never aborts on dispose; use `this.fetch(url, options?)` which runs the player's auth pipeline and aborts on teardown. A public URL that must not carry auth takes an `eslint-disable` with a reason. |
| `player/plugin-id-required` | A concrete class extending `Plugin` with no own `static id`. Inheriting the base default `'plugin'` collides and breaks storage/mount namespacing. `abstract` intermediate bases are exempt. |

## Relax rules in tests

Test files legitimately cast mocks, throw raw errors, use raw timers and fetch, and build ad-hoc plugin classes. Turn those rules off for them.

```js
{
  files: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
  rules: {
    'player/no-object-literal-cast': 'off',
    'player/no-unknown-cast': 'off',
    'player/no-raw-throw-in-plugin': 'off',
    'player/no-raw-timers-in-plugin': 'off',
    'player/no-raw-player-bus': 'off',
    'player/no-raw-fetch-in-plugin': 'off',
    'player/plugin-id-required': 'off',
  },
}
```

## The boundary rules

`no-raw-player-bus`, `no-raw-timers-in-plugin`, `no-raw-throw-in-plugin`, and `no-raw-fetch-in-plugin` are the mechanical half of the `this`-versus-`this.player` boundary: a plugin extends `this` and reaches the player through `this.player`, but its own lifecycle helpers (`this.on`, `this.timeout`, `this.throw`, `this.fetch`, `this.lifecycle.observe`, ...) are the sanctioned surface because they scope, auth, and auto-clean. Reaching past them to the raw player bus, raw timers or observers, a raw `throw`, or the global `fetch` leaks a listener/observer, drops an error off the structured path, or sends an unauthenticated request that never aborts on teardown. All fire only inside a class that `extends Plugin`, so core mixins — where `this` already *is* the player — never trigger them. A genuinely-needed exception (a third-party emitter that is not an `EventTarget`, a deliberate re-emit of a dynamically-named player event, a public URL that must not carry auth) takes an `eslint-disable-next-line` with a one-line reason, the same escape hatch `no-unknown-cast` uses.

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)

Source: [packages/eslint-plugin in nomercy-player-web](https://github.com/NoMercy-Entertainment/nomercy-player-web/tree/master/packages/eslint-plugin).
