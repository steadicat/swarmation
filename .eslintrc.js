module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier/@typescript-eslint',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    'import/no-unresolved': 'off',

    'func-style': ['warn', 'declaration', {allowArrowFunctions: true}],
    'prefer-template': 'warn',

    'import/order': [
      'warn',
      {
        groups: [['builtin', 'external'], ['parent', 'sibling', 'index'], 'unknown'],
        pathGroups: [
          {
            pattern: './**/*.svelte',
            group: 'sibling',
            position: 'after',
          },
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
  },
};
