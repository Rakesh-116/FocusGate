/* Exclude incompatible native modules from React Native autolinking in this monorepo. */
module.exports = {
  project: {
    android: {
      sourceDir: './packages/mobile/android',
      packageName: 'com.anonymous.mobile',
    },
  },
  dependencies: {
    'react-native-mmkv': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
}
