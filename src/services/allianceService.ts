/**
 * Alliance Service — İttifak CRUD, üyelik, bağış, chat
 */
import { db, firestore, CF_BASE } from './firebase';
import type { AllianceData, AllianceMemberData, AllianceJoinRequest, AllianceChatMessage, AllianceJoinType, AllianceRank } from '../state/types';

const MAX_MEMBERS = 30;
const MAX_OFFICERS = 3;

// ── İttifak CRUD ─────────────────────────────────────────────

export async function createAlliance(
  uid: string, displayName: string, name: string, tag: string,
  description: string, joinType: AllianceJoinType, power: number,
): Promise<string> {
  // Tag benzersizlik kontrolü
  const existing = await db.alliances().where('tag', '==', tag.toUpperCase()).limit(1).get();
  if (!existing.empty) throw new Error('Bu tag zaten kullanılıyor');

  const allianceRef = db.alliances().doc();
  const allianceId = allianceRef.id;
  const now = Date.now();

  const allianceData: AllianceData = {
    id: allianceId,
    name,
    nameLower: name.toLowerCase(),
    tag: tag.toUpperCase(),
    description,
    leaderUid: uid,
    leaderName: displayName,
    joinType,
    memberCount: 1,
    maxMembers: MAX_MEMBERS,
    totalPower: power,
    treasury: { cash: 0, oil: 0, ore: 0 },
    createdAt: now,
  };

  await allianceRef.set(allianceData);

  // Kurucu üye olarak ekle
  const memberData: AllianceMemberData = {
    uid,
    displayName,
    rank: 'leader',
    power,
    contribution: 0,
    joinedAt: now,
    lastOnline: now,
  };
  await db.allianceMembers(allianceId).doc(uid).set(memberData);

  // Oyuncunun profilini güncelle
  await db.players().doc(uid).set({ allianceId, allianceTag: tag.toUpperCase() }, { merge: true });

  return allianceId;
}

export async function getMyAlliance(allianceId: string): Promise<AllianceData | null> {
  const snap = await db.alliances().doc(allianceId).get();
  return snap.exists ? (snap.data() as AllianceData) : null;
}

export async function searchAlliances(query: string, limit = 20): Promise<AllianceData[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Tüm ittifakları çek, client-side filtrele (ittifak sayısı az)
  const snap = await db.alliances().limit(200).get();
  const all = snap.docs.map(d => d.data() as AllianceData);
  return all.filter(a =>
    a.name.toLowerCase().includes(q) || a.tag.toLowerCase().includes(q)
  ).slice(0, limit);
}

export async function getAllianceRankings(limit = 20): Promise<AllianceData[]> {
  const snap = await db.alliances().orderBy('totalPower', 'desc').limit(limit).get();
  return snap.docs.map(d => d.data() as AllianceData);
}

export async function disbandAlliance(allianceId: string, leaderUid: string): Promise<void> {
  const alliance = await getMyAlliance(allianceId);
  if (!alliance || alliance.leaderUid !== leaderUid) throw new Error('Yetki yok');

  // Tüm üyelerin allianceId/Tag'ini temizle
  const membersSnap = await db.allianceMembers(allianceId).get();
  for (const doc of membersSnap.docs) {
    await db.players().doc(doc.id).set({ allianceId: null, allianceTag: null }, { merge: true });
  }
  // Subcollection'ları sil
  for (const doc of membersSnap.docs) await doc.ref.delete();
  const msgsSnap = await db.allianceMessages(allianceId).limit(200).get();
  for (const doc of msgsSnap.docs) await doc.ref.delete();
  const reqsSnap = await db.allianceRequests(allianceId).limit(100).get();
  for (const doc of reqsSnap.docs) await doc.ref.delete();
  // Ana doc sil
  await db.alliances().doc(allianceId).delete();
}

// ── Üyelik ───────────────────────────────────────────────────

