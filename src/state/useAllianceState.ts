/**
 * useAllianceState — İttifak state yönetimi hook'u
 * DesertGameContext'ten bağımsız, kendi listener'larını yönetir
 */
import { useState, useEffect, useCallback } from 'react';
import { CF_BASE } from '../services/firebase';
import type { AllianceData, AllianceMemberData, AllianceJoinRequest, AllianceChatMessage, AllianceJoinType, AllianceRank, ResourceKey } from './types';
import {
  createAlliance as createAllianceSvc,
  joinAlliance as joinAllianceSvc,
  requestJoinAlliance as requestJoinSvc,
  approveJoinRequest as approveSvc,
  rejectJoinRequest as rejectSvc,
  leaveAlliance as leaveSvc,
  kickMember as kickSvc,
  promoteMember as promoteSvc,
  transferLeadership as transferSvc,
  disbandAlliance as disbandSvc,
  donateToTreasury,
  sendChatMessage as sendChatSvc,
  searchAlliances as searchSvc,
  getAllianceRankings as rankingsSvc,
  listenAllianceData,
  listenAllianceMembers,
  listenAllianceMessages,
  listenJoinRequests,
  declareWar as declareWarSvc,
  addWarScore as addWarScoreSvc,
  getEnemyMembers as getEnemyMembersSvc,
  listenWarBattleLogs,
  sendFromTreasury as sendFromTreasurySvc,
  createDonationRequest as createDonReqSvc,
  fulfillDonationRequest as fulfillDonReqSvc,
  listenDonationRequests,
  upgradeAllianceLevel as upgradeLevelSvc,
  activateAllianceBoost as activateBoostSvc,
} from '../services/allianceService';
import { db } from '../services/firebase';

export interface AllianceState {
  myAllianceId: string | null;
  myAllianceData: AllianceData | null;
  allianceMembers: AllianceMemberData[];
  allianceChatMessages: AllianceChatMessage[];
  allianceJoinRequests: AllianceJoinRequest[];
  myAllianceRank: AllianceRank | null;
  allianceLoading: boolean;
  allianceError: string | null;
  // Actions
  createAlliance: (name: string, tag: string, desc: string, joinType: AllianceJoinType) => Promise<boolean>;
  joinAlliance: (allianceId: string) => Promise<boolean>;
  requestJoinAlliance: (allianceId: string) => Promise<boolean>;
  leaveAlliance: () => Promise<void>;
  disbandAlliance: () => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  donateToAlliance: (resource: ResourceKey, amount: number) => Promise<void>;
  approveJoinRequest: (uid: string) => Promise<void>;
  rejectJoinRequest: (uid: string) => Promise<void>;
  kickMember: (uid: string) => Promise<void>;
  promoteMember: (uid: string, rank: AllianceRank) => Promise<void>;
  transferLeadership: (uid: string) => Promise<void>;
  searchAlliances: (query: string) => Promise<AllianceData[]>;
  getAllianceRankings: () => Promise<AllianceData[]>;
  // Savaş
  warBattleLogs: any[];
  declareWar: (enemyAllianceId: string) => Promise<boolean>;
  addWarScore: (score: number, attackerName: string, defenderName: string, won: boolean) => Promise<void>;
  refreshAllianceData: () => Promise<void>;
  resolveWar: () => Promise<{ won: boolean } | null>;
  getEnemyMembers: () => Promise<import('./types').AllianceMemberData[]>;
  // Bağış sistemi
  donationRequests: any[];
  sendFromTreasury: (targetUid: string, targetName: string, resource: 'cash' | 'oil' | 'ore', amount: number) => Promise<void>;
  createDonationRequest: (resource: 'cash' | 'oil' | 'ore', amount: number) => Promise<void>;
  fulfillDonationRequest: (requestId: string, resource: 'cash' | 'oil' | 'ore', amount: number) => Promise<void>;
  upgradeAllianceLevel: () => Promise<void>;
  activateAllianceBoost: () => Promise<void>;
}

