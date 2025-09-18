module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Regras básicas para Node.js
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    'no-console': 'off', // Permitir console.log em desenvolvimento
    'no-debugger': 'error',
    'no-undef': 'error',
    'no-case-declarations': 'off', // Permitir declarações em case
    'no-empty': 'off', // Permitir blocos vazios
    'prefer-const': 'warn',
    'no-var': 'warn'
  },
  // Ignorar arquivos de script e utilitários
  ignorePatterns: [
    'scripts/**/*',
    'node_modules/**/*',
    'prisma/**/*',
    '*.config.js'
  ]
};