export async function joinAlliance(allianceId: string, uid: string, displayName: string, power: number): Promise<void> {
  const alliance = await getMyAlliance(allianceId);
  if (!alliance) throw new Error('İttifak bulunamadı');
  if (alliance.memberCount >= alliance.maxMembers) throw new Error('İttifak dolu');
  if (alliance.joinType !== 'open') throw new Error('Katılım onay gerektiriyor');

  const now = Date.now();
  await db.allianceMembers(allianceId).doc(uid).set({
    uid, displayName, rank: 'member', power, contribution: 0, joinedAt: now, lastOnline: now,
  });
  await db.alliances().doc(allianceId).set({
    memberCount: firestore.FieldValue.increment(1),
    totalPower: firestore.FieldValue.increment(power),
  } as any, { merge: true });
  await db.players().doc(uid).set({ allianceId, allianceTag: alliance.tag }, { merge: true });
  await sendSystemMessage(allianceId, `${displayName} ittifaka katıldı`);
}

export async function requestJoinAlliance(allianceId: string, uid: string, displayName: string, power: number, hqLevel: number): Promise<void> {
  const alliance = await getMyAlliance(allianceId);
  if (!alliance) throw new Error('İttifak bulunamadı');
  if (alliance.memberCount >= alliance.maxMembers) throw new Error('İttifak dolu');
  await db.allianceRequests(allianceId).doc(uid).set({
    uid, displayName, power, hqLevel, requestedAt: Date.now(),
  });
}

export async function approveJoinRequest(allianceId: string, requesterUid: string): Promise<void> {
  // 1. İstek verisini oku
  let reqData: AllianceJoinRequest;
  let allianceTag: string;
  try {
    const reqSnap = await db.allianceRequests(allianceId).doc(requesterUid).get();
    if (!reqSnap.exists) throw new Error('İstek bulunamadı');
    reqData = reqSnap.data() as AllianceJoinRequest;
    const alliance = await getMyAlliance(allianceId);
    if (!alliance) throw new Error('İttifak bulunamadı');
    if (alliance.memberCount >= alliance.maxMembers) throw new Error('İttifak dolu');
    allianceTag = alliance.tag;
  } catch (err) {
    console.warn('[approveJoinRequest] read error:', err);
    throw err;
  }

  // 2. Üye olarak ekle
  const now = Date.now();
  try {
    await db.allianceMembers(allianceId).doc(requesterUid).set({
      uid: reqData.uid, displayName: reqData.displayName, rank: 'member' as const,
      power: reqData.power, contribution: 0, joinedAt: now, lastOnline: now,
    });
  } catch (err) {
    console.warn('[approveJoinRequest] add member error:', err);
    throw err;
  }

  // 3. Sayaçları güncelle (hata olursa yutulur — üye eklendi)
  try {
    await db.alliances().doc(allianceId).set({
      memberCount: firestore.FieldValue.increment(1),
      totalPower: firestore.FieldValue.increment(reqData.power),
    } as any, { merge: true });
  } catch (err) { console.warn('[approveJoinRequest] counter error:', err); }

  // 4. Oyuncunun allianceId'sini güncelle
  try {
    await db.players().doc(requesterUid).set({ allianceId, allianceTag }, { merge: true });
  } catch (err) { console.warn('[approveJoinRequest] player update error:', err); }

  // 5. İsteği sil + sistem mesajı
  try { await db.allianceRequests(allianceId).doc(requesterUid).delete(); } catch (err) { console.warn('[approveJoinRequest] delete error:', err); }
  try { await sendSystemMessage(allianceId, `${reqData.displayName} ittifaka kabul edildi`); } catch (err) { console.warn('[approveJoinRequest] msg error:', err); }
}

export async function rejectJoinRequest(allianceId: string, requesterUid: string): Promise<void> {
  try { await db.allianceRequests(allianceId).doc(requesterUid).delete(); } catch (err) { console.warn('[rejectJoinRequest]', err); }
}

