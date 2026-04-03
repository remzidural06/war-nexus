/**
 * Firebase Auth Web shim — @react-native-firebase/auth API'sini
 * gerçek Firebase Web SDK ile sarmalayan uyumluluk katmanı.
 */
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import app from './firebase';

const _auth = getAuth(app);

/** RN Firebase user → Web SDK user'dan uyumlu obje */
function wrapUser(u: any) {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    isAnonymous: u.isAnonymous,
    updateProfile: (data: { displayName?: string; photoURL?: string }) =>
      updateProfile(u, data),
  };
}

const auth = () => ({
  signInAnonymously: async () => {
    const cred = await signInAnonymously(_auth);
    return { user: wrapUser(cred.user) };
  },
  signInWithEmailAndPassword: async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(_auth, email, password);
    return { user: wrapUser(cred.user) };
  },
  createUserWithEmailAndPassword: async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(_auth, email, password);
    return { user: wrapUser(cred.user) };
  },
  signInWithCredential: async (credential: any) => {
    const cred = await signInWithCredential(_auth, credential);
    return { user: wrapUser(cred.user) };
  },
  signOut: () => fbSignOut(_auth),
  onAuthStateChanged: (callback: (user: any) => void) =>
    fbOnAuthStateChanged(_auth, (u) => callback(wrapUser(u))),
  get currentUser() {
    return wrapUser(_auth.currentUser);
  },
});

auth.GoogleAuthProvider = {
  credential: (idToken: string) => GoogleAuthProvider.credential(idToken),
};

export default auth;
export type FirebaseAuthTypes = { User: any };
