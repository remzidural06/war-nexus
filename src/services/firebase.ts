/**
 * Firebase initialization — tüm Firebase import'ları bu dosyadan geçer.
 * Diğer dosyalar doğrudan @react-native-firebase import etmez.
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export { auth, firestore };
export type { FirebaseAuthTypes, FirebaseFirestoreTypes };

/** Firestore koleksiyon referansları */
export const db = {
  players: () => firestore().collection('players'),
  playerBases: () => firestore().collection('playerBases'),
  marches: () => firestore().collection('marches'),
  alliances: () => firestore().collection('alliances'),
  allianceMembers: (allianceId: string) => firestore().collection('alliances').doc(allianceId).collection('members'),
  allianceMessages: (allianceId: string) => firestore().collection('alliances').doc(allianceId).collection('messages'),
  allianceRequests: (allianceId: string) => firestore().collection('alliances').doc(allianceId).collection('joinRequests'),
  battleReports: () => firestore().collection('battleReports'),
  leaderboard: () => firestore().collection('leaderboard'),
  globalChat: () => firestore().collection('globalChat'),
  directMessages: () => firestore().collection('directMessages'),
  dmMessages: (conversationId: string) => firestore().collection('directMessages').doc(conversationId).collection('messages'),
};

/** Cloud Functions base URL */
export const CF_BASE = 'https://us-central1-war-nexus-dae64.cloudfunctions.net';
