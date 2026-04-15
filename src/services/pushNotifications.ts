/**
 * Push Notification Service — FCM token yönetimi
 * Uygulama açılınca token alınır, Firestore'a kaydedilir.
 * Uygulama ön planda iken gelen bildirimler handle edilir.
 */
import { Platform } from 'react-native';
import { db } from './firebase';

/** FCM token al ve Firestore'a kaydet */
export async function registerFCMToken(uid: string): Promise<void> {
  if (Platform.OS === 'web') return; // Web'de FCM yok

  try {
    const messaging = require('@react-native-firebase/messaging').default;

    // İzin iste (iOS için zorunlu, Android 13+ için gerekli)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.warn('[FCM] Permission denied');
      return;
    }

    // Token al
    const token = await messaging().getToken();
    if (!token) return;

    // Cloud Function üzerinden kaydet (Firestore write takılmasını bypass eder)
    const CF_BASE = 'https://us-central1-war-nexus-dae64.cloudfunctions.net';
    fetch(`${CF_BASE}/saveFCMToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token }),
    }).catch(() => {
      // Fallback: doğrudan Firestore
      db.players().doc(uid).set({ fcmToken: token }, { merge: true }).catch(() => {});
    });

    // Token yenilendiğinde güncelle
    messaging().onTokenRefresh((newToken: string) => {
      fetch(`${CF_BASE}/saveFCMToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token: newToken }),
      }).catch(() => {});
    });
  } catch (err: any) {
    console.warn('[FCM] Registration error:', err?.message);
  }
}

/** Foreground mesaj dinleyici — uygulama açıkken bildirim gelirse */
export function setupForegroundListener(onMessage: (title: string, body: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};

  try {
    const messaging = require('@react-native-firebase/messaging').default;
    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
      const title = remoteMessage?.notification?.title ?? '';
      const body = remoteMessage?.notification?.body ?? '';
      if (title || body) onMessage(title, body);
    });
    return unsubscribe;
  } catch {
    return () => {};
  }
}
