import antfu from '@antfu/eslint-config';
import player from '@nomercy-entertainment/eslint-plugin-player';
import pluginStylistic from '@stylistic/eslint-plugin';

import { arrowTernaryBody } from './config/eslint-rules/arrow-ternary-body.ts';
import { bodyShape } from './config/eslint-rules/body-shape.ts';
import { maxCallNesting } from './config/eslint-rules/max-call-nesting.ts';
import { membersPerLine } from './config/eslint-rules/members-per-line.ts';
import { trailingArrowArgument } from './config/eslint-rules/trailing-arrow-argument.ts';

const TRIO_SOURCE = 'packages/{core,video-player,music-player}/src/**/*.ts';
const TRIO_TESTS = [
  'packages/{core,video-player,music-player}/src/**/*.test.ts',
  'packages/{core,video-player,music-player}/src/__tests__/**/*.ts',
];

// Layout rules copied from nomzbot dashboard/eslint.config.ts (app/format, app/blank-lines, app/layout).
const LAYOUT_FILES = ['packages/*/{src,e2e,scripts}/**/*.{ts,js,mjs}', 'config/**/*.ts', 'scripts/**/*.mjs'];

const app = {
  rules: {
    'arrow-ternary-body': arrowTernaryBody,
    'body-shape': bodyShape,
    'max-call-nesting': maxCallNesting,
    'members-per-line': membersPerLine,
    'trailing-arrow-argument': trailingArrowArgument,
  },
};

