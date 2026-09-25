/**
 * Repo-wide ESLint configuration.
 *
 * The workspaces invoke `eslint src --ext .ts,.tsx`, which is the eslintrc
 * style, so this stays a `.eslintrc` file rather than a flat config.
 *
 * `parserOptions.project` is deliberately not set: type-aware rules would need
 * every workspace to build first, and `npm run typecheck` already covers that.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  env: {
    es2022: true,
    node: true,
  },
  rules: {
    // TypeScript already resolves identifiers; `no-undef` produces false
    // positives on type-only references.
    'no-undef': 'off',
    'no-unused-vars': 'off',
    // Dead code is a real backlog in this repo, reported as a warning rather
    // than blocking: `npm run typecheck` is the gate that must stay green.
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
    ],
    // `any` is a legitimate escape hatch in interop code, but it should be a
    // deliberate choice rather than a default.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],
    eqeqeq: ['error', 'smart'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules', '.expo', 'vendor'],
  overrides: [
    {
      // Test files legitimately reach into loose shapes, stub globals, and
      // re-require a module to re-evaluate it under a fresh `jest.resetModules`.
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
