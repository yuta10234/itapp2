const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// React Native環境でNode.jsモジュールを除外
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 問題のあるNode.jsモジュールを無効化
config.resolver.alias = {
  'ws': require.resolve('react-native-url-polyfill/auto'),
  'stream': require.resolve('react-native-url-polyfill/auto'),
  'crypto': require.resolve('react-native-url-polyfill/auto'),
};

// プラットフォーム設定
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config; 