export async function leaveAlliance(allianceId: string, uid: string): Promise<void> {
  const memberSnap = await db.allianceMembers(allianceId).doc(uid).get();
  if (!memberSnap.exists) return;
  const member = memberSnap.data() as AllianceMemberData;
  if (member.rank === 'leader') throw new Error('Lider ayrılamaz — önce liderliği devret');

  try { await db.allianceMembers(allianceId).doc(uid).delete(); } catch (err) { console.warn('[leaveAlliance] delete member:', err); }
  try { await db.alliances().doc(allianceId).set({ memberCount: firestore.FieldValue.increment(-1), totalPower: firestore.FieldValue.increment(-member.power) } as any, { merge: true }); } catch (err) { console.warn('[leaveAlliance] counter:', err); }
  try { await db.players().doc(uid).set({ allianceId: null, allianceTag: null }, { merge: true }); } catch (err) { console.warn('[leaveAlliance] player:', err); }
  try { await sendSystemMessage(allianceId, `${member.displayName} ittifaktan ayrıldı`); } catch (err) { console.warn('[leaveAlliance] msg:', err); }
}

export async function kickMember(allianceId: string, targetUid: string, kickerUid: string): Promise<void> {
  const kickerSnap = await db.allianceMembers(allianceId).doc(kickerUid).get();
  const targetSnap = await db.allianceMembers(allianceId).doc(targetUid).get();
  if (!kickerSnap.exists || !targetSnap.exists) throw new Error('Üye bulunamadı');
  const kicker = kickerSnap.data() as AllianceMemberData;
  const target = targetSnap.data() as AllianceMemberData;

  if (kicker.rank === 'member') throw new Error('Yetki yok');
  if (target.rank === 'leader') throw new Error('Lider atılamaz');
  if (kicker.rank === 'officer' && target.rank === 'officer') throw new Error('Yardımcı, yardımcıyı atamaz');

  try { await db.allianceMembers(allianceId).doc(targetUid).delete(); } catch (err) { console.warn('[kickMember] delete:', err); }
  try { await db.alliances().doc(allianceId).set({ memberCount: firestore.FieldValue.increment(-1), totalPower: firestore.FieldValue.increment(-target.power) } as any, { merge: true }); } catch (err) { console.warn('[kickMember] counter:', err); }
  try { await db.players().doc(targetUid).set({ allianceId: null, allianceTag: null }, { merge: true }); } catch (err) { console.warn('[kickMember] player:', err); }
  try { await sendSystemMessage(allianceId, `${target.displayName} ittifaktan atıldı`); } catch (err) { console.warn('[kickMember] msg:', err); }
}

const RANK_LABELS: Record<string, string> = {
  officer: 'Yönetici', foreign: 'Dış İşleri Bakanı', economy: 'Ekonomi Bakanı',
  interior: 'İç İşleri Bakanı', defense: 'Savunma Bakanı', member: 'Üye',
};

export async function promoteMember(allianceId: string, targetUid: string, newRank: AllianceRank): Promise<void> {
  const targetSnap = await db.allianceMembers(allianceId).doc(targetUid).get();
  if (!targetSnap.exists) throw new Error('Üye bulunamadı');
  const target = targetSnap.data() as AllianceMemberData;
  try { await db.allianceMembers(allianceId).doc(targetUid).set({ rank: newRank }, { merge: true }); } catch (err) { console.warn('[promoteMember]', err); }
  const label = RANK_LABELS[newRank] ?? newRank;
  try { await sendSystemMessage(allianceId, `${target.displayName} → ${label} yapıldı`); } catch (err) { console.warn('[promoteMember] msg:', err); }
}

export async function transferLeadership(allianceId: string, newLeaderUid: string, currentLeaderUid: string): Promise<void> {
  const newSnap = await db.allianceMembers(allianceId).doc(newLeaderUid).get();
  if (!newSnap.exists) throw new Error('Üye bulunamadı');
  const newLeader = newSnap.data() as AllianceMemberData;

  try { await db.allianceMembers(allianceId).doc(newLeaderUid).set({ rank: 'leader' }, { merge: true }); } catch (err) { console.warn('[transferLeadership]', err); }
  try { await db.allianceMembers(allianceId).doc(currentLeaderUid).set({ rank: 'member' }, { merge: true }); } catch (err) { console.warn('[transferLeadership]', err); }
  try { await db.alliances().doc(allianceId).set({ leaderUid: newLeaderUid, leaderName: newLeader.displayName }, { merge: true }); } catch (err) { console.warn('[transferLeadership]', err); }
  try { await sendSystemMessage(allianceId, `${newLeader.displayName} yeni lider oldu`); } catch (err) { console.warn('[transferLeadership] msg:', err); }
}

