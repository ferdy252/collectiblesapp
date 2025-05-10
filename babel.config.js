module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Make sure Reanimated plugin is listed first
      'react-native-reanimated/plugin',
      '@babel/plugin-transform-template-literals',
      '@babel/plugin-proposal-export-namespace-from',
    ],
  };
};
