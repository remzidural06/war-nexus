/**
 * Auth servisi — giriş, çıkış, kullanıcı durumu.
 */
import { auth, firestore, db } from './firebase';
import type { FirebaseAuthTypes } from './firebase';
const WEB_CLIENT_ID = '669522610182-lavj7r2sn8cmp3bpebfqki5ecdgp424m.apps.googleusercontent.com';

export type AuthUser = FirebaseAuthTypes.User;

/** Anonim giriş — hesap oluşturmadan hemen oynasın */
export async function signInAnonymous(): Promise<AuthUser> {
  const credential = await auth().signInAnonymously();
  if (!credential.user) throw new Error('Anonymous sign-in failed');
  await ensurePlayerProfile(credential.user);
  return credential.user;
}

/** Google ile giriş (v16 Credential Manager API) */
export async function signInWithGoogle(): Promise<AuthUser> {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // v16: signIn yerine addScopes veya doğrudan signIn — ama "current activity null"
  // sorunu için önce mevcut oturumu kontrol et
  try {
    await GoogleSignin.signOut(); // stale session temizle
  } catch (_) {}

  const response = await GoogleSignin.signIn();
  const idToken = response?.data?.idToken
    ?? (response as any)?.idToken
    ?? (response as any)?.user?.idToken;
  if (!idToken) throw new Error('Google sign-in failed: no idToken');
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const userCredential = await auth().signInWithCredential(googleCredential);
  if (!userCredential.user) throw new Error('Firebase sign-in failed');
  const snap = await db.players().doc(userCredential.user.uid).get();
  if (snap.exists) {
    await db.players().doc(userCredential.user.uid).update({ lastOnline: firestore.FieldValue.serverTimestamp() });
  }
  return userCredential.user;
}

/** Email ile kayıt ol */
export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser> {
  const credential = await auth().createUserWithEmailAndPassword(email, password);
  if (!credential.user) throw new Error('Kayıt başarısız');
  if (displayName) {
    await credential.user.updateProfile({ displayName });
  }
  await ensurePlayerProfile(credential.user, displayName);
  return credential.user;
}

/** Email ile giriş yap */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  if (!credential.user) throw new Error('Giriş başarısız');
  await ensurePlayerProfile(credential.user);
  return credential.user;
}

/** Oyuncunun profili var mı kontrol et */
export async function hasPlayerProfile(uid: string): Promise<boolean> {
  const snap = await db.players().doc(uid).get();
  return snap.exists;
}

/** Oyuncu admin mi kontrol et */
export async function checkIsAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await db.players().doc(uid).get();
    return snap.exists && snap.data()?.isAdmin === true;
  } catch { return false; }
}

/** Kullanıcı adını güncelle (1 ayda 1 kez) */
export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  const user = auth().currentUser;
  if (user) await user.updateProfile({ displayName });
  await db.players().doc(uid).set({
    displayName,
    nameChangedAt: Date.now(),
    lastOnline: firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

/** Oyuncunun koordinatını getir */
export async function getPlayerCoordinate(uid: string): Promise<string> {
  try {
    const snap = await db.players().doc(uid).get();
    if (snap.exists) {
      const data = snap.data() as any;
      if (data?.coordinate) return data.coordinate;
    }
    // Koordinat yoksa oluştur
    const coord = generateCoordinate();
    await db.players().doc(uid).set({ coordinate: coord }, { merge: true });
    return coord;
  } catch {
    return '0.0.0';
  }
}

/** İsim değiştirme kontrolü — son değişiklikten 30 gün geçmeli */
export async function canChangeName(uid: string): Promise<{ allowed: boolean; remainingDays: number }> {
  try {
    const snap = await db.players().doc(uid).get();
    if (!snap.exists) return { allowed: true, remainingDays: 0 };
    const data = snap.data() as any;
    const changedAt = data?.nameChangedAt ?? 0;
    if (changedAt === 0) return { allowed: true, remainingDays: 0 };
    const daysPassed = (Date.now() - changedAt) / (1000 * 60 * 60 * 24);
    if (daysPassed >= 30) return { allowed: true, remainingDays: 0 };
    return { allowed: false, remainingDays: Math.ceil(30 - daysPassed) };
  } catch {
    return { allowed: true, remainingDays: 0 };
  }
}

/** Çıkış */
export async function signOut(): Promise<void> {
  // Local storage temizle — yeni kullanıcıya eski veri geçmesin
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('war-nexus/v1');
  } catch {}
  try { (globalThis as any).localStorage?.removeItem('war-nexus/v1'); } catch {}
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {}
  await auth().signOut();
}

/** Mevcut kullanıcı (null = giriş yapılmamış) */
export function getCurrentUser(): AuthUser | null {
  return auth().currentUser;
}

/** Auth state değişikliklerini dinle */
export function onAuthStateChanged(
  callback: (user: AuthUser | null) => void,
): () => void {
  return auth().onAuthStateChanged(callback);
}

/** Oyuncu profili yoksa oluştur (Firestore players/{uid}) */
/** Rastgele X.Y.Z koordinatı üret */
function generateCoordinate(): string {
  const x = Math.floor(Math.random() * 9) + 1;
  const y = Math.floor(Math.random() * 9) + 1;
  const z = Math.floor(Math.random() * 9) + 1;
  return `${x}.${y}.${z}`;
}

export async function ensurePlayerProfilePublic(uid: string, displayName: string): Promise<void> {
  const ref = db.players().doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      displayName,
      coordinate: generateCoordinate(),
      allianceId: null, allianceTag: null, warPower: 0, hqLevel: 1,
      wins: 0, losses: 0, shieldUntil: 0,
      lastOnline: firestore.FieldValue.serverTimestamp(),
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function ensurePlayerProfile(user: AuthUser, customName?: string): Promise<void> {
  const ref = db.players().doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      displayName: customName || user.displayName || `Komutan_${user.uid.slice(0, 6)}`,
      coordinate: generateCoordinate(),
      allianceId: null,
      allianceTag: null,
      warPower: 0,
      hqLevel: 1,
      wins: 0,
      losses: 0,
      shieldUntil: 0,
      lastOnline: firestore.FieldValue.serverTimestamp(),
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await ref.update({ lastOnline: firestore.FieldValue.serverTimestamp() });
  }
}