// ── İttifak Bilgilerini Güncelle ─────────────────────────────
export async function updateAllianceInfo(allianceId: string, updates: { name?: string; tag?: string; joinType?: AllianceJoinType }): Promise<void> {
  const data: any = {};
  if (updates.name) { data.name = updates.name; data.nameLower = updates.name.toLowerCase(); }
  if (updates.tag) data.tag = updates.tag.toUpperCase();
  if (updates.joinType) data.joinType = updates.joinType;
  try { await db.alliances().doc(allianceId).set(data, { merge: true }); } catch (err) { console.warn('[updateAllianceInfo]', err); }
  if (updates.tag) {
    // Tüm üyelerin allianceTag'ini güncelle
    const membersSnap = await db.allianceMembers(allianceId).get();
    for (const m of membersSnap.docs) {
      try { await db.players().doc(m.id).set({ allianceTag: updates.tag.toUpperCase() }, { merge: true }); } catch {}
    }
  }
  try { await sendSystemMessage(allianceId, `İttifak bilgileri güncellendi`); } catch {}
}

// ── Bağış ────────────────────────────────────────────────────

export async function donateToTreasury(
  allianceId: string, uid: string, resource: 'cash' | 'oil' | 'ore', amount: number,
): Promise<void> {
  try {
    const snap = await db.alliances().doc(allianceId).get();
    if (snap.exists) {
      const data = snap.data() as any;
      const treasury = data.treasury ?? { cash: 0, oil: 0, ore: 0 };
      treasury[resource] = (treasury[resource] ?? 0) + amount;
      await db.alliances().doc(allianceId).set({ treasury }, { merge: true });
    }
  } catch (err) { console.warn('[donateToTreasury] treasury:', err); }
  try { await db.allianceMembers(allianceId).doc(uid).set({ contribution: firestore.FieldValue.increment(amount) } as any, { merge: true }); } catch (err) { console.warn('[donateToTreasury] contribution:', err); }
}

// ── Kasadan Üyeye Kaynak Gönder (lider/ekonomi bakanı) ──────
export async function sendFromTreasury(
  allianceId: string, targetUid: string, targetName: string, resource: 'cash' | 'oil' | 'ore', amount: number,
): Promise<void> {
  // Kasadan düş
  const aSnap = await db.alliances().doc(allianceId).get();
  if (aSnap.exists) {
    const data = aSnap.data() as any;
    const treasury = data.treasury ?? { cash: 0, oil: 0, ore: 0 };
    if ((treasury[resource] ?? 0) < amount) throw new Error('Kasada yeterli kaynak yok');
    treasury[resource] = (treasury[resource] ?? 0) - amount;
    await db.alliances().doc(allianceId).set({ treasury }, { merge: true });
  }
  // Hedef oyuncuya pending kaynak ekle
  const baseSnap = await db.playerBases().doc(targetUid).get();
  if (baseSnap.exists) {
    const pending = (baseSnap.data() as any).pendingResources ?? { cash: 0, oil: 0, ore: 0 };
    pending[resource] = (pending[resource] ?? 0) + amount;
    await db.playerBases().doc(targetUid).set({ pendingResources: pending }, { merge: true });
  }
  const icon = resource === 'cash' ? '💵' : resource === 'oil' ? '🛢️' : '⛏️';
  await sendSystemMessage(allianceId, `Kasadan ${targetName} adlı üyeye ${(amount / 1000).toFixed(0)}K ${icon} gönderildi`);
}

