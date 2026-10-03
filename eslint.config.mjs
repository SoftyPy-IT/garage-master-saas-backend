import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default [
  {
    ignores: ['**/node_modules/', '.dist/'],
    languageOptions: {
      globals: {
        ...globals.browser,
        process: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'no-console': 'off',
      'no-undef': 'error',
      '@typescript-eslint/no-explicit-any': false,
    },
  },
]