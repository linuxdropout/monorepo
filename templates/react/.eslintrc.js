const baseConfig = require('../../.eslintrc')

module.exports = {
  ...baseConfig,
  env: { browser: true },
  plugins: [
    'react',
    ...baseConfig.plugins,
  ],
  rules: {
    ...baseConfig.rules,
    'react/jsx-filename-extension': [1, { extensions: ['.tsx', '.ts'] }],
    'import/extensions': [
      2,
      'always',
      {
        json: 'always',
        tsx: 'never',
        jsx: 'never',
        ts: 'never',
        js: 'never',
      },
    ],
  },
}
