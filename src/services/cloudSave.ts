/**
 * Cloud Save servisi — Firestore'a oyun state'i kaydet/yükle.
 * AsyncStorage'ın bulut karşılığı.
 */
import { db } from './firebase';
import { UNIT_MAP } from '../data/units';
import type { PersistedGameState } from '../state/types';

/** Oyun state'ini Firestore'a kaydet */
export async function saveToCloud(uid: string, state: PersistedGameState, displayName?: string): Promise<void> {
  try {
    await db.playerBases().doc(uid).set({
      ...state,
      displayName: displayName ?? null,
      uid,
      lastSavedAt: Date.now(),
    });
  } catch (err) {
    console.warn('[CloudSave] Save failed:', err);
  }
}

/** Firestore'dan oyun state'i yükle */
export async function loadFromCloud(uid: string): Promise<PersistedGameState | null> {
  try {
    const snap = await db.playerBases().doc(uid).get();
    if (!snap.exists()) return null;
    return snap.data() as PersistedGameState;
  } catch (err) {
    console.warn('[CloudSave] Load failed:', err);
    return null;
  }
}

/** playerPower olmayan oyuncuların gücünü playerBases'den hesapla ve players'a yaz */
const POWER_TIER: Record<number, number> = { 1: 10, 2: 30, 3: 60, 4: 100 };
function calcPower(state: any): number {
  const buildings = state?.buildings ?? [];
  const buildingPower = buildings.reduce((s: number, b: any) => { const l = b.level ?? 1; return s + l * (l + 1) / 2 * 100; }, 0);
  const unitPower = buildings.reduce((s: number, b: any) => {
    for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
      const def = UNIT_MAP[unitId];
      s += (count as number) * (POWER_TIER[def?.tier ?? 1] ?? 10);
    }
    return s;
  }, 0);
  const researchPower = (state?.researchStates ?? [])
    .filter((r: any) => r.completed)
    .reduce((s: number) => s + 50, 0);
  const basePower = buildingPower + unitPower + researchPower;
  const cappedWarPower = Math.min(state?.warPower ?? 0, basePower);
  return basePower + cappedWarPower;
}

export async function migratePlayerPower(forceAll = false): Promise<void> {
  try {
    const playersSnap = await db.players().limit(100).get();
    for (const doc of playersSnap.docs) {
      const data = doc.data();
      if (!forceAll && data.playerPower && data.playerPower > 0) continue;
      const baseSnap = await db.playerBases().doc(doc.id).get();
      if (!baseSnap.exists()) continue;
      const state = baseSnap.data() as any;
      const power = calcPower(state);
      const wins = (state?.battleReports ?? []).filter((r: any) => r.won).length;
      const hqLevel = (state?.buildings ?? []).find((b: any) => b.id === 'hq')?.level ?? 1;
      await db.players().doc(doc.id).set({
        playerPower: power,
        wins,
        hqLevel,
      }, { merge: true });
    }
  } catch (err) {
    console.warn('[Migration] playerPower migration failed:', err);
  }
}

/** HQ seviyesine bağlı birim kapasitesi tablosu */
const UNIT_CAP_TABLE: Record<number, number> = {
  1: 50, 2: 50, 3: 100, 4: 100, 5: 200, 6: 200,
  7: 350, 8: 350, 9: 500, 10: 500, 11: 700, 12: 700,
  13: 900, 14: 900, 15: 1100, 16: 1100, 17: 1300, 18: 1300,
  19: 1500, 20: 1500,
};

/** Tüm oyuncuların birimlerini bina bazlı kapasite limitine göre kırp ve playerPower güncelle.
 *  Her askeri bina (barracks, tankFactory, airport, shipyard, defenseTower, hq) ayrı ayrı limitlenir. */
