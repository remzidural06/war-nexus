import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite plugin: require() → import dönüşümü.
 * React Native'deki require('./image.jpg') çağrılarını
 * Vite'ın anlayacağı import'a çevirir.
 */
function requireToImport(): Plugin {
  return {
    name: 'require-to-import',
    transform(code, id) {
      if (!id.match(/\.(tsx?|jsx?)$/) || id.includes('node_modules')) return null;
      if (!code.includes('require(')) return null;
      // require('./path') ve require('../path') → new URL(path, import.meta.url).href
      const transformed = code.replace(
        /require\((['"])(\.\.?\/[^'"]+\.(?:jpg|jpeg|png|gif|svg|webp))\1\)/g,
        'new URL($1$2$1, import.meta.url).href',
      );
      if (transformed === code) return null;
      return { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  base: '/war-nexus/',
  plugins: [react(), requireToImport()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/web/shims/asyncStorage.ts'),
      '@react-native-firebase/app': path.resolve(__dirname, 'src/web/shims/firebase.ts'),
      '@react-native-firebase/auth': path.resolve(__dirname, 'src/web/shims/firebaseAuth.ts'),
      '@react-native-firebase/firestore': path.resolve(__dirname, 'src/web/shims/firebaseFirestore.ts'),
      '@react-native-google-signin/google-signin': path.resolve(__dirname, 'src/web/shims/googleSignin.ts'),
      'react-native-safe-area-context': path.resolve(__dirname, 'src/web/shims/safeArea.ts'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
  },
  define: {
    __DEV__: JSON.stringify(false),
    'global': 'globalThis',
  },
});
