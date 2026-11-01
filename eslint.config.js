import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.venv/**', '.npm-cache/**', '.tooling-build/**',
    '.agents/**', '.specify/**', 'templates/**', 'skills/**', 'tests/tooling/fixtures/**'] },
  { files: ['**/*.js', '**/*.mjs'], extends: [js.configs.recommended],
    languageOptions: { globals: { process: 'readonly' } } },
  { files: ['**/*.ts'], extends: [js.configs.recommended, tseslint.configs.recommended] },
);
