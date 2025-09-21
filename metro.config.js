const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add custom transformer to handle import.meta
config.transformer = {
  ...config.transformer,
  babelTransformerPath: path.resolve(__dirname, 'metro-transformer.js'),
};

// Add resolver configuration for Node.js polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  // Polyfill Node.js modules for React Native
  stream: require.resolve('stream-browserify'),
  util: require.resolve('util'),
  crypto: require.resolve('expo-crypto'),
  buffer: require.resolve('buffer'),
  // Replace ws library with our custom mock for React Native compatibility
  ws: path.resolve(__dirname, 'ws-mock.js'),
  // Additional Node.js polyfills
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  os: require.resolve('os-browserify/browser'),
  url: require.resolve('url'),
  path: require.resolve('path-browserify'),
  fs: false,
  net: false,
  tls: false,
};

// Add platform extensions for better resolution
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Configure metro to handle more file types
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'bin',
  'txt',
  'jpg',
  'png',
  'json',
];

// Handle source maps for better debugging
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'jsx',
  'js',
  'ts',
  'tsx',
  'json',
];

// Add resolver options to handle node modules better
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add custom resolver function to handle ws module specifically
const originalResolver = config.resolver.resolverMainFields;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      filePath: path.resolve(__dirname, 'ws-mock.js'),
      type: 'sourceFile',
    };
  }
  
  // Use default resolver for other modules
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
