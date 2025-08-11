const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAllowSafeTsTransforms: true,
    },
  }, argv);

  // Customize the config before returning it.
  if (config.mode === 'development') {
    config.devServer = {
      ...config.devServer,
      port: 19006,
    };
  }

  return config;
};