// ── Bağış Talebi ────────────────────────────────────────────
export async function createDonationRequest(
  allianceId: string, uid: string, name: string, resource: 'cash' | 'oil' | 'ore', amount: number,
): Promise<void> {
  await db.alliances().doc(allianceId).collection('donationRequests').add({
    requesterUid: uid, requesterName: name, resource, amount, filled: 0,
    donors: [], createdAt: Date.now(),
  });
  const icon = resource === 'cash' ? '💵' : resource === 'oil' ? '🛢️' : '⛏️';
  await sendSystemMessage(allianceId, `${name} ${(amount / 1000).toFixed(0)}K ${icon} talep etti`);
}

export async function fulfillDonationRequest(
  allianceId: string, requestId: string, donorUid: string, donorName: string, amount: number,
): Promise<void> {
  const reqRef = db.alliances().doc(allianceId).collection('donationRequests').doc(requestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) throw new Error('Talep bulunamadı');
  const req = reqSnap.data() as any;
  const newFilled = Math.min(req.amount, (req.filled ?? 0) + amount);
  const donors = [...(req.donors ?? []), { uid: donorUid, name: donorName, amount }];
  // Hedef oyuncuya pending kaynak ekle (oyuncu girdiğinde alacak — override güvenli)
  const targetBase = await db.playerBases().doc(req.requesterUid).get();
  if (targetBase.exists) {
    const pending = (targetBase.data() as any).pendingResources ?? { cash: 0, oil: 0, ore: 0 };
    pending[req.resource] = (pending[req.resource] ?? 0) + amount;
    await db.playerBases().doc(req.requesterUid).set({ pendingResources: pending }, { merge: true });
  }
  // Bağışçı katkı puanı
  try { await db.allianceMembers(allianceId).doc(donorUid).set({ contribution: firestore.FieldValue.increment(amount) } as any, { merge: true }); } catch {}
  // Talebi her zaman sil (tek seferde tamamlanıyor)
  try { await reqRef.delete(); } catch {}
  const icon = req.resource === 'cash' ? '💵' : req.resource === 'oil' ? '🛢️' : '⛏️';
  await sendSystemMessage(allianceId, `${donorName} → ${req.requesterName}: ${(amount / 1000).toFixed(0)}K ${icon} bağışladı ✓`);
}

export function listenDonationRequests(allianceId: string, callback: (requests: any[]) => void): () => void {
  return db.alliances().doc(allianceId).collection('donationRequests').orderBy('createdAt', 'desc').limit(20).onSnapshot((snap: any) => {
    const reqs: any[] = [];
    snap.docs.forEach((d: any) => reqs.push({ id: d.id, ...d.data() }));
    callback(reqs);
  });
}

// ── İttifak Seviyesi ────────────────────────────────────────
const ALLIANCE_LEVEL_COSTS: Record<number, { cash: number; oil: number; ore: number }> = {
  2: { cash: 100000, oil: 100000, ore: 100000 },
  3: { cash: 250000, oil: 250000, ore: 250000 },
  4: { cash: 500000, oil: 500000, ore: 500000 },
  5: { cash: 1000000, oil: 1000000, ore: 1000000 },
  6: { cash: 2000000, oil: 2000000, ore: 2000000 },
  7: { cash: 3000000, oil: 3000000, ore: 3000000 },
  8: { cash: 5000000, oil: 5000000, ore: 5000000 },
  9: { cash: 7000000, oil: 7000000, ore: 7000000 },
  10: { cash: 10000000, oil: 10000000, ore: 10000000 },
};

export function getAllianceLevelCost(level: number) {
  return ALLIANCE_LEVEL_COSTS[level] ?? null;
}

export function getAllianceMaxMembers(level: number): number {
  return 30 + (level - 1) * 5; // Lv1=30, Lv2=35, ... Lv10=75
}

