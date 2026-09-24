import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: {
      prettier,
      'unused-imports': unusedImports
    },
    rules: {
      'prettier/prettier': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'unused-imports/no-unused-imports': 'warn',
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', args: 'after-used' }
      ],
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', args: 'after-used' }
      ],
      'no-console': 'warn',
      'no-restricted-imports': ['error', { patterns: ['@/features/*/*'] }]
    }
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off'
    }
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules',
    'public',
    'next.config.ts'
  ])
);
