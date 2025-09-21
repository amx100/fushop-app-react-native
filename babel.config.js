module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta calls to avoid errors
      [
        '@babel/plugin-transform-modules-commonjs',
        {
          allowTopLevelThis: true,
        },
      ],
      // Keep the reanimated plugin if it exists
      'react-native-reanimated/plugin',
    ].filter(Boolean),
  };
};