export async function upgradeAllianceLevel(allianceId: string): Promise<void> {
  const allianceSnap = await db.alliances().doc(allianceId).get();
  if (!allianceSnap.exists) throw new Error('İttifak bulunamadı');
  const data = allianceSnap.data() as any;
  const currentLevel = data.allianceLevel ?? 1;
  if (currentLevel >= 10) throw new Error('Maksimum seviye');
  const cost = ALLIANCE_LEVEL_COSTS[currentLevel + 1];
  if (!cost) throw new Error('Geçersiz seviye');
  const treasury = data.treasury ?? { cash: 0, oil: 0, ore: 0 };
  if (treasury.cash < cost.cash || treasury.oil < cost.oil || treasury.ore < cost.ore) {
    throw new Error('Kasada yeterli kaynak yok');
  }
  await db.alliances().doc(allianceId).set({
    allianceLevel: currentLevel + 1,
    maxMembers: getAllianceMaxMembers(currentLevel + 1),
    treasury: {
      cash: treasury.cash - cost.cash,
      oil: treasury.oil - cost.oil,
      ore: treasury.ore - cost.ore,
    },
  }, { merge: true });
  await sendSystemMessage(allianceId, `🏰 İttifak Lv.${currentLevel + 1} oldu! Üye kapasitesi: ${getAllianceMaxMembers(currentLevel + 1)}`);
}

// ── İttifak Boost ───────────────────────────────────────────
const BOOST_COST = { cash: 200000, oil: 200000, ore: 200000 };

export async function activateAllianceBoost(allianceId: string): Promise<void> {
  const allianceSnap = await db.alliances().doc(allianceId).get();
  if (!allianceSnap.exists) throw new Error('İttifak bulunamadı');
  const data = allianceSnap.data() as any;
  const treasury = data.treasury ?? { cash: 0, oil: 0, ore: 0 };
  if (treasury.cash < BOOST_COST.cash || treasury.oil < BOOST_COST.oil || treasury.ore < BOOST_COST.ore) {
    throw new Error('Kasada yeterli kaynak yok');
  }
  if (data.activeBoost && data.activeBoost.endsAt > Date.now()) throw new Error('Zaten aktif boost var');
  await db.alliances().doc(allianceId).set({
    activeBoost: { type: 'production_x2', endsAt: Date.now() + 24 * 60 * 60 * 1000 },
    treasury: {
      cash: treasury.cash - BOOST_COST.cash,
      oil: treasury.oil - BOOST_COST.oil,
      ore: treasury.ore - BOOST_COST.ore,
    },
  }, { merge: true });
  await sendSystemMessage(allianceId, `⚡ 24 saat üretim x2 boost aktifleştirildi!`);
}

// ── Chat ─────────────────────────────────────────────────────

export async function sendChatMessage(allianceId: string, uid: string, displayName: string, text: string): Promise<void> {
  await db.allianceMessages(allianceId).add({
    senderUid: uid,
    senderName: displayName,
    text,
    timestamp: Date.now(),
    type: 'chat',
  });
}

async function sendSystemMessage(allianceId: string, text: string): Promise<void> {
  await db.allianceMessages(allianceId).add({
    senderUid: 'system',
    senderName: 'Sistem',
    text,
    timestamp: Date.now(),
    type: 'system',
  });
}

// ── Listener'lar ─────────────────────────────────────────────

export function listenAllianceData(allianceId: string, callback: (data: AllianceData | null) => void): () => void {
  return db.alliances().doc(allianceId).onSnapshot(snap => {
    callback(snap.exists ? (snap.data() as AllianceData) : null);
  });
}

export function listenAllianceMembers(allianceId: string, callback: (members: AllianceMemberData[]) => void): () => void {
  return db.allianceMembers(allianceId).onSnapshot(async (snap: any) => {
    const members = snap.docs.map((d: any) => d.data() as AllianceMemberData);
    // players koleksiyonundan güncel güç al
    for (const m of members) {
      try {
        const pSnap = await db.players().doc(m.uid).get();
        if (pSnap.exists) {
          const pData = pSnap.data() as any;
          m.power = pData.playerPower ?? m.power;
        }
      } catch {}
    }
    members.sort((a: AllianceMemberData, b: AllianceMemberData) => (b.power ?? 0) - (a.power ?? 0));
    callback(members);
  });
}

export function listenAllianceMessages(allianceId: string, callback: (messages: AllianceChatMessage[]) => void): () => void {
  return db.allianceMessages(allianceId).orderBy('timestamp', 'desc').limit(50).onSnapshot(snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AllianceChatMessage)).reverse());
  });
}

