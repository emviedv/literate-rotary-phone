import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Source files (included in tsconfig.json)
    files: ['core/**/*.ts', 'ui/**/*.ts', 'types/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Disabled because tsconfig handles these
      '@typescript-eslint/no-unused-vars': 'off',

      // Useful rules that complement TypeScript
      'no-console': 'warn',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Test files (not in tsconfig.json, relaxed rules for mocking)
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
      'no-global-assign': 'off',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    ignores: ['dist/', 'build/', 'node_modules/', '*.js', '*.mjs', 'tests/*.mjs', 'tests/*.d.ts'],
  }
);
