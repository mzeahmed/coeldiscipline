// Module boundaries: see docs/decisions/0001-architecture.md.
const fs = require('fs');
const path = require('path');

const modules = fs.readdirSync(path.join(__dirname, 'src/modules'));

const restrictImports = (...patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

// One convention: relative inside a module, `@/` alias across modules.
const ownModule = name => ({
  group: [`@/modules/${name}/**`],
  message: 'Use relative imports inside a module.',
});

const domainIndependence = {
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
  message: 'The domain must stay independent of frameworks and outer layers.',
};

module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
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
    // An override replaces the rule options, so each one lists all its patterns.
    ...modules.flatMap(name => [
      {
        files: [`src/modules/${name}/**`],
        rules: restrictImports(ownModule(name)),
      },
      {
        files: [`src/modules/${name}/domain/**`],
        rules: restrictImports(ownModule(name), domainIndependence),
      },
    ]),
  ],
};
