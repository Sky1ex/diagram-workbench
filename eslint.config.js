import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
	globalIgnores(['dist']),
	{
		files: ['**/*.{js,jsx}'],
		extends: [
			js.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite
		],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: 'module',
			globals: globals.browser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				}
			}
		},
		rules: {
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/refs': 'off',
			'react-refresh/only-export-components': 'off'
		}
	},
	{
		files: ['vite.config.js', 'scripts/**/*.mjs'],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: 'module',
			globals: globals.node
		}
	},
	{
		files: ['src/@threeJs/**/*.{js,jsx}'],
		rules: {
			'react-hooks/immutability': 'off'
		}
	}
]);
