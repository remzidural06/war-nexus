/**
 * PvP servisi — oyuncu arama, saldırı başlatma, gelen saldırı dinleme.
 */
import { db, firestore } from './firebase';
import type { PersistedGameState } from '../state/types';

/** PvP hedef bilgisi (public) */
export interface PvPTarget {
  uid: string;
  displayName: string;
  allianceTag: string | null;
  warPower: number;
  hqLevel: number;
  wins: number;
  shieldUntil: number;
}

/** Firestore march dokümanı */
export interface FirestoreMarch {
  id: string;
  attackerUid: string;
  attackerName: string;
  defenderUid: string;
  defenderName: string;
  marchUnits: { unitId: string; count: number; buildingId: string }[];
  attackPower: number;
  committedUnits: number;
  startedAt: number;
  arrivesAt: number;
  travelSeconds: number;
  status: 'marching' | 'resolved';
  isWarAttack?: boolean;
  allianceId?: string;
  enemyAllianceId?: string;
}

/**
 * Benzer seviye oyuncuları bul (matchmaking).
 * HQ seviyesi +/- 3 aralığında, kalkan aktif olmayanlar.
 */
export async function findPvPTargets(
  myUid: string,
  myHqLevel: number,
  limit: number = 10,
): Promise<PvPTarget[]> {
  const minLevel = Math.max(1, myHqLevel - 3);
  const maxLevel = myHqLevel + 3;
  const now = Date.now();

  const snap = await db.players()
    .where('hqLevel', '>=', minLevel)
    .where('hqLevel', '<=', maxLevel)
    .limit(30)
    .get();

  const targets: PvPTarget[] = [];
  snap.docs.forEach(doc => {
    if (doc.id === myUid) return; // kendini gösterme
    const data = doc.data();
    if ((data.shieldUntil ?? 0) > now) return; // kalkan aktif — atlat
    targets.push({
      uid: doc.id,
      displayName: data.displayName ?? 'Bilinmeyen',
      allianceTag: data.allianceTag ?? null,
      warPower: data.warPower ?? 0,
      hqLevel: data.hqLevel ?? 1,
      wins: data.wins ?? 0,
      shieldUntil: data.shieldUntil ?? 0,
    });
  });

  // Power'a göre sırala, limit kadar döndür
  targets.sort((a, b) => a.warPower - b.warPower);
  return targets.slice(0, limit);
}

/**
 * PvP saldırı başlat — Firestore'a march yaz.
 * Savunan oyuncu bunu gerçek zamanlı dinler.
 */
export async function launchPvPAttack(march: Omit<FirestoreMarch, 'id'>): Promise<string> {
  const ref = db.marches().doc();
  const data: FirestoreMarch = { ...march, id: ref.id };
  await ref.set(data);
  return ref.id;
}

/**
 * Savunan oyuncunun üs verisini oku (savaş çözümleme için).
 */
export async function loadDefenderBase(defenderUid: string): Promise<PersistedGameState | null> {
  const snap = await db.playerBases().doc(defenderUid).get();
  if (!snap.exists()) return null;
  return snap.data() as PersistedGameState;
}

/**
 * Savaş sonucunu Firestore'a yaz.
 */
export async function resolvePvPMarch(
  marchId: string,
  result: {
    won: boolean;
    attackerUid: string;
    defenderUid: string;
    attackPower: number;
    defensePower: number;
    rewardCash: number;
    rewardOil: number;
    rewardOre: number;
    powerChange: number;
    transferCash?: number;
    transferOil?: number;
    transferOre?: number;
    transferPower?: number;
    attackerResults?: any[];
    defenderResults?: any[];
  },
): Promise<void> {
  // March'ı resolved yap + savaş sonucunu march'a yaz (savunan okuyabilsin)
  await db.marches().doc(marchId).update({
    status: 'resolved',
    battleResult: {
      won: result.won,
      attackPower: result.attackPower,
      defensePower: result.defensePower,
      rewardCash: result.rewardCash,
      rewardOil: result.rewardOil,
      rewardOre: result.rewardOre,
      powerChange: result.powerChange,
      attackerResults: result.attackerResults ?? [],
      defenderResults: result.defenderResults ?? [],
    },
  });

  // Battle report yaz
  await db.battleReports().add({
    ...result,
    timestamp: firestore.FieldValue.serverTimestamp(),
  });

  // Kaybedene kalkan ver (30 dakika)
  const loserUid = result.won ? result.defenderUid : result.attackerUid;
  await db.players().doc(loserUid).update({
    shieldUntil: Date.now() + 30 * 60 * 1000,
  });
}

/**
 * PvP saldırısını iptal et — march status'unu resolved yap.
 */
export async function cancelPvPMarch(marchId: string): Promise<void> {
  await db.marches().doc(marchId).update({ status: 'resolved' });
}

/**
 * Gelen saldırıları dinle (gerçek zamanlı).
 * defenderUid'e gelen aktif march'ları izle.
 */
export function listenIncomingMarches(
  defenderUid: string,
  callback: (marches: FirestoreMarch[]) => void,
): () => void {
  // Tek field ile dinle — composite index gerektirmesin
  return db.marches()
    .where('defenderUid', '==', defenderUid)
    .onSnapshot((snap: any) => {
      const marches: FirestoreMarch[] = [];
      snap.docs.forEach((doc: any) => {
        const data = doc.data() as FirestoreMarch;
        marches.push(data);
      });
      callback(marches);
    }, (err: any) => {
      console.warn('[PvP] listenIncomingMarches error:', err?.message ?? err);
    });
}
