import antfu from '@antfu/eslint-config';
import player from '@nomercy-entertainment/eslint-plugin-player';

const TRIO_SOURCE = 'packages/{core,video-player,music-player}/src/**/*.ts';
const TRIO_TESTS = [
	'packages/{core,video-player,music-player}/src/**/*.test.ts',
	'packages/{core,video-player,music-player}/src/__tests__/**/*.ts',
];

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
		indent: 'tab',
		quotes: 'single',
		semi: true,
		overrides: {
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
		},
	},
	formatters: {
		css: true,
		html: true,
		markdown: true,
		svg: false,
	},
}, {
	// Oscillates against style/newline-per-chained-call, which is the project rule.
	rules: { 'antfu/consistent-chaining': 'off' },
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
