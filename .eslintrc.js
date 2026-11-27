// Module boundaries: see docs/decisions/0001-architecture.md.
const moduleInternals = {
  group: ['@/modules/*/*'],
  message: 'Import another module through its index only.',
};

const restrictImports = (...patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    ...restrictImports(moduleInternals),
    curly: ['error', 'all'],
    // Blank line after control blocks and before `return`.
    'padding-line-between-statements': [
      'error',
      {
        blankLine: 'always',
        prev: ['if', 'for', 'while', 'do', 'switch', 'try'],
        next: '*',
      },
      { blankLine: 'always', prev: '*', next: 'return' },
    ],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: { '@typescript-eslint/no-explicit-any': 'error' },
    },
    {
      files: ['src/shared/**'],
      rules: restrictImports({
        group: ['@/modules/**', '@/navigation/**'],
        message: 'shared must not depend on modules or navigation.',
      }),
    },
    {
      files: ['src/modules/*/domain/**'],
      rules: restrictImports(moduleInternals, {
        group: [
          'react',
          'react-native*',
          '@react-native*',
          '@react-navigation/*',
          '@op-engineering/*',
          '**/application/**',
          '**/data/**',
          '**/screens/**',
          '**/components/**',
        ],
        message:
          'The domain must stay independent of frameworks and outer layers.',
      }),
    },
  ],
};
