module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    semi: [2, 'never'],
    'arrow-parens': [2, 'as-needed'],
    'object-curly-newline': ['error', {
      ObjectExpression: { multiline: true },
      ObjectPattern: { multiline: true },
      ImportDeclaration: 'always',
      ExportDeclaration: 'always',
    }],
    'no-continue': 0,
    'no-restricted-syntax': 0,
    'no-labels': 0,
  },
}