// antfu registers the stylistic plugin as `style`, so the preset keys are renamed to match.
const nomzbotFormat = Object.fromEntries(
  Object.entries(pluginStylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    commaDangle: 'always-multiline',
    braceStyle: '1tbs',
    arrowParens: true,
    quoteProps: 'as-needed',
    jsx: false,
  }).rules).map(([name, value]) => [name.replace(/^@stylistic\//, 'style/'), value]),
);

export default antfu({
  ignores: [
    '**/README.md',
    '**/CHANGELOG.md',
    'packages/video-player/wiki/**',
    'packages/video-player/public/js/**',
    '.github/**',
    // Loading this file through itself rebuilds the whole config cache on every save.
    'eslint.config.js',
  ],
  typescript: {
    overrides: {
      'no-nested-ternary': 'error',
      'no-extend-native': 'off',
      'ts/method-signature-style': 'off',
      'unused-imports/no-unused-vars': 'error',
      // Mutual-closure patterns (cleanup and handler const arrows) are safe at runtime.
      'ts/no-use-before-define': ['error', {
        classes: false,
        functions: false,
        variables: false,
      }],
      // Conflicts with noPropertyAccessFromIndexSignature: its autofix breaks the build.
      'dot-notation': 'off',
    },
  },
  test: {
    overrides: {
      'test/prefer-lowercase-title': 'off',
      // Tests use compact one-statement hooks and try blocks by convention.
      'style/max-statements-per-line': 'off',
      // Setter-only mixin objects test mixin composition.
      'accessor-pairs': 'off',
      // Mock constructors need `function` and a captured `this`.
      'prefer-arrow-callback': 'off',
      'ts/no-this-alias': 'off',
    },
  },
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: true,
  },
  formatters: {
    css: true,
    html: true,
    markdown: true,
    svg: false,
  },
}, {
  name: 'player/nomzbot-format',
  rules: {
    ...nomzbotFormat,
    'no-nested-ternary': 'error',
    'style/newline-per-chained-call': ['error', { ignoreChainWithDepth: 2 }],
    'style/object-curly-newline': ['error', {
      ObjectExpression: {
        multiline: true,
        minProperties: 2,
        consistent: true,
      },
      ObjectPattern: {
        multiline: true,
        minProperties: 4,
        consistent: true,
      },
      ImportDeclaration: {
        multiline: true,
        minProperties: 4,
        consistent: true,
      },
      ExportDeclaration: {
        multiline: true,
        minProperties: 4,
        consistent: true,
      },
    }],
    'style/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
    'style/function-paren-newline': ['error', 'multiline-arguments'],
    'style/array-element-newline': ['error', 'consistent'],
    'style/array-bracket-newline': ['error', 'consistent'],
    // nomzbot: error at 100. 529 lines have no autofix (core 316, video 139, music 67, plugin 7); Arc decides.
    'style/max-len': ['off', {
      code: 100,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
      ignoreComments: true,
    }],
    // 180 one-line `{ a; b; }` bodies and `if (x) return;` pairs with no autofix; Arc decides.
    'style/max-statements-per-line': 'off',
  },
}, {
  // A blank line sets apart each group of statements; `eslint --fix` adds them.
  name: 'player/nomzbot-blank-lines',
  files: LAYOUT_FILES,
  rules: {
    'style/padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: ['const', 'let'], next: '*' },
      { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
      { blankLine: 'always', prev: 'multiline-block-like', next: '*' },
      { blankLine: 'always', prev: '*', next: 'multiline-block-like' },
      { blankLine: 'always', prev: 'multiline-expression', next: '*' },
      { blankLine: 'always', prev: '*', next: 'multiline-expression' },
      { blankLine: 'always', prev: 'import', next: '*' },
      { blankLine: 'any', prev: 'import', next: 'import' },
      { blankLine: 'always', prev: '*', next: ['function', 'class', 'export'] },
      { blankLine: 'any', prev: 'export', next: 'export' },
      { blankLine: 'always', prev: ['function-overload', 'multiline-export'], next: '*' },
      { blankLine: 'always', prev: '*', next: ['function-overload', 'multiline-export'] },
      { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'do', 'switch', 'try'] },
      { blankLine: 'always', prev: ['if', 'for', 'while', 'do', 'switch', 'try'], next: '*' },
    ],
  },
}, {
  // A ternary puts `? a` and `: b` on their own lines; an if body is a bare exit, a value on the next line, or a block.
  name: 'player/nomzbot-layout',
  files: LAYOUT_FILES,
  plugins: { app },
  rules: {
    'style/multiline-ternary': ['error', 'always'],
    'style/operator-linebreak': ['error', null, { overrides: { '?': 'before', ':': 'before' } }],
    'style/indent': ['error', 2, { offsetTernaryExpressions: true }],
    'app/arrow-ternary-body': 'error',
    'app/body-shape': 'error',
    'app/trailing-arrow-argument': 'error',
    // 40 calls nest 3 deep; naming the inner steps is a refactor, not layout. Arc decides.
    'app/max-call-nesting': 'off',
    'app/members-per-line': 'error',
  },
}, {
  // Tab characters inside comment and template-string content, 101 places in 4 files.
  files: [
    'packages/core/src/adapters/quality/hdr-policy.ts',
    'packages/core/src/core/plugin/fetch.ts',
    'packages/video-player/src/plugins/twitch/{clip,stream}.ts',
    'packages/video-player/src/plugins/desktop-ui/styles.css',
  ],
  rules: { 'style/no-tabs': 'off' },
}, {
  // Oscillates against style/newline-per-chained-call, which is the project rule.
  rules: {
    'antfu/consistent-chaining': 'off',
    // Fights app/body-shape: a bare exit stays on the if line.
    'antfu/if-newline': 'off',
  },
}, {
  // One-line stubs and `{ void expr; }` bodies, 105 places with no autofix; Phase 2 decides.
  files: ['packages/{video-player,music-player}/src/**/*.ts'],
  rules: { 'style/max-statements-per-line': 'off' },
}, {
  files: ['packages/*/src/__tests__/**/*.ts'],
  rules: {
    'style/newline-per-chained-call': 'off',
    'style/object-curly-newline': 'off',
  },
}, {
  files: ['packages/*/scripts/**/*.{js,mjs}', 'config/**/*.ts', 'packages/*/*.config.ts', 'scripts/**/*.mjs'],
  rules: {
    'node/prefer-global/process': 'off',
    'no-console': 'off',
  },
}, {
  files: [TRIO_SOURCE],
  plugins: { player },
  rules: {
    'player/no-single-letter-ident': 'error',
    'player/no-compat-vocab': 'error',
    'player/no-history-comments': 'error',
    'player/no-object-literal-cast': 'error',
    'player/no-unknown-cast': 'error',
    'player/no-raw-player-bus': 'error',
    'player/no-raw-timers-in-plugin': 'error',
    'player/no-raw-throw-in-plugin': 'error',
    'player/no-raw-fetch-in-plugin': 'error',
    'player/plugin-id-required': 'error',
  },
}, {
  // Fixtures cast mocks and use raw timers, errors and ad-hoc plugin classes on purpose.
  files: TRIO_TESTS,
  rules: {
    'player/no-object-literal-cast': 'off',
    'player/no-unknown-cast': 'off',
    'player/no-raw-throw-in-plugin': 'off',
    'player/no-raw-timers-in-plugin': 'off',
    'player/no-raw-player-bus': 'off',
    'player/no-raw-fetch-in-plugin': 'off',
    'player/plugin-id-required': 'off',
  },
}, {
  // The v1 shim exists to carry real @deprecated JSDoc for v1 callers.
  files: ['packages/{video-player,music-player}/src/plugins/v1-compat.ts'],
  rules: { 'player/no-compat-vocab': 'off' },
}, {
  // Its tests assign to `global` and suppress types to build the MediaSession fakes.
  files: ['packages/media-session/src/*.test.ts'],
  rules: {
    'no-restricted-globals': 'off',
    'ts/ban-ts-comment': 'off',
  },
}, {
  // This package tests with node:test; the plugin must not depend on vitest.
  files: ['packages/eslint-plugin/**/*.js'],
  rules: { 'test/no-import-node-test': 'off' },
}, {
  // The logger is the one place that calls console directly.
  files: ['packages/core/src/adapters/logger/default.ts'],
  rules: { 'no-console': 'off' },
});
