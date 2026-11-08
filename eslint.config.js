import js from '@eslint/js'
import globals from 'globals'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  {
    ignores: [
      'dist/**',
      'build/**',
      '.vite/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'src/tests/**',
      'src/**/__tests__/**',
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      '*.d.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      ...reactHooks.configs.recommended.rules,
    },
  },
]
