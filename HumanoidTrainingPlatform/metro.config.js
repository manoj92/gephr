const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simplify the configuration for basic build
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;