export function listenJoinRequests(allianceId: string, callback: (requests: AllianceJoinRequest[]) => void): () => void {
  return db.allianceRequests(allianceId).orderBy('requestedAt', 'desc').onSnapshot(snap => {
    callback(snap.docs.map(d => d.data() as AllianceJoinRequest));
  });
}

// ── İttifak Savaşı ──────────────────────────────────────────

const WAR_DURATION_MS = 24 * 60 * 60 * 1000; // 24 saat
const WAR_COST_GOLD = 5000;
const WAR_REWARD = { cash: 50000, oil: 20000, ore: 15000 };

export async function declareWar(
  myAllianceId: string, enemyAllianceId: string,
): Promise<void> {
  const myAlliance = await getMyAlliance(myAllianceId);
  const enemyAlliance = await getMyAlliance(enemyAllianceId);
  if (!myAlliance || !enemyAlliance) throw new Error('İttifak bulunamadı');
  if (myAlliance.activeWar) throw new Error('Zaten aktif bir savaşınız var');
  if (enemyAlliance.activeWar) throw new Error('Karşı ittifak zaten savaşta');

  // Savaş ilan maliyeti: kasadan 50K×3
  const WAR_COST = 20000;
  const t = myAlliance.treasury ?? { cash: 0, oil: 0, ore: 0 };
  if (t.cash < WAR_COST || t.oil < WAR_COST || t.ore < WAR_COST) {
    throw new Error(`Savaş ilan etmek için kasada en az ${(WAR_COST / 1000).toFixed(0)}K nakit, petrol ve cevher olmalı`);
  }
  await db.alliances().doc(myAllianceId).set({
    treasury: { cash: t.cash - WAR_COST, oil: t.oil - WAR_COST, ore: t.ore - WAR_COST },
  }, { merge: true });

  const now = Date.now();
  const endsAt = now + WAR_DURATION_MS;

  const war: import('../state/types').AllianceWar = {
    enemyAllianceId: enemyAllianceId,
    enemyName: enemyAlliance.name,
    enemyTag: enemyAlliance.tag,
    startedAt: now,
    endsAt,
    ourScore: 0,
    theirScore: 0,
  };

  const enemyWar: import('../state/types').AllianceWar = {
    enemyAllianceId: myAllianceId,
    enemyName: myAlliance.name,
    enemyTag: myAlliance.tag,
    startedAt: now,
    endsAt,
    ourScore: 0,
    theirScore: 0,
  };

  // Her iki ittifağa savaş yaz
  try { await db.alliances().doc(myAllianceId).set({ activeWar: war } as any, { merge: true }); } catch (err) { console.warn('[declareWar] my:', err); }
  try { await db.alliances().doc(enemyAllianceId).set({ activeWar: enemyWar } as any, { merge: true }); } catch (err) { console.warn('[declareWar] enemy:', err); }
  try { await sendSystemMessage(myAllianceId, `⚔️ ${enemyAlliance.name} ittifakına savaş ilan edildi!`); } catch {}
  try { await sendSystemMessage(enemyAllianceId, `⚔️ ${myAlliance.name} ittifakı savaş ilan etti!`); } catch {}
  // Bot saldırı planı oluştur (her iki ittifak için) — await ile güvenilir tetikleme
  try {
    await Promise.all([
      fetch(`${CF_BASE}/createBotAttackPlan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allianceId: myAllianceId }),
      }),
      fetch(`${CF_BASE}/createBotAttackPlan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allianceId: enemyAllianceId }),
      }),
    ]);
  } catch (err) { console.warn('[declareWar] Bot plan creation failed:', err); }
}

export async function saveWarBattleLog(
  allianceId: string, report: import('../state/types').BattleReport, attackerName: string, score: number,
): Promise<void> {
  try {
    await db.alliances().doc(allianceId).collection('warBattleLogs').add({
      ...report,
      attackerName,
      score,
      savedAt: Date.now(),
    });
  } catch (err) { console.warn('[saveWarBattleLog]', err); }
}

