const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const config = {
  transformer: {
    minifierConfig: {
      // Firebase modülleri minification'da bozuluyor — kapalı tut
      compress: false,
      mangle: false,
    },
  },
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // whatwg-url-without-unicode resolver fix
      if (
        moduleName === './lib/URLSearchParams' &&
        context.originModulePath.includes('whatwg-url-without-unicode')
      ) {
        return {
          filePath: path.resolve(
            __dirname,
            'node_modules/whatwg-url-without-unicode/lib/URLSearchParams.js',
          ),
          type: 'sourceFile',
        };
      }
      if (
        moduleName === './lib/URL' &&
        context.originModulePath.includes('whatwg-url-without-unicode')
      ) {
        return {
          filePath: path.resolve(
            __dirname,
            'node_modules/whatwg-url-without-unicode/lib/URL.js',
          ),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