export function useAllianceState(
  uid: string | null,
  displayName: string,
  playerPower: number,
  hqLevel: number,
  canAffordGold: (amount: number) => boolean,
  deductGold: (amount: number) => void,
  canAfford: (cash: number, oil: number, ore: number) => boolean,
  deductCost: (cash: number, oil: number, ore: number) => void,
  onDonateSuccess?: () => void,
): AllianceState {
  const [myAllianceId, setMyAllianceId] = useState<string | null>(null);
  const [myAllianceData, setMyAllianceData] = useState<AllianceData | null>(null);
  const [allianceMembers, setAllianceMembers] = useState<AllianceMemberData[]>([]);
  const [allianceChatMessages, setAllianceChatMessages] = useState<AllianceChatMessage[]>([]);
  const [allianceJoinRequests, setAllianceJoinRequests] = useState<AllianceJoinRequest[]>([]);
  const [allianceLoading, setAllianceLoading] = useState(false);
  const [allianceError, setAllianceError] = useState<string | null>(null);
  const [warBattleLogs, setWarBattleLogs] = useState<any[]>([]);
  const [donationRequests, setDonationRequests] = useState<any[]>([]);
  const [_refreshCounter, setRefreshCounter] = useState(0);

  const myAllianceRank = allianceMembers.find(m => m.uid === uid)?.rank ?? null;

  // Oyuncu profilini canlı dinle + polling fallback
  useEffect(() => {
    if (!uid) { setMyAllianceId(null); return; }

    // onSnapshot listener
    let unsub: (() => void) | null = null;
    try {
      unsub = db.players().doc(uid).onSnapshot((snap: any) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setMyAllianceId(data?.allianceId ?? null);
        }
      });
    } catch (err) {
      console.warn('[Alliance] onSnapshot setup error:', err);
    }

    // Polling fallback — her 5 saniyede kontrol et (listener çalışmazsa)
    const interval = setInterval(async () => {
      try {
        const snap = await db.players().doc(uid).get();
        if (snap.exists()) {
          const data = snap.data() as any;
          const newId = data?.allianceId ?? null;
          setMyAllianceId((prev: string | null) => prev !== newId ? newId : prev);
        }
      } catch {}
    }, 5000);

    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, [uid]);

  // allianceId değişince listener'ları başlat
  useEffect(() => {
    if (!myAllianceId) {
      setMyAllianceData(null);
      setAllianceMembers([]);
      setAllianceChatMessages([]);
      setAllianceJoinRequests([]);
      return;
    }

    const unsub1 = listenAllianceData(myAllianceId, (data) => {
      setMyAllianceData(data);
      // İttifak silinmişse çık
      if (!data) setMyAllianceId(null);
    });
    const unsub2 = listenAllianceMembers(myAllianceId, (members) => {
      setAllianceMembers(members);
      // Üye listesinden çıkarılmışsak ittifaktan atıldık
      if (uid && members.length > 0 && !members.find(m => m.uid === uid)) {
        setMyAllianceId(null);
      }
    });
    const unsub3 = listenAllianceMessages(myAllianceId, setAllianceChatMessages);
    const unsub4 = listenJoinRequests(myAllianceId, setAllianceJoinRequests);
    const unsub5 = listenDonationRequests(myAllianceId, setDonationRequests);

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [myAllianceId, uid]);

  // War battle logs listener (savaş bitse bile sonuç raporları kalsın)
  useEffect(() => {
    if (!myAllianceId) {
      setWarBattleLogs([]);
      return;
    }
    const unsub = listenWarBattleLogs(myAllianceId, setWarBattleLogs);
    return () => unsub();
  }, [myAllianceId]);

  // ── Actions ────────────────────────────────────────────────

  const createAlliance = useCallback(async (name: string, tag: string, desc: string, joinType: AllianceJoinType): Promise<boolean> => {
    if (!uid) return false;
    if (!canAffordGold(500)) { setAllianceError('500 altın gerekli'); return false; }
    setAllianceLoading(true);
    setAllianceError(null);
    try {
      deductGold(500);
      const id = await createAllianceSvc(uid, displayName, name, tag, desc, joinType, playerPower);
      setMyAllianceId(id);
      setAllianceLoading(false);
      return true;
    } catch (err: any) {
      setAllianceError(err?.message ?? 'Hata');
      setAllianceLoading(false);
      return false;
    }
  }, [uid, displayName, playerPower, canAffordGold, deductGold]);

  const joinAlliance = useCallback(async (allianceId: string): Promise<boolean> => {
    if (!uid) return false;
    setAllianceLoading(true);
    setAllianceError(null);
    try {
      await joinAllianceSvc(allianceId, uid, displayName, playerPower);
      setMyAllianceId(allianceId);
      setAllianceLoading(false);
      return true;
    } catch (err: any) {
      setAllianceError(err?.message ?? 'Hata');
      setAllianceLoading(false);
      return false;
    }
  }, [uid, displayName, playerPower]);

  const requestJoinAlliance = useCallback(async (allianceId: string): Promise<boolean> => {
    if (!uid) return false;
    setAllianceLoading(true);
    try {
      await requestJoinSvc(allianceId, uid, displayName, playerPower, hqLevel);
      setAllianceLoading(false);
      return true;
    } catch (err: any) {
      setAllianceError(err?.message ?? 'Hata');
      setAllianceLoading(false);
      return false;
    }
  }, [uid, displayName, playerPower, hqLevel]);

  const leaveAlliance = useCallback(async () => {
    if (!uid || !myAllianceId) return;
    try {
      await leaveSvc(myAllianceId, uid);
      setMyAllianceId(null);
    } catch (err: any) {
      setAllianceError(err?.message ?? 'Hata');
    }
  }, [uid, myAllianceId]);

  const disbandAlliance = useCallback(async () => {
    if (!uid || !myAllianceId) return;
    try {
      await disbandSvc(myAllianceId, uid);
      setMyAllianceId(null);
    } catch (err: any) {
      setAllianceError(err?.message ?? 'Hata');
    }
  }, [uid, myAllianceId]);

  const sendChatMessage = useCallback(async (text: string) => {
    if (!uid || !myAllianceId || !text.trim()) return;
    try {
      await sendChatSvc(myAllianceId, uid, displayName, text.trim());
    } catch {}
  }, [uid, myAllianceId, displayName]);

  const donateToAlliance = useCallback(async (resource: ResourceKey, amount: number) => {
    if (!uid || !myAllianceId) return;
    if (resource === 'gold') return;
    const costs = { cash: 0, oil: 0, ore: 0 };
    costs[resource as 'cash' | 'oil' | 'ore'] = amount;
    if (!canAfford(costs.cash, costs.oil, costs.ore)) return;
    deductCost(costs.cash, costs.oil, costs.ore);
    try {
      await donateToTreasury(myAllianceId, uid, resource as 'cash' | 'oil' | 'ore', amount);
      onDonateSuccess?.();
    } catch {}
  }, [uid, myAllianceId, canAfford, deductCost, onDonateSuccess]);

  const approveJoinRequest = useCallback(async (reqUid: string) => {
    if (!myAllianceId) return;
    try { await approveSvc(myAllianceId, reqUid); } catch (err: any) { console.warn('[Alliance] approve error:', err?.message); }
  }, [myAllianceId]);

  const rejectJoinRequest = useCallback(async (reqUid: string) => {
    if (!myAllianceId) return;
    try { await rejectSvc(myAllianceId, reqUid); } catch {}
  }, [myAllianceId]);

  const kickMember = useCallback(async (targetUid: string) => {
    if (!uid || !myAllianceId) return;
    try { await kickSvc(myAllianceId, targetUid, uid); } catch (err: any) { console.warn('[Alliance] kick:', err?.message); }
  }, [uid, myAllianceId]);

  const promoteMember = useCallback(async (targetUid: string, rank: AllianceRank) => {
    if (!myAllianceId) return;
    try { await promoteSvc(myAllianceId, targetUid, rank); } catch (err: any) { console.warn('[Alliance] promote:', err?.message); }
  }, [myAllianceId]);

  const transferLeadership = useCallback(async (newLeaderUid: string) => {
    if (!uid || !myAllianceId) return;
    try { await transferSvc(myAllianceId, newLeaderUid, uid); } catch (err: any) { console.warn('[Alliance] transfer:', err?.message); }
  }, [uid, myAllianceId]);

  const searchAlliances = useCallback(async (query: string) => {
    try { return await searchSvc(query); } catch { return []; }
  }, []);

  const getAllianceRankings = useCallback(async () => {
    try { return await rankingsSvc(); } catch { return []; }
  }, []);

  // ── Savaş ─────────────────────────────────────────────────
  const declareWar = useCallback(async (enemyAllianceId: string): Promise<boolean> => {
    if (!myAllianceId) return false;
    try {
      await declareWarSvc(myAllianceId, enemyAllianceId);
      return true;
    } catch (err: any) {
      setAllianceError(err?.message ?? 'Savaş ilan edilemedi');
      return false;
    }
  }, [myAllianceId]);

  const addWarScore = useCallback(async (score: number, attackerName: string, defenderName: string, won: boolean) => {
    if (!myAllianceId || !myAllianceData?.activeWar) return;
    try { await addWarScoreSvc(myAllianceId, myAllianceData.activeWar.enemyAllianceId, score, attackerName, defenderName, won); } catch {}
  }, [myAllianceId, myAllianceData]);

  const refreshAllianceData = useCallback(async () => {
    if (!myAllianceId) return;
    try {
      const snap = await db.alliances().doc(myAllianceId).get();
      if (snap.exists()) {
        setMyAllianceData(snap.data() as AllianceData);
        setRefreshCounter(c => c + 1);
      }
    } catch {}
  }, [myAllianceId]);

  const resolveWar = useCallback(async () => {
    if (!myAllianceId) return null;
    try {
      // Server-side ödül dağıtımı
      await fetch(`${CF_BASE}/resolveAllianceWar`, { method: 'GET' });
      await refreshAllianceData();
      return { won: true };
    } catch { return null; }
  }, [myAllianceId, refreshAllianceData]);

  const getEnemyMembers = useCallback(async () => {
    if (!myAllianceData?.activeWar) return [];
    try { return await getEnemyMembersSvc(myAllianceData.activeWar.enemyAllianceId); } catch { return []; }
  }, [myAllianceData]);

  // Savaş süresi dolduysa otomatik bitir
  useEffect(() => {
    if (!myAllianceData?.activeWar) return;
    const remaining = myAllianceData.activeWar.endsAt - Date.now();
    if (remaining <= 0) {
      resolveWar();
      return;
    }
    const timer = setTimeout(() => { resolveWar(); }, remaining);
    return () => clearTimeout(timer);
  }, [myAllianceData?.activeWar, resolveWar]);

  // ── Yeni bağış fonksiyonları ──
  const sendFromTreasury = useCallback(async (targetUid: string, targetName: string, resource: 'cash' | 'oil' | 'ore', amount: number) => {
    if (!myAllianceId) return;
    await sendFromTreasurySvc(myAllianceId, targetUid, targetName, resource, amount);
  }, [myAllianceId]);

  const createDonationRequest = useCallback(async (resource: 'cash' | 'oil' | 'ore', amount: number) => {
    if (!myAllianceId || !uid) return;
    await createDonReqSvc(myAllianceId, uid, displayName, resource, amount);
  }, [myAllianceId, uid, displayName]);

  const fulfillDonationRequest = useCallback(async (requestId: string, resource: 'cash' | 'oil' | 'ore', amount: number) => {
    if (!myAllianceId || !uid) return;
    const costs = { cash: 0, oil: 0, ore: 0 };
    costs[resource] = amount;
    if (!canAfford(costs.cash, costs.oil, costs.ore)) return;
    deductCost(costs.cash, costs.oil, costs.ore);
    await fulfillDonReqSvc(myAllianceId, requestId, uid, displayName, amount);
  }, [myAllianceId, uid, displayName, canAfford, deductCost]);

  const upgradeAllianceLevel = useCallback(async () => {
    if (!myAllianceId) return;
    await upgradeLevelSvc(myAllianceId);
  }, [myAllianceId]);

  const activateAllianceBoost = useCallback(async () => {
    if (!myAllianceId) return;
    await activateBoostSvc(myAllianceId);
  }, [myAllianceId]);

  return {
    myAllianceId,
    myAllianceData,
    allianceMembers,
    allianceChatMessages,
    allianceJoinRequests,
    myAllianceRank,
    allianceLoading,
    allianceError,
    createAlliance,
    joinAlliance,
    requestJoinAlliance,
    leaveAlliance,
    disbandAlliance,
    sendChatMessage,
    donateToAlliance,
    approveJoinRequest,
    rejectJoinRequest,
    kickMember,
    promoteMember,
    transferLeadership,
    searchAlliances,
    getAllianceRankings,
    warBattleLogs,
    declareWar,
    addWarScore,
    refreshAllianceData,
    resolveWar,
    getEnemyMembers,
    donationRequests,
    sendFromTreasury,
    createDonationRequest,
    fulfillDonationRequest,
    upgradeAllianceLevel,
    activateAllianceBoost,
  };
}