export function listenWarBattleLogs(allianceId: string, callback: (logs: any[]) => void): () => void {
  return db.alliances().doc(allianceId).collection('warBattleLogs').orderBy('savedAt', 'desc').limit(20).onSnapshot(
    (snap: any) => callback(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))),
    (err: any) => console.warn('[warBattleLogs]', err),
  );
}

export async function addWarScore(
  allianceId: string, enemyAllianceId: string, score: number,
  attackerName: string, defenderName: string, won: boolean,
  onScoreUpdated?: (newOurScore: number, newTheirScore: number) => void,
): Promise<void> {
  const attackLog: import('../state/types').AllianceWarAttackLog = {
    attackerName, defenderName, won, score, timestamp: Date.now(),
  };
  let newOurScore = 0;
  // Bizim skoru artır
  try {
    const mySnap = await db.alliances().doc(allianceId).get();
    if (mySnap.exists) {
      const data = mySnap.data() as any;
      if (data?.activeWar) {
        newOurScore = (data.activeWar.ourScore ?? 0) + score;
        const updatedWar = { ...data.activeWar, ourScore: newOurScore, lastAttack: attackLog };
        await db.alliances().doc(allianceId).set({ activeWar: updatedWar }, { merge: true });
      }
    }
  } catch (err) { console.warn('[addWarScore] my:', err); }
  // Düşmanın theirScore'unu artır
  let newTheirScore = 0;
  try {
    const enemySnap = await db.alliances().doc(enemyAllianceId).get();
    if (enemySnap.exists) {
      const data = enemySnap.data() as any;
      if (data?.activeWar) {
        newTheirScore = (data.activeWar.theirScore ?? 0) + score;
        const updatedWar = { ...data.activeWar, theirScore: newTheirScore, lastAttack: { ...attackLog, attackerName: defenderName, defenderName: attackerName, won: !won } };
        await db.alliances().doc(enemyAllianceId).set({ activeWar: updatedWar }, { merge: true });
      }
    }
  } catch (err) { console.warn('[addWarScore] enemy:', err); }
  if (onScoreUpdated) onScoreUpdated(newOurScore, newTheirScore);
}

export async function resolveWar(allianceId: string): Promise<{ won: boolean; reward: typeof WAR_REWARD | null } | null> {
  const alliance = await getMyAlliance(allianceId);
  if (!alliance?.activeWar) return null;
  if (Date.now() < alliance.activeWar.endsAt) return null; // Henüz bitmedi

  const war = alliance.activeWar;
  const won = war.ourScore >= war.theirScore;

  const historyEntry: import('../state/types').AllianceWarHistory = {
    enemyName: war.enemyName,
    enemyTag: war.enemyTag,
    ourScore: war.ourScore,
    theirScore: war.theirScore,
    won,
    endedAt: Date.now(),
  };

  // Savaşı bitir + geçmişe ekle
  try {
    await db.alliances().doc(allianceId).set({
      activeWar: null,
      warHistory: firestore.FieldValue.arrayUnion ? [historyEntry] : [historyEntry],
    } as any, { merge: true });
  } catch (err) { console.warn('[resolveWar]', err); }

  // Kazandıysa ödül kasaya ekle
  if (won) {
    try {
      await db.alliances().doc(allianceId).set({
        ['treasury.cash']: firestore.FieldValue.increment(WAR_REWARD.cash),
        ['treasury.oil']: firestore.FieldValue.increment(WAR_REWARD.oil),
        ['treasury.ore']: firestore.FieldValue.increment(WAR_REWARD.ore),
      } as any, { merge: true });
    } catch {}
    try { await sendSystemMessage(allianceId, `🏆 Savaş kazanıldı! Kasaya ödül eklendi.`); } catch {}
  } else {
    try { await sendSystemMessage(allianceId, `💀 Savaş kaybedildi...`); } catch {}
  }

  return { won, reward: won ? WAR_REWARD : null };
}

export async function getEnemyMembers(enemyAllianceId: string): Promise<AllianceMemberData[]> {
  const snap = await db.allianceMembers(enemyAllianceId).orderBy('power', 'desc').get();
  return snap.docs.map(d => d.data() as AllianceMemberData);
}
