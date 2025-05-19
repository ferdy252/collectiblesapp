// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add a resolver to handle Node.js core modules
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules, 
    stream: require.resolve('readable-stream'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    crypto: require.resolve('crypto-browserify'),
    url: require.resolve('url'),
    zlib: require.resolve('browserify-zlib'),
    util: require.resolve('util'),
    assert: require.resolve('assert'),
    events: require.resolve('events'),
    buffer: require.resolve('buffer'),
    net: require.resolve('react-native-tcp-socket'),
    tls: require.resolve('tls-browserify'),
    querystring: require.resolve('querystring-es3'),
    path: require.resolve('path-browserify'),
  },
};

module.exports = config;