export async function enforceUnitCaps(onProgress?: (msg: string) => void): Promise<{ processed: number; trimmed: number; error?: string; total?: number; errors?: string[]; debug?: string[] }> {
  let processed = 0;
  let trimmed = 0;
  const errors: string[] = [];
  const debug: string[] = [];

  // Adım 1: players listesini oku
  let playerUids: string[] = [];
  try {
    const playersSnap = await db.players().limit(500).get();
    playerUids = playersSnap.docs.map(d => d.id);
  } catch (err: any) {
    return { processed: 0, trimmed: 0, error: 'players okuma hatası: ' + (err?.message ?? String(err)), total: 0 };
  }

  if (playerUids.length === 0) {
    return { processed: 0, trimmed: 0, error: 'players koleksiyonunda 0 oyuncu', total: 0 };
  }

  // Adım 2: Her oyuncunun base'ini oku, kırp, güncelle
  // Timeout helper: 15 saniye içinde tamamlanmazsa atla
  const withTimeout = <T,>(promise: Promise<T>, ms = 30000): Promise<T> =>
    Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

  for (let i = 0; i < playerUids.length; i++) {
    const uid = playerUids[i];
    try {
      onProgress?.(`${i + 1}/${playerUids.length} okunuyor...`);
      const baseSnap = await withTimeout(db.playerBases().doc(uid).get());
      if (!baseSnap.exists()) { debug.push(`${uid.slice(0,8)}: base yok`); processed++; continue; }
      const state = baseSnap.data() as any;
      const buildings = state?.buildings ?? [];
      const hqLevel = buildings.find((b: any) => b.id === 'hq')?.level ?? 1;
      const cap = UNIT_CAP_TABLE[Math.min(hqLevel, 20)] ?? 50;
      const displayName = state?.displayName ?? uid.slice(0, 8);

      onProgress?.(`${i + 1}/${playerUids.length} ${displayName} işleniyor...`);

      // Debug: her binanın birim sayısını raporla
      const buildingReport: string[] = [];
      for (const b of buildings) {
        const tu = b.trainedUnits ?? {};
        let total = 0;
        for (const c of Object.values(tu)) total += c as number;
        if (total > 0) buildingReport.push(`${b.id}:${total}`);
      }
      const preState = { ...state, buildings };
      const prePower = calcPower(preState);
      debug.push(`${displayName} HQ${hqLevel} cap=${cap} pw=${prePower} wPw=${state?.warPower ?? 0} | ${buildingReport.join(', ')}`);

      let anyTrimmed = false;
      const updatedBuildings = buildings.map((b: any) => {
        const trainedUnits = b.trainedUnits ?? {};
        let buildingTotal = 0;
        for (const count of Object.values(trainedUnits)) {
          buildingTotal += count as number;
        }
        if (buildingTotal <= cap) return b;

        let excess = buildingTotal - cap;
        const newTrained = { ...trainedUnits };
        const tierOrder = [1, 2, 3, 4];
        for (const tier of tierOrder) {
          if (excess <= 0) break;
          for (const [unitId, count] of Object.entries(newTrained)) {
            if (excess <= 0) break;
            const def = UNIT_MAP[unitId];
            if (!def || def.tier !== tier) continue;
            const remove = Math.min(count as number, excess);
            newTrained[unitId] = (count as number) - remove;
            excess -= remove;
            if (newTrained[unitId] <= 0) delete newTrained[unitId];
          }
        }
        anyTrimmed = true;
        return { ...b, trainedUnits: newTrained };
      });

      if (anyTrimmed) {
        await withTimeout(db.playerBases().doc(uid).set({
          buildings: updatedBuildings,
          lastSavedAt: Date.now(),
        }, { merge: true }));
        trimmed++;
      }

      const newState = { ...state, buildings: anyTrimmed ? updatedBuildings : buildings };
      const power = calcPower(newState);
      const wins = (state?.battleReports ?? []).filter((r: any) => r.won).length;
      const losses = (state?.battleReports ?? []).filter((r: any) => !r.won).length;
      await withTimeout(db.players().doc(uid).set({
        playerPower: power,
        hqLevel,
        wins,
        losses,
      }, { merge: true }));

      processed++;
    } catch (err: any) {
      errors.push(`${uid.slice(0, 8)}: ${err?.message ?? String(err)}`);
      processed++;
    }
  }

  return { processed, trimmed, total: playerUids.length, errors: errors.length > 0 ? errors : undefined, debug };
}

/** Oyuncu profilinde güç/seviye güncelle (public bilgi) */
export async function syncPlayerProfile(
  uid: string,
  data: { displayName?: string; warPower?: number; hqLevel?: number; playerPower?: number; wins?: number; losses?: number; coordinate?: string },
): Promise<void> {
  try {
    await db.players().doc(uid).set({
      ...data,
      lastOnline: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('[CloudSave] Profile sync failed:', err);
  }
}
