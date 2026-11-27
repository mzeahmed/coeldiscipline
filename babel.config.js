module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Same `@/` alias as tsconfig.json, for Metro and Jest.
  plugins: [['module-resolver', { alias: { '@': './src' } }]],
};
