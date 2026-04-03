/**
 * Google Sign-In web shim — signInWithPopup kullanarak
 * @react-native-google-signin API'sine uyumlu şekilde çalışır.
 */
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import app from './firebase';

export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => true,
  signIn: async () => {
    const provider = new GoogleAuthProvider();
    const auth = getAuth(app);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    return { data: { idToken: credential?.idToken ?? null } };
  },
  revokeAccess: async () => {},
  signOut: async () => {},
};
