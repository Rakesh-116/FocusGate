/* Exclude incompatible native modules from autolinking in the mobile app. */
module.exports = {
  project: {
    android: {
      sourceDir: './android',
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
