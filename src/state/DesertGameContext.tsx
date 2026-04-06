import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BUILDING_DEFINITIONS, ALL_BUILDING_IDS } from '../data/buildings';
import { UNIT_MAP } from '../data/units';
import { RESEARCH_NODES, RESEARCH_MAP } from '../data/research';
import { MAP_TARGETS, getMapTargets } from '../data/mapTargets';
import { INITIAL_MISSIONS } from '../data/missions';
// calcBattleOutcome, deductUnitsProportionally moved to useCombat
import { resolveUnitCombat } from '../utils/combatEngine';
import { saveToCloud, loadFromCloud, syncPlayerProfile, migratePlayerPower } from '../services/cloudSave';
import { getCurrentUser } from '../services/authService';
import { db, CF_BASE } from '../services/firebase';
import { t } from '../i18n';
import { loadDefenderBase, listenIncomingMarches, resolvePvPMarch } from '../services/pvpService';
import type { PvPTarget } from '../services/pvpService';
import { useAllianceState } from './useAllianceState';
import { useEconomy } from './useEconomy';
import { useBase } from './useBase';
import { useCombat } from './useCombat';
import { useGameShell } from './useGameShell';
import { addWarScore as addWarScoreSvc, saveWarBattleLog } from '../services/allianceService';
import { buildResearchBranchBonus, collectDefenderUnits, calcPvPTransfer, calcDefenderPower, applyBirlikLosses, PVP_COOLDOWN_MS } from './pvpHelpers';
import { calcPlayerPower } from './powerCalc';
import { syncMissionProgress } from './missionSync';
import type { AllianceState } from './useAllianceState';
import type {
  Resource,
  ResourceKey,
  BuildingId,
  BuildingState,
  ResearchState,
  ResearchNode,
  UnitDefinition,
  MapTarget,
  March,
  MarchUnit,
  BattleReport,
  IncomingAttack,
  Mission,
  Birlik,
  PersistedGameState,
} from './types';
import {
  makeInitialResources,
} from './gameHelpers';

// ─── Constants ────────────────────────────────────────────────
const STORAGE_KEY = 'war-nexus/v1';
const SAVE_BATCH_DELAY_MS = 4000;
const SCHEMA_VERSION = 3;

function makeInitialBuilding(id: BuildingId): BuildingState {
  return {
    id,
    level: 1,
    upgradeSecondsRemaining: 0,
    isUpgrading: false,
    researchSecondsRemaining: 0,
    activeResearchNodeId: null,
    trainedUnits: {},
    trainingQueue: [],
  };
}

function makeInitialResearchStates(): ResearchState[] {
  return RESEARCH_NODES.map(n => ({
    nodeId: n.id,
    completed: false,
    inProgress: false,
    secondsRemaining: 0,
  }));
}

// ─── Context Shape ────────────────────────────────────────────
interface DesertGameContextValue {
  // Resources
  resources: Resource[];
  getResource: (key: ResourceKey) => Resource;
  canAfford: (cash: number, oil: number, ore: number) => boolean;
  gold: number;
  canAffordGold: (amount: number) => boolean;
  addGold: (amount: number) => void;
  deductGold: (amount: number) => void;
  addResource: (key: 'cash' | 'oil' | 'ore', amount: number) => void;
  speedUpWithGold: (type: 'building' | 'research' | 'training', id: string) => void;
  calcGoldCost: (remainingSeconds: number) => number;
  calcUpgradeGoldCost: (buildingLevel: number) => number;
  buyResourceWithGold: (resourceKey: 'cash' | 'oil' | 'ore', goldAmount: number) => boolean;

  // Buildings
  buildings: BuildingState[];
  getBuilding: (id: BuildingId) => BuildingState | undefined;
  canUpgradeBuilding: (id: BuildingId) => boolean;
  upgradeBuilding: (id: BuildingId) => void;
  getUpgradeCost: (id: BuildingId) => { cash: number; oil: number; ore: number };
  getUpgradeTime: (id: BuildingId) => number;

  // Research
  researchStates: ResearchState[];
  isResearched: (nodeId: string) => boolean;
  canStartResearch: (buildingId: BuildingId, nodeId: string) => boolean;
  startResearch: (buildingId: BuildingId, nodeId: string) => void;
  getAvailableResearch: (buildingId: BuildingId) => ResearchNode[];
  getUnlockedUnitsForBuilding: (buildingId: BuildingId) => UnitDefinition[];

  // Units
  getTrainedCount: (buildingId: BuildingId, unitId: string) => number;
  getTotalTrainedUnits: () => number;
  getUnitCap: () => number;
  getBuildingUnitCount: (buildingId: BuildingId) => number;
  canStartTraining: (buildingId: BuildingId, unitId: string, qty: number) => boolean;
  startTraining: (buildingId: BuildingId, unitId: string, qty: number) => void;
  getTrainingCost: (unitId: string, qty: number) => { cash: number; oil: number; ore: number };
  getMaxTrainable: (buildingId: BuildingId, unitId: string) => number;
  adjustTrainedUnits: (buildingId: BuildingId, unitId: string, delta: number) => void;

  // Map / Combat
  targets: MapTarget[];
  activeMarch: March | null;
  battleReports: BattleReport[];
  wins: number;
  losses: number;
  incomingAttack: IncomingAttack | null;
  birlikler: Birlik[];
  addBirlik: (birlik: Birlik) => void;
  removeBirlik: (id: string) => void;
  shieldUntil: number;
  buyShield: (durationMs: number, goldCost: number) => boolean;
  buyWarPower: (amount: number, goldCost: number) => boolean;
  playerPower: number;
  lastBattleReport: BattleReport | null;
  clearLastBattleReport: () => void;
  getTotalAttackPower: (committedUnits: number) => number;
  canAttack: (targetId: string, committedUnits: number) => boolean;
  attackTarget: (targetId: string, targetName: string, committedUnits: number, marchUnits?: MarchUnit[]) => void;
  cancelMarch: () => void;

  // PvP
  pvpTargets: PvPTarget[];
  pvpLoading: boolean;
  refreshPvPTargets: () => void;
  attackPvPTarget: (target: PvPTarget, committedUnits: number, marchUnits: MarchUnit[], isWarAttack?: boolean) => void;
  getPvPCooldown: (targetUid: string) => number; // kalan saniye, 0 = saldırabilir
  revengeTargets: Record<string, number>; // targetUid → timestamp (intikam hakkı)

  // Alliance
  allianceContribution: number;
  canDonate: (resource: ResourceKey, amount: number) => boolean;
  donate: (resource: ResourceKey, amount: number) => void;
  canRequestHelp: () => boolean;
  requestHelp: () => void;

  // Missions
  missions: Mission[];
  claimMissionReward: (missionId: string) => void;

  // Joint Attack
  launchJointAttack: (targetId: string, targetName: string, committedUnits: number, allyPower: number) => BattleReport | null;

  // Profile
  uid: string | null;
  displayName: string;

  // Toast
  toastMsg: string | null;
  clearToast: () => void;
  // Alliance (Real)
  alliance: AllianceState;
}

// ─── Context ──────────────────────────────────────────────────
const DesertGameContext = createContext<DesertGameContextValue | null>(null);

export function useDesertGame(): DesertGameContextValue {
  const ctx = useContext(DesertGameContext);
  if (!ctx) throw new Error('useDesertGame must be used within DesertGameProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────
export function DesertGameProvider({ children, uid }: { children: React.ReactNode; uid?: string }) {
  const [resources, setResources] = useState<Resource[]>(makeInitialResources());
  const [buildings, setBuildings] = useState<BuildingState[]>(
    ALL_BUILDING_IDS.map(makeInitialBuilding),
  );
  const [researchStates, setResearchStates] = useState<ResearchState[]>(makeInitialResearchStates());
  const [activeMarch, setActiveMarch] = useState<March | null>(null);
  const [battleReports, setBattleReports] = useState<BattleReport[]>([]);
  const [incomingAttack, setIncomingAttack] = useState<IncomingAttack | null>(null);
  const [birlikler, setBirlikler] = useState<Birlik[]>([]);
  const [shieldUntil, setShieldUntil] = useState(0);
  const [warPower, setWarPower] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [lastBattleReport, setLastBattleReport] = useState<BattleReport | null>(null);
  const [pvpTargets, setPvpTargets] = useState<PvPTarget[]>([]);
  const [pvpLoading, setPvpLoading] = useState(false);
  const [pvpCooldowns, setPvpCooldowns] = useState<Record<string, number>>({}); // targetUid → lastAttackTimestamp
  const [revengeTargets, setRevengeTargets] = useState<Record<string, number>>({}); // attackerUid → timestamp
  // PVP_COOLDOWN_MS imported from pvpHelpers

  const [allianceContribution, setAllianceContribution] = useState(0);
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [loaded, setLoaded] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Alliance hook — ayrı dosyada yönetiliyor
  const allianceHookDisplayName = (() => {
    try { return getCurrentUser()?.displayName ?? 'Komutan'; } catch { return 'Komutan'; }
  })();

  const buildingsRef = useRef(buildings);
  const resourcesRef = useRef(resources);
  const researchRef = useRef(researchStates);
  const marchRef = useRef(activeMarch);
  const birliklerRef = useRef(birlikler);
  const battleReportsRef = useRef(battleReports);
  const playerPowerRef = useRef(0);

  const firestoreMarchIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persistence ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Önce Firestore'dan yükle, uid varsa AsyncStorage'a düşme (farklı kullanıcı olabilir)
      let saved: PersistedGameState | null = null;
      if (uid) {
        // Web'de localStorage daha güncel olabilir (beforeunload senkron yazdı)
        let localSaved: PersistedGameState | null = null;
        try {
          const localRaw = (globalThis as any).localStorage?.getItem(STORAGE_KEY);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            // Farklı kullanıcının verisini yükleme
            if (!parsed.uid || parsed.uid === uid) localSaved = parsed;
          }
        } catch {}
        const cloudSaved = await loadFromCloud(uid);
        if (cloudSaved) {
          // En güncel olanı kullan (lastSavedAt karşılaştırması)
          if (localSaved && (localSaved.lastSavedAt ?? 0) >= (cloudSaved.lastSavedAt ?? 0)) {
            saved = localSaved;
          } else {
            saved = cloudSaved;
          }
        } else {
          // Firestore'da veri yok — lokal cache'i de temizle (silinen/yeni kullanıcı)
          await AsyncStorage.removeItem(STORAGE_KEY);
          try { (globalThis as any).localStorage?.removeItem(STORAGE_KEY); } catch {}
          saved = null;
        }
      } else {
        // uid yoksa (offline) AsyncStorage'dan yükle
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          try { saved = JSON.parse(raw); } catch {}
        }
      }
      if (saved) {
        try {
          if (saved.schemaVersion === SCHEMA_VERSION && saved.lastSavedAt) {
            // Offline gelir: max 8 saat
            const elapsedSec = Math.min(8 * 3600, (Date.now() - saved.lastSavedAt) / 1000);
            if (elapsedSec > 2) {
              // Migration: gold ekle + kapasiteleri güncelle
              if (!saved.resources.find((r: any) => r.key === 'gold')) {
                saved.resources.push({ key: 'gold', label: 'Altın', amount: 150, capacity: 1000000, productionPerHour: 0, icon: '🪙' });
              }
              const CAP_MAP: Record<string, number> = { cash: 10000000, oil: 10000000, ore: 10000000, gold: 1000000 };
              saved.resources = saved.resources.map((r: any) => CAP_MAP[r.key] ? { ...r, capacity: CAP_MAP[r.key] } : r);
              const updatedRes = saved.resources.map(r => {
                const basePerSec = r.productionPerHour / 3600;
                const buildingPerSec = saved.buildings.reduce((sum, b) => {
                  const def = BUILDING_DEFINITIONS[b.id];
                  if (def.produceResource === r.key && def.baseProdPerHour) {
                    return sum + (def.baseProdPerHour * b.level) / 3600;
                  }
                  return sum;
                }, 0);
                let interestPerSec = 0;
                if (r.key === 'cash') {
                  const bank = saved.buildings.find(b => b.id === 'bank');
                  const bankDef = BUILDING_DEFINITIONS.bank;
                  if (bank && bankDef.interestRatePerLevel) {
                    interestPerSec = r.amount * bankDef.interestRatePerLevel * bank.level / 3600;
                  }
                }
                const gained = (basePerSec + buildingPerSec + interestPerSec) * elapsedSec;
                return { ...r, amount: Math.min(r.capacity, r.amount + gained) };
              });
              const hrs = Math.floor(elapsedSec / 3600);
              const mins = Math.floor((elapsedSec % 3600) / 60);
              const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
              setTimeout(() => setToastMsg(t('common.offlineIncome', { time: timeStr })), 500);
              setResources(updatedRes);
              // Offline sürede bina/araştırma/eğitim timer'larını ilerlet
              const updatedBuildings = saved.buildings.map((b: BuildingState) => {
                const next = { ...b };
                // Yükseltme timer'ı
                if (next.isUpgrading && next.upgradeSecondsRemaining > 0) {
                  next.upgradeSecondsRemaining = Math.max(0, next.upgradeSecondsRemaining - elapsedSec);
                  if (next.upgradeSecondsRemaining === 0) {
                    next.level += 1;
                    next.isUpgrading = false;
                  }
                }
                // Araştırma timer'ı
                if (next.activeResearchNodeId && next.researchSecondsRemaining > 0) {
                  next.researchSecondsRemaining = Math.max(0, next.researchSecondsRemaining - elapsedSec);
                  if (next.researchSecondsRemaining === 0) {
                    const nodeId = next.activeResearchNodeId;
                    next.activeResearchNodeId = null;
                    // araştırma tamamlanmasını researchStates'te de işaretle
                    const rs = saved.researchStates ?? [];
                    const idx = rs.findIndex((r: any) => r.nodeId === nodeId);
                    if (idx >= 0) {
                      rs[idx] = { ...rs[idx], completed: true, inProgress: false, secondsRemaining: 0 };
                    }
                  }
                }
                // Eğitim kuyruğu
                let remainingElapsed = elapsedSec;
                const newQueue = [];
                for (const item of next.trainingQueue) {
                  if (remainingElapsed <= 0) { newQueue.push(item); continue; }
                  const updated = { ...item, secondsRemaining: Math.max(0, item.secondsRemaining - remainingElapsed) };
                  remainingElapsed -= item.secondsRemaining;
                  if (updated.secondsRemaining === 0) {
                    // Eğitim tamamlandı
                    const newTrained = { ...next.trainedUnits };
                    newTrained[updated.unitId] = (newTrained[updated.unitId] ?? 0) + updated.quantity;
                    next.trainedUnits = newTrained;
                  } else {
                    newQueue.push(updated);
                  }
                }
                next.trainingQueue = newQueue;
                return next;
              });
              setBuildings(updatedBuildings);
            } else {
              // Migration: gold ekle + tüm kapasiteleri güncelle
              let migratedRes = saved.resources.find((r: any) => r.key === 'gold')
                ? saved.resources
                : [...saved.resources, { key: 'gold', label: 'Altın', amount: 150, capacity: 1000000, productionPerHour: 0, icon: '🪙' }];
              // Kapasiteleri güncel değerlere zorla
              const CURRENT_CAPS: Record<string, number> = { cash: 10000000, oil: 10000000, ore: 10000000, gold: 1000000 };
              migratedRes = migratedRes.map((r: any) => CURRENT_CAPS[r.key] ? { ...r, capacity: CURRENT_CAPS[r.key] } : r);
              setResources(migratedRes as Resource[]);
              setBuildings(saved.buildings);
            }
            setResearchStates(saved.researchStates);
            // March timer'ını restore ederken geçen süreyi düş
            if (saved.march) {
              const elapsed = saved.march.savedAt
                ? Math.floor((Date.now() - saved.march.savedAt) / 1000)
                : 0;
              const remaining = Math.max(0, saved.march.secondsRemaining - elapsed);
              if (remaining > 0) {
                setActiveMarch({ ...saved.march, secondsRemaining: remaining });
              } else {
                // Süre dolmuş — march'ı temizle, birimler zaten gitti
                setActiveMarch(null);
              }
            } else {
              setActiveMarch(null);
            }
            const restoredReports = saved.battleReports ?? [];
            setBattleReports(restoredReports);
            battleReportsRef.current = restoredReports;
            setAllianceContribution(saved.allianceContribution ?? 0);
            setWarPower(saved.warPower ?? 0);
            setBirlikler(saved.birlikler ?? []);
            if (saved.pvpCooldowns) setPvpCooldowns(saved.pvpCooldowns);
            if (saved.revengeTargets) setRevengeTargets(saved.revengeTargets);
            if (saved.shieldUntil && saved.shieldUntil > Date.now()) setShieldUntil(saved.shieldUntil);
            // Wins/Losses: persistent sayaçları yükle (yoksa battleReports'tan türet)
            const restoredBrs = saved.battleReports ?? [];
            const restoredWins = saved.wins ?? restoredBrs.filter((r: any) => r.won).length;
            const restoredLosses = saved.losses ?? restoredBrs.filter((r: any) => !r.won).length;
            setWins(restoredWins);
            setLosses(restoredLosses);
            winsRef.current = restoredWins;
            lossesRef.current = restoredLosses;
            // Görevleri merge et + mevcut durumla senkronize et
            const savedMissions = saved.missions ?? [];
            const merged = INITIAL_MISSIONS.map(ini => {
              const existing = savedMissions.find((s: Mission) => s.id === ini.id);
              return existing ? { ...ini, currentCount: existing.currentCount, completed: existing.completed, claimed: existing.claimed } : ini;
            });
            // Senkronize: mevcut bina/birim/araştırma durumuna göre güncelle
            const blds = saved.buildings as BuildingState[];
            const rss = saved.researchStates ?? [];
            const brs = saved.battleReports ?? [];
            const totalUpgrades = blds.reduce((s, b) => s + Math.max(0, b.level - 1), 0);
            const totalTrained = blds.reduce((s, b) => {
              return s + Object.values(b.trainedUnits ?? {}).reduce((a: number, c: any) => a + (c as number), 0);
            }, 0);
            const totalResearch = rss.filter((r: any) => r.completed).length;
            const totalWins = brs.filter((r: any) => r.won).length;
            const totalAttacks = brs.length;
            // donate görevlerinin currentCount'u zaten doğrudan artırılıyor, contribution bazlı hesaplama yok

            const synced = merged.map(m => {
              if (m.claimed) return m; // zaten ödülü alınmış
              let count = m.currentCount;
              if (m.type === 'upgrade') {
                if (m.targetBuildingId) {
                  const b = blds.find(x => x.id === m.targetBuildingId);
                  count = Math.max(count, b ? Math.max(0, b.level - 1) : 0);
                } else {
                  count = Math.max(count, totalUpgrades);
                }
              } else if (m.type === 'train') {
                if ((m as any).targetUnitId) {
                  const uid = (m as any).targetUnitId;
                  const trained = blds.reduce((s, b) => s + ((b.trainedUnits ?? {})[uid] ?? 0), 0);
                  count = Math.max(count, trained);
                } else {
                  count = Math.max(count, totalTrained);
                }
              } else if (m.type === 'research') {
                count = Math.max(count, totalResearch);
              } else if (m.type === 'attack') {
                count = Math.max(count, (m as any).requiresWin ? totalWins : totalAttacks);
              }
              // donate tipi görevlerin currentCount'u zaten doğrudan artırılıyor
              const completed = count >= m.targetCount;
              return { ...m, currentCount: Math.min(count, m.targetCount), completed };
            });
            setMissions(synced);
          }
        } catch {}
      }
      // Takılı kalmış timer'ları tamamla (isUpgrading=true ama süre=0, araştırma aktif ama süre=0)
      setBuildings(prev => prev.map(b => {
        let next = b;
        if (next.isUpgrading && next.upgradeSecondsRemaining <= 0) {
          next = { ...next, isUpgrading: false, level: next.level + 1, upgradeSecondsRemaining: 0 };
        }
        if (next.activeResearchNodeId && next.researchSecondsRemaining <= 0) {
          // Araştırma tamamlanmış ama activeResearchNodeId temizlenmemiş
          const nodeId = next.activeResearchNodeId;
          setResearchStates(rs => rs.map(r =>
            r.nodeId === nodeId ? { ...r, completed: true, inProgress: false, secondsRemaining: 0 } : r
          ));
          next = { ...next, activeResearchNodeId: null, researchSecondsRemaining: 0 };
        }
        return next;
      }));

      // pendingGold kontrolü — admin tarafından eklenen altını al
      if (uid) {
        try {
          const pgSnap = await db.playerBases().doc(uid).get();
          const pending = pgSnap.exists() ? (pgSnap.data()?.pendingGold ?? 0) : 0;
          if (pending > 0) {
            setResources(curr => curr.map(r =>
              r.key === 'gold' ? { ...r, amount: Math.min(r.capacity, r.amount + pending) } : r
            ));
            // pendingGold'u sıfırla
            await db.playerBases().doc(uid).set({ pendingGold: 0 }, { merge: true });
            setToastMsg(t('common.goldGiftReceived', { amount: String(pending) }));
          }
        } catch (e) { console.warn('[pendingGold]', e); }

        // warRewards kontrolu — ittifak savasi odulleri
        try {
          const wrSnap = await db.players().doc(uid).get();
          const wr = wrSnap.exists() ? (wrSnap.data()?.warRewards ?? null) : null;
          if (wr && ((wr.cash ?? 0) > 0 || (wr.oil ?? 0) > 0 || (wr.ore ?? 0) > 0 || (wr.gold ?? 0) > 0)) {
            setResources(curr => curr.map(r => {
              const add = wr[r.key] ?? 0;
              return add > 0 ? { ...r, amount: Math.min(r.capacity, r.amount + add) } : r;
            }));
            await db.players().doc(uid).set({ warRewards: { cash: 0, oil: 0, ore: 0, gold: 0 } }, { merge: true });
            const cashK = Math.round((wr.cash ?? 0) / 1000);
            const oilK = Math.round((wr.oil ?? 0) / 1000);
            const oreK = Math.round((wr.ore ?? 0) / 1000);
            const goldAmt = wr.gold ?? 0;
            setToastMsg(`⚔️ Savaş ödülü: ${cashK}K 💵 ${oilK}K 🛢️ ${oreK}K ⛏️${goldAmt > 0 ? ` ${goldAmt} 🪙` : ''}`);
          }
        } catch (e) { console.warn('[warRewards]', e); }

        // pendingResources kontrolü — ittifak bağışı/kasadan gönderilen kaynaklar
        try {
          const prSnap = await db.playerBases().doc(uid).get();
          const pr = prSnap.exists() ? (prSnap.data()?.pendingResources ?? null) : null;
          if (pr && (pr.cash > 0 || pr.oil > 0 || pr.ore > 0)) {
            setResources(curr => curr.map(r => {
              const add = pr[r.key] ?? 0;
              return add > 0 ? { ...r, amount: Math.min(r.capacity, r.amount + add) } : r;
            }));
            await db.playerBases().doc(uid).set({ pendingResources: { cash: 0, oil: 0, ore: 0 } }, { merge: true });
            const total = (pr.cash ?? 0) + (pr.oil ?? 0) + (pr.ore ?? 0);
            setToastMsg(t('common.allianceDonationReceived', { amount: String(Math.round(total / 1000)) }));
          }
        } catch (e) { console.warn('[pendingResources]', e); }
      }

      setLoaded(true);
      // 2 saniye sonra güncel playerPower'ı Firestore'a yaz
      if (uid) {
        setTimeout(() => {
          const blds = buildingsRef.current;
          const bp = blds.reduce((s: number, b: any) => { const l = b.level ?? 1; return s + l * (l + 1) / 2 * 100; }, 0);
          const rp = researchRef.current.filter((r: any) => r.completed).reduce((s: number, r: any) => {
            const node = RESEARCH_MAP[r.nodeId];
            return s + (node?.tier ?? 1) * 50;
          }, 0);
          const hqLv = blds.find((b: any) => b.id === 'hq')?.level ?? 1;
          const pw = bp + rp;
          syncPlayerProfile(uid, { playerPower: pw, hqLevel: hqLv });
        }, 2000);
        migratePlayerPower();
      }
    })();
  }, [uid]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const marchToSave = marchRef.current
        ? { ...marchRef.current, savedAt: Date.now() }
        : null;
      const payload: PersistedGameState = {
        schemaVersion: SCHEMA_VERSION,
        lastSavedAt: Date.now(),
        resources: resourcesRef.current,
        buildings: buildingsRef.current,
        researchStates: researchRef.current,
        march: marchToSave,
        battleReports: battleReportsRef.current,
        allianceContribution,
        missions,
        warPower,
        birlikler: birliklerRef.current,
        pvpCooldowns: pvpCooldownsRef.current,
        revengeTargets: revengeTargetsRef.current,
        shieldUntil: shieldUntilRef.current,
        wins: winsRef.current,
        losses: lossesRef.current,
      };
      // Yerel kayıt (offline cache)
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, uid }));
      // Bulut kayıt (Firestore)
      if (uid) {
        const _user = getCurrentUser();
        saveToCloud(uid, payload, _user?.displayName ?? undefined);
        const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
        // playerPower: bina + araştırma + warPower (birim dahil değil)
        const _bp = buildingsRef.current.reduce((s, b) => s + b.level * (b.level + 1) / 2 * 100, 0);
        const _rp = researchRef.current.filter(r => r.completed).reduce((s, r) => {
          const node = RESEARCH_MAP[r.nodeId];
          return s + (node?.tier ?? 1) * 50;
        }, 0);
        const _basePower = _bp + _rp;
        const pw = _basePower + Math.min(warPower, _basePower);
        syncPlayerProfile(uid, { warPower, hqLevel: hqLv, playerPower: pw });
      }
    }, SAVE_BATCH_DELAY_MS);
  }, [allianceContribution, missions, warPower, uid]);

  // ── Web: sayfa kapanırken anında kaydet ────────────────────
  const saveNow = useCallback(() => {
    const marchToSave = marchRef.current
      ? { ...marchRef.current, savedAt: Date.now() }
      : null;
    const payload: PersistedGameState = {
      schemaVersion: SCHEMA_VERSION,
      lastSavedAt: Date.now(),
      resources: resourcesRef.current,
      buildings: buildingsRef.current,
      researchStates: researchRef.current,
      march: marchToSave,
      battleReports: battleReportsRef.current,
      allianceContribution,
      missions,
      warPower,
      birlikler: birliklerRef.current,
      pvpCooldowns,
      revengeTargets,
      shieldUntil: shieldUntilRef.current,
      wins: winsRef.current,
      losses: lossesRef.current,
    };
    const json = JSON.stringify(payload);
    // Web'de localStorage senkron — beforeunload'da kesin kaydedilir
    try { (globalThis as any).localStorage?.setItem(STORAGE_KEY, JSON.stringify({ ...payload, uid })); } catch {}
    AsyncStorage.setItem(STORAGE_KEY, json);
    if (uid) {
      const _user = getCurrentUser();
      saveToCloud(uid, payload, _user?.displayName ?? undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceContribution, missions, warPower, uid]);

  // pvpCooldowns değiştiğinde ANINDA kaydet (cooldown persist — 4sn gecikme yüzünden kayboluyordu)
  useEffect(() => {
    if (!loaded) return;
    if (Object.keys(pvpCooldowns).length > 0) saveNow();
  }, [pvpCooldowns, loaded, saveNow]);

  // ── Combat function refs (updated after useCombat hook) ─���───
  const resolveMarchRef = useRef<(march: March) => void>(() => {});
  const resolveIncomingAttackRef = useRef<(attack: IncomingAttack) => void>(() => {});

  // ── Arka plandan dönüşte timer catch-up ─────────────────────
  const backgroundAtRef = useRef<number>(0);

  /** Belirli süreyi tüm aktif timer'lardan düş (bina, araştırma, eğitim) */
  const advanceTimers = useCallback((elapsedSec: number) => {
    if (elapsedSec <= 0) return;

    // Kaynak üretimi
    setResources(current =>
      current.map(r => {
        const basePerSec = r.productionPerHour / 3600;
        const buildingPerSec = buildingsRef.current.reduce((sum, b) => {
          const def = BUILDING_DEFINITIONS[b.id];
          if (def.produceResource === r.key && def.baseProdPerHour) {
            return sum + (def.baseProdPerHour * b.level) / 3600;
          }
          return sum;
        }, 0);
        let interestPerSec = 0;
        if (r.key === 'cash') {
          const bank = buildingsRef.current.find(b => b.id === 'bank');
          const bankDef = BUILDING_DEFINITIONS.bank;
          if (bank && bankDef.interestRatePerLevel) {
            interestPerSec = r.amount * bankDef.interestRatePerLevel * bank.level / 3600;
          }
        }
        const total = basePerSec + buildingPerSec + interestPerSec;
        if (total <= 0) return r;
        return { ...r, amount: Math.min(r.capacity, r.amount + total * elapsedSec) };
      }),
    );

    // Bina / araştırma / eğitim timer'ları
    setBuildings(current =>
      current.map(b => {
        let next = { ...b };
        if (next.isUpgrading && next.upgradeSecondsRemaining > 0) {
          next.upgradeSecondsRemaining = Math.max(0, next.upgradeSecondsRemaining - elapsedSec);
          if (next.upgradeSecondsRemaining === 0) {
            next.level = next.level + 1;
            next.isUpgrading = false;
          }
        }
        if (next.activeResearchNodeId && next.researchSecondsRemaining > 0) {
          next.researchSecondsRemaining = Math.max(0, next.researchSecondsRemaining - elapsedSec);
          if (next.researchSecondsRemaining === 0) {
            const nodeId = next.activeResearchNodeId;
            next.activeResearchNodeId = null;
            setResearchStates(rs =>
              rs.map(r => r.nodeId === nodeId ? { ...r, completed: true, inProgress: false, secondsRemaining: 0 } : r),
            );
          }
        }
        if (next.trainingQueue.length > 0) {
          let remaining = elapsedSec;
          const queue = [...next.trainingQueue];
          const newTrained = { ...next.trainedUnits };
          while (remaining > 0 && queue.length > 0) {
            const head = { ...queue[0] };
            if (head.secondsRemaining <= remaining) {
              remaining -= head.secondsRemaining;
              newTrained[head.unitId] = (newTrained[head.unitId] ?? 0) + head.quantity;
              queue.shift();
            } else {
              head.secondsRemaining -= remaining;
              queue[0] = head;
              remaining = 0;
            }
          }
          next.trainingQueue = queue;
          next.trainedUnits = newTrained;
        }
        return next;
      }),
    );

    // Sefer (march) timer catch-up
    setActiveMarch(current => {
      if (!current) return null;
      const next = { ...current, secondsRemaining: Math.max(0, current.secondsRemaining - elapsedSec) };
      if (next.secondsRemaining === 0) {
        const isCpu = MAP_TARGETS.some(t => t.id === next.targetId);
        if (isCpu) {
          resolveMarchRef.current(next);
          return null;
        }
        return next; // PvP — useEffect çözecek
      }
      return next;
    });

    // Gelen saldırı timer catch-up
    setIncomingAttack(current => {
      if (!current) return null;
      const next = { ...current, secondsRemaining: Math.max(0, current.secondsRemaining - elapsedSec) };
      if (next.secondsRemaining === 0) {
        resolveIncomingAttackRef.current(next);
        return null;
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Web: sayfa kapanırken kaydet + visibility change catch-up
    const g = globalThis as any;
    if (g.window?.addEventListener) {
      const handleUnload = () => saveNow();
      const handleVisibility = () => {
        if (g.document?.visibilityState === 'hidden') {
          backgroundAtRef.current = Date.now();
          saveNow();
        } else if (g.document?.visibilityState === 'visible' && backgroundAtRef.current > 0) {
          const elapsed = Math.floor((Date.now() - backgroundAtRef.current) / 1000);
          backgroundAtRef.current = 0;
          if (elapsed > 2) advanceTimers(elapsed);
        }
      };
      g.window.addEventListener('beforeunload', handleUnload);
      g.document?.addEventListener?.('visibilitychange', handleVisibility);
      return () => {
        g.window.removeEventListener('beforeunload', handleUnload);
        g.document?.removeEventListener?.('visibilitychange', handleVisibility);
      };
    }
    // Android/iOS: arka plana alındığında kaydet, ön plana dönünce catch-up
    const { AppState } = require('react-native') as any;
    const sub = AppState.addEventListener('change', (state: string) => {
      if (state === 'background' || state === 'inactive') {
        backgroundAtRef.current = Date.now();
        saveNow();
      } else if (state === 'active' && backgroundAtRef.current > 0) {
        const elapsed = Math.floor((Date.now() - backgroundAtRef.current) / 1000);
        backgroundAtRef.current = 0;
        if (elapsed > 2) {
          advanceTimers(elapsed);
          saveNow();
        }
      }
    });
    return () => sub?.remove?.();
  }, [saveNow, loaded, advanceTimers]);

  // ── Görev senkronizasyonu — mevcut state'e göre güncelle ────
  useEffect(() => {
    if (!loaded) return;
    setMissions(prev => syncMissionProgress(prev, buildings, researchStates, battleReports));
  }, [loaded, buildings, researchStates, battleReports]);

  // Keep refs in sync
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { resourcesRef.current = resources; }, [resources]);
  useEffect(() => { researchRef.current = researchStates; }, [researchStates]);
  useEffect(() => { marchRef.current = activeMarch; }, [activeMarch]);
  useEffect(() => { birliklerRef.current = birlikler; }, [birlikler]);
  useEffect(() => { battleReportsRef.current = battleReports; }, [battleReports]);
  const winsRef = useRef(wins);
  useEffect(() => { winsRef.current = wins; }, [wins]);
  const lossesRef = useRef(losses);
  useEffect(() => { lossesRef.current = losses; }, [losses]);
  const pvpCooldownsRef = useRef(pvpCooldowns);
  useEffect(() => { pvpCooldownsRef.current = pvpCooldowns; }, [pvpCooldowns]);
  const revengeTargetsRef = useRef(revengeTargets);
  useEffect(() => { revengeTargetsRef.current = revengeTargets; }, [revengeTargets]);
  const shieldUntilRef = useRef(shieldUntil);
  useEffect(() => { shieldUntilRef.current = shieldUntil; }, [shieldUntil]);

  // ── Tick (1s) ───────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      // Resource production (base + bina + banka faizi)
      setResources(current =>
        current.map(r => {
          const basePerSec = r.productionPerHour / 3600;
          const buildingPerSec = buildingsRef.current.reduce((sum, b) => {
            const def = BUILDING_DEFINITIONS[b.id];
            if (def.produceResource === r.key && def.baseProdPerHour) {
              return sum + (def.baseProdPerHour * b.level) / 3600;
            }
            return sum;
          }, 0);
          let interestPerSec = 0;
          if (r.key === 'cash') {
            const bank = buildingsRef.current.find(b => b.id === 'bank');
            const bankDef = BUILDING_DEFINITIONS.bank;
            if (bank && bankDef.interestRatePerLevel) {
              interestPerSec = r.amount * bankDef.interestRatePerLevel * bank.level / 3600;
            }
          }
          const total = basePerSec + buildingPerSec + interestPerSec;
          if (total <= 0) return r;
          return { ...r, amount: Math.min(r.capacity, r.amount + total) };
        }),
      );

      // Building timers
      const upgradeCompleted: { id: BuildingId; newLevel: number }[] = [];
      setBuildings(current =>
        current.map(b => {
          let next = { ...b };

          if (next.isUpgrading && next.upgradeSecondsRemaining > 0) {
            next.upgradeSecondsRemaining = Math.max(0, next.upgradeSecondsRemaining - 1);
            if (next.upgradeSecondsRemaining === 0) {
              next.level = next.level + 1;
              next.isUpgrading = false;
              upgradeCompleted.push({ id: b.id, newLevel: next.level });
            }
          }

          if (next.activeResearchNodeId && next.researchSecondsRemaining > 0) {
            next.researchSecondsRemaining = Math.max(0, next.researchSecondsRemaining - 1);
            if (next.researchSecondsRemaining === 0) {
              const nodeId = next.activeResearchNodeId;
              next.activeResearchNodeId = null;
              setResearchStates(rs =>
                rs.map(r =>
                  r.nodeId === nodeId
                    ? { ...r, completed: true, inProgress: false, secondsRemaining: 0 }
                    : r,
                ),
              );
              const rNode = RESEARCH_MAP[nodeId];
              setToastMsg(t('common.researchCompleted', { name: rNode?.label ?? t('common.research') }));
            }
          }

          // Training queue
          if (next.trainingQueue.length > 0) {
            const [head, ...rest] = next.trainingQueue;
            const updated = { ...head, secondsRemaining: Math.max(0, head.secondsRemaining - 1) };
            if (updated.secondsRemaining === 0) {
              // Batch complete
              const newTrained = { ...next.trainedUnits };
              newTrained[updated.unitId] = (newTrained[updated.unitId] ?? 0) + updated.quantity;
              next.trainedUnits = newTrained;
              next.trainingQueue = rest;
            } else {
              next.trainingQueue = [updated, ...rest];
            }
          }

          return next;
        }),
      );
      if (upgradeCompleted.length > 0) {
        const { id: cId, newLevel } = upgradeCompleted[0];
        const def = BUILDING_DEFINITIONS[cId];
        setToastMsg(t('common.buildingUpgraded', { name: def.label, level: String(newLevel) }));
        // Yükseltme bittiğinde görev güncelle
        setMissions(prev =>
          prev.map(m => {
            if (m.type === 'upgrade' && !m.completed) {
              if (m.targetBuildingId && m.targetBuildingId !== cId) return m;
              const next = { ...m, currentCount: m.currentCount + 1 };
              if (next.currentCount >= next.targetCount) next.completed = true;
              return next;
            }
            return m;
          }),
        );
      }

      // March tick
      setActiveMarch(current => {
        if (!current) return null;
        const next = { ...current, secondsRemaining: Math.max(0, current.secondsRemaining - 1) };
        if (next.secondsRemaining === 0) {
          const isCpu = MAP_TARGETS.some(t => t.id === next.targetId);
          if (isCpu) {
            resolveMarchRef.current(next);
            return null;
          }
          // PvP march — null yapma, useEffect çözecek
          return next;
        }
        return next;
      });

      // Incoming attack tick
      setIncomingAttack(current => {
        if (!current) return null;
        const next = { ...current, secondsRemaining: Math.max(0, current.secondsRemaining - 1) };
        if (next.secondsRemaining === 0) {
          resolveIncomingAttackRef.current(next);
          return null;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // resolveMarch and resolveIncomingAttack are now in useCombat hook


  // ── Economy helpers (extracted to useEconomy) ────────────────
  const {
    getResource, canAfford, deductCost,
    goldAmount, canAffordGold, addGold, deductGold,
    addResource, buyResourceWithGold,
    calcGoldCost, calcUpgradeGoldCost,
  } = useEconomy(resourcesRef, resources, setResources, buildingsRef, scheduleSave, saveNow, setToastMsg);

  // ── Base helpers (extracted to useBase) ──────────────────────
  const {
    getBuilding, getUpgradeCost, getUpgradeTime, canUpgradeBuilding, upgradeBuilding,
    isResearched, getAvailableResearch, canStartResearch, startResearch, getUnlockedUnitsForBuilding,
    getTrainedCount, getTotalTrainedUnits, getUnitCap, getBuildingUnitCount,
    getTrainingCost, getMaxTrainable, canStartTraining, startTraining, adjustTrainedUnits,
    addBirlik, removeBirlik,
  } = useBase(
    buildingsRef, setBuildings,
    researchRef, setResearchStates,
    birliklerRef, setBirlikler,
    resourcesRef,
    setMissions,
    canAfford, deductCost,
    scheduleSave, saveNow,
  );

  // ── Game Shell helpers (extracted to useGameShell) ───────────
  const {
    canDonate, donate, canRequestHelp, requestHelp,
    claimMissionReward, speedUpWithGold,
  } = useGameShell(
    buildingsRef, resourcesRef, researchRef,
    setResources, setBuildings, setResearchStates,
    setMissions, setAllianceContribution, setToastMsg,
    allianceContribution, missions,
    canAfford, deductCost,
    canAffordGold, deductGold, calcGoldCost,
    scheduleSave, saveNow,
  );

  // ── Player Power ─────────────────────────────────────────────
  const playerPower = useMemo(
    () => calcPlayerPower(buildings, researchStates, warPower, UNIT_MAP, RESEARCH_MAP),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildings, researchStates, warPower],
  );
  playerPowerRef.current = playerPower;

  const hqLevelForAlliance = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
  const handleDonateSuccess = useCallback(() => {
    setAllianceContribution(c => c + 1);
    setMissions(prev =>
      prev.map(m => {
        if (m.type === 'donate' && !m.completed) {
          const next = { ...m, currentCount: m.currentCount + 1 };
          if (next.currentCount >= next.targetCount) next.completed = true;
          return next;
        }
        return m;
      }),
    );
    scheduleSave();
  }, [scheduleSave]);
  const alliance = useAllianceState(uid ?? null, allianceHookDisplayName, playerPower, hqLevelForAlliance, canAffordGold, deductGold, canAfford, deductCost, handleDonateSuccess);
  const allianceRef = useRef(alliance);
  useEffect(() => { allianceRef.current = alliance; }, [alliance]);

  // ── Combat helpers (extracted to useCombat) ────────────────
  const {
    getTotalAttackPower, canAttack, attackTarget, cancelMarch,
    resolveMarch, resolveIncomingAttack,
    addBattleReport, clearLastBattleReport,
    launchJointAttack,
    getPvPCooldown, refreshPvPTargets, attackPvPTarget,
    buyShield, buyWarPower,
  } = useCombat(
    uid ?? null,
    // Refs
    buildingsRef, resourcesRef, researchRef, marchRef,
    birliklerRef, battleReportsRef, playerPowerRef,
    firestoreMarchIdRef, allianceRef, shieldUntilRef,
    // State setters
    setResources, setBuildings, setActiveMarch, setBattleReports,
    setIncomingAttack, setBirlikler, setWarPower, setShieldUntil,
    setLastBattleReport, setMissions, setToastMsg,
    setPvpTargets, setPvpLoading, setPvpCooldowns, setRevengeTargets,
    // State values
    pvpCooldowns, shieldUntil, warPower, playerPower,
    // Economy functions
    canAffordGold, deductGold, canAfford,
    // Base functions
    getTotalTrainedUnits,
    // Save functions
    scheduleSave, saveNow,
    // Wins/Losses persistent counters
    winsRef, lossesRef, setWins, setLosses,
  );
  resolveMarchRef.current = resolveMarch;
  resolveIncomingAttackRef.current = resolveIncomingAttack;


  // playerPower veya savaş sonuçları değiştiğinde Firestore'a yaz (sıralama için)
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (!uid || !loaded) return;
    // İlk yüklemede battleReports restore edilmesini bekle
    if (!hasSyncedRef.current) {
      const timer = setTimeout(() => {
        hasSyncedRef.current = true;
        const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
        let dn: string | undefined;
        try { const u = getCurrentUser(); dn = u?.displayName ?? undefined; } catch {}
        syncPlayerProfile(uid, {
          displayName: dn, warPower, hqLevel: hqLv, playerPower,
          wins: winsRef.current,
          losses: lossesRef.current,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
    // Sonraki değişikliklerde hemen sync
    const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
    let dn2: string | undefined;
    try { const u = getCurrentUser(); dn2 = u?.displayName ?? undefined; } catch {}
    syncPlayerProfile(uid, {
      displayName: dn2, warPower, hqLevel: hqLv, playerPower,
      wins: winsRef.current,
      losses: lossesRef.current,
    });
  }, [playerPower, uid, loaded, wins, losses, warPower]);

  // ── PvP callbacks (extracted to useCombat) ──────────────────

  // Gelen PvP saldırıları dinle
  useEffect(() => {
    if (!uid) return;
    const resolvedIds = new Set<string>(); // Zaten çözümlenen march id'leri
    const unsubscribe = listenIncomingMarches(uid, (marches) => {
      // Sadece marching olanlar
      const marchingOnes = marches.filter(m => m.status === 'marching');
      // Resolved olmuş ama henüz lokal olarak çözümlenmemiş olanlar
      // Sadece son 5 dakika içinde varış zamanı olanları handle et (eski olanları atla)
      const recentCutoff = Date.now() - 5 * 60 * 1000;
      const newlyResolved = marches.filter(m =>
        m.status === 'resolved' &&
        !resolvedIds.has(m.id) &&
        m.arrivesAt > recentCutoff
      );

      for (const m of newlyResolved) {
        resolvedIds.add(m.id);
        const br = (m as any).battleResult;
        if (br) {
          // Saldıran zaten çözmüş — sonucu direkt uygula (savunan perspektifinden)
          const defenderWon = !br.won; // saldıran kazandıysa savunan kaybetti
          // transfer değerleri: kaybeden ne kaybediyorsa kazanan o kadarını alır
          const tp = br.transferPower ?? Math.abs(br.powerChange);
          const tc = br.transferCash ?? Math.abs(br.rewardCash);
          const to = br.transferOil ?? Math.abs(br.rewardOil);
          const tr = br.transferOre ?? Math.abs(br.rewardOre);

          let cashChange: number, oilChange: number, oreChange: number, pwChange: number;
          if (defenderWon) {
            // Savunan kazandı — aynı transfer miktarını al + intikam hakkı
            cashChange = tc;
            oilChange = to;
            oreChange = tr;
            pwChange = tp;
            setWarPower(prev => prev + pwChange);
            // Saldırana intikam hakkı ver (sıralama ±5 kuralını bypass eder)
            if (m.attackerUid) {
              setRevengeTargets(prev => ({ ...prev, [m.attackerUid]: Date.now() }));
            }
          } else {
            // Savunan kaybetti — aynı transfer miktarını kaybet
            cashChange = -tc;
            oilChange = -to;
            oreChange = -tr;
            pwChange = -tp;
            setWarPower(prev => Math.max(0, prev + pwChange));
            setShieldUntil(Date.now() + 4 * 60 * 60 * 1000);
            setBirlikler([]);
          }
          setResources(curr => curr.map(r => {
            if (r.key === 'cash') return { ...r, amount: defenderWon ? Math.min(r.capacity, r.amount + cashChange) : Math.max(0, r.amount + cashChange) };
            if (r.key === 'oil') return { ...r, amount: defenderWon ? Math.min(r.capacity, r.amount + oilChange) : Math.max(0, r.amount + oilChange) };
            if (r.key === 'ore') return { ...r, amount: defenderWon ? Math.min(r.capacity, r.amount + oreChange) : Math.max(0, r.amount + oreChange) };
            return r;
          }));

          // Kayıpları düş (savunanın birimleri = defenderResults)
          if (!defenderWon && br.defenderResults) {
            // Kaybettiyse tüm birimler gider
            setBuildings(prev => prev.map(b => ({ ...b, trainedUnits: {} })));
          } else if (br.defenderResults) {
            // Kazandıysa kayıpları düş
            setBuildings(prev => prev.map(b => {
              const newTrained = { ...b.trainedUnits };
              let changed = false;
              for (const dr of br.defenderResults) {
                if (dr.destroyed > 0 && (newTrained[dr.unitId] ?? 0) > 0) {
                  newTrained[dr.unitId] = Math.max(0, (newTrained[dr.unitId] ?? 0) - dr.destroyed);
                  changed = true;
                }
              }
              return changed ? { ...b, trainedUnits: newTrained } : b;
            }));
          }

          // Savaş raporu — saldıranın sonucuyla aynı birim detayları
          const report: BattleReport = {
            id: `report_def_${Date.now()}`,
            targetId: 'defense',
            targetName: `${m.attackerName} Saldırısı`,
            timestamp: Date.now(),
            won: defenderWon,
            attackPower: br.attackPower,
            defensePower: br.defensePower,
            unitsLost: defenderWon ? 0 : br.defenderResults?.reduce((s: number, d: any) => s + (d.destroyed ?? d.count ?? 0), 0) ?? 0,
            rewardCash: cashChange,
            rewardOil: oilChange,
            rewardOre: oreChange,
            powerChange: pwChange,
            attackerResults: br.attackerResults,   // düşman birimleri
            defenderResults: br.defenderResults,   // senin birimlerin
          };
          addBattleReport(report);
          setLastBattleReport(report);
          scheduleSave();

          // İttifak savaşı: savunan tarafta gelen saldırı düşman ittifak üyesindense skor + rapor ekle
          (async () => {
            try {
              const allianceNow = allianceRef.current;
              const aw = allianceNow?.myAllianceData?.activeWar;
              const myAid = allianceNow?.myAllianceId;
              if (aw && myAid && m.attackerUid) {
                const atkSnap = await db.players().doc(m.attackerUid).get();
                const atkData = atkSnap.exists() ? atkSnap.data() as any : null;
                const isWarEnemy = atkData?.allianceId === aw.enemyAllianceId || atkData?.allianceTag === aw.enemyTag;
                if (isWarEnemy) {
                  const warScore = defenderWon ? 10 : 0;
                  let myName = 'Komutan';
                  try { const u = getCurrentUser(); if (u?.displayName) myName = u.displayName; } catch {}
                  await addWarScoreSvc(myAid, aw.enemyAllianceId, warScore, myName, m.attackerName, defenderWon);
                  await saveWarBattleLog(myAid, report, defenderWon ? myName : m.attackerName, warScore);
                }
              }
            } catch (err) { console.warn('[PvP] Defender war score error:', err); }
          })();

          // İstatistikleri güncelle
          if (uid) {
            setTimeout(() => {
              const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
              const brs = battleReportsRef.current;
              syncPlayerProfile(uid, {
                warPower, hqLevel: hqLv, playerPower: playerPowerRef.current,
                wins: brs.filter(r => r.won).length,
                losses: brs.filter(r => !r.won).length,
              });
            }, 1000);
          }
        } else {
          // battleResult yok — eski yöntemle çöz
          resolveIncomingAttackRef.current({
            id: m.id,
            attackerUid: m.attackerUid,
            attackerName: m.attackerName,
            unitCount: m.committedUnits,
            attackUnits: m.marchUnits.map(u => ({ unitId: u.unitId, count: u.count })),
            totalSeconds: m.travelSeconds,
            secondsRemaining: 0,
            isWarAttack: (m as any).isWarAttack ?? false,
            warAllianceId: (m as any).allianceId,
            warEnemyAllianceId: (m as any).enemyAllianceId,
          });
        }
      }
      // Eski resolved'ları da resolvedIds'e ekle (tekrar tetiklenmesin)
      for (const m of marches) {
        if (m.status === 'resolved') resolvedIds.add(m.id);
      }

      if (marchingOnes.length === 0) { setIncomingAttack(null); }

      // Aktif (süresi dolmamış) saldırıları bul
      const active = marchingOnes.filter(m => {
        const remaining = Math.floor((m.arrivesAt - Date.now()) / 1000);
        return remaining > 0;
      });
      // Bot saldırıları server-side çözümleniyor — client sadece banner gösterir
      // Aktif saldırı varsa banner göster, yoksa temizle
      if (active.length > 0) {
        const m = active[0];
        const remaining = Math.max(1, Math.floor((m.arrivesAt - Date.now()) / 1000));
        setIncomingAttack({
          id: m.id,
          attackerUid: m.attackerUid,
          attackerName: m.attackerName,
          unitCount: m.committedUnits,
          attackUnits: m.marchUnits.map(u => ({ unitId: u.unitId, count: u.count })),
          totalSeconds: m.travelSeconds,
          secondsRemaining: remaining,
        });
      } else {
        setIncomingAttack(null);
      }
    });
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // PvP march varış — savunanın verisini oku ve savaşı çöz
  useEffect(() => {
    if (!uid || !activeMarch || activeMarch.secondsRemaining > 0) return;
    // CPU hedefi mi PvP mi?
    const isCpuTarget = MAP_TARGETS.some(t => t.id === activeMarch.targetId);
    if (isCpuTarget) return; // CPU savaşı mevcut sistemde çözülüyor

    // Güvenlik: 15 saniye içinde çözülmezse zorla temizle
    const safetyTimer = setTimeout(() => {
      if (marchRef.current && marchRef.current.secondsRemaining <= 0) {
        console.warn('[PvP] Safety timeout — march temizlendi');
        setActiveMarch(null);
        scheduleSave();
      }
    }, 15000);

    // PvP savaş çözümle — CPU saldırı ile aynı mantık
    (async () => {
      let defBase;
      try {
        defBase = await loadDefenderBase(activeMarch.targetId);
      } catch (err) {
        console.warn('[PvP] defBase yüklenemedi:', err);
      }
      if (!defBase) { setActiveMarch(null); scheduleSave(); return; }

      // Savunanın birimlerini topla (tüm ordu envanteri + birlikler)
      const defUnits = collectDefenderUnits(defBase.buildings ?? [], defBase.birlikler ?? []);

      // Araştırma bonusları
      const branchBonus = buildResearchBranchBonus(researchRef.current, RESEARCH_MAP);

      // Savaş çöz — her zaman resolveUnitCombat kullan
      const result = resolveUnitCombat({
        attackerUnits: activeMarch.marchUnits ?? [],
        defenderUnits: defUnits,
        attackerResearchBonus: branchBonus,
      });

      const won = result.won;
      const totalAtkPower = result.totalAttackPower;
      const totalDefPower = result.totalDefensePower;
      const attackerResults = result.attackerResults;
      const defenderResults = result.defenderResults;
      const losses = result.totalAttackerLosses;

      // Saldıranın kayıplarını birliklerden düş
      if (!won) {
        setBirlikler([]);
      } else if (attackerResults.length > 0) {
        setBirlikler(prev => applyBirlikLosses(prev, attackerResults));
      }

      // ── Kaynak/güç transferi: kaybeden %20 kaybeder, kazanan %20 alır ──
      const myRes = resourcesRef.current;
      const myCash = myRes.find(r => r.key === 'cash')?.amount ?? 0;
      const myOil = myRes.find(r => r.key === 'oil')?.amount ?? 0;
      const myOre = myRes.find(r => r.key === 'ore')?.amount ?? 0;
      const defRes = defBase.resources ?? [];
      const defCash = (defRes.find((r: any) => r.key === 'cash')?.amount ?? 0);
      const defOil = (defRes.find((r: any) => r.key === 'oil')?.amount ?? 0);
      const defOre = (defRes.find((r: any) => r.key === 'ore')?.amount ?? 0);
      const defPlayerPower = calcDefenderPower(defBase.buildings ?? [], UNIT_MAP, defBase.warPower ?? 0);
      const { lootCash, lootOil, lootOre, powerChange, transferCash, transferOil, transferOre, transferPower } = calcPvPTransfer(
        won,
        { cash: myCash, oil: myOil, ore: myOre },
        { cash: defCash, oil: defOil, ore: defOre },
        playerPower,
        defPlayerPower,
      );

      setWarPower(prev => won ? prev + transferPower : Math.max(0, prev - transferPower));

      setResources(curr => curr.map(r => {
        if (r.key === 'cash') return { ...r, amount: won ? Math.min(r.capacity, r.amount + lootCash) : Math.max(0, r.amount + lootCash) };
        if (r.key === 'oil') return { ...r, amount: won ? Math.min(r.capacity, r.amount + lootOil) : Math.max(0, r.amount + lootOil) };
        if (r.key === 'ore') return { ...r, amount: won ? Math.min(r.capacity, r.amount + lootOre) : Math.max(0, r.amount + lootOre) };
        return r;
      }));

      const report: BattleReport = {
        id: `pvp_${Date.now()}`,
        targetId: activeMarch.targetId,
        targetName: `⚔️ ${activeMarch.targetName}`,
        timestamp: Date.now(),
        won,
        attackPower: totalAtkPower,
        defensePower: totalDefPower,
        unitsLost: losses,
        rewardCash: lootCash,
        rewardOil: lootOil,
        rewardOre: lootOre,
        powerChange,
        attackerResults,
        defenderResults,
      };
      addBattleReport(report);
      setLastBattleReport(report);

      // PvP cooldown: kazanınca cooldown — ittifak savaşı düşmanıysa 5dk, değilse 4 saat
      if (won && activeMarch?.targetId) {
        const allianceNow2 = allianceRef.current;
        const isWarTarget = !!allianceNow2?.myAllianceData?.activeWar;
        // İttifak savaşı düşmanıysa 2 saat cooldown, normal PvP 4 saat
        const cooldownOffset = isWarTarget ? (PVP_COOLDOWN_MS - 2 * 60 * 60 * 1000) : 0;
        setPvpCooldowns(prev => ({ ...prev, [activeMarch.targetId]: Date.now() - cooldownOffset }));
        setRevengeTargets(prev => {
          const next = { ...prev };
          delete next[activeMarch.targetId];
          return next;
        });
      }

      // Görevleri güncelle (CPU ile aynı)
      setMissions(prev =>
        prev.map(m => {
          if (m.type === 'attack' && !m.completed) {
            if (m.requiresWin && !won) return m;
            const next = { ...m, currentCount: m.currentCount + 1 };
            if (next.currentCount >= next.targetCount) next.completed = true;
            return next;
          }
          return m;
        }),
      );

      // İttifak savaşı puan ekleme — savaş tab'ından başlatılan saldırıysa
      if (activeMarch.isWarAttack) {
        try {
          const allianceNow = allianceRef.current;
          const aw = allianceNow?.myAllianceData?.activeWar;
          const myAid = allianceNow?.myAllianceId;
          if (aw && myAid) {
            const warScore = won ? 10 : 0;
            let myName = 'Komutan';
            try { const u = getCurrentUser(); if (u?.displayName) myName = u.displayName; } catch {}
            await addWarScoreSvc(myAid, aw.enemyAllianceId, warScore, myName, activeMarch.targetName, won);
            allianceRef.current?.refreshAllianceData?.();
            // Savaş raporunu ittifaka kaydet
            await saveWarBattleLog(myAid, report, myName, warScore);
          }
        } catch (err) { console.warn('[PvP] War score error:', err); }
      }

      // Firestore'a sonucu yaz (savunan da okuyabilsin)
      await resolvePvPMarch(activeMarch.id, {
        won,
        attackerUid: uid,
        defenderUid: activeMarch.targetId,
        attackPower: totalAtkPower,
        defensePower: totalDefPower,
        rewardCash: lootCash,
        rewardOil: lootOil,
        rewardOre: lootOre,
        powerChange,
        transferCash,
        transferOil,
        transferOre,
        transferPower,
        attackerResults,
        defenderResults,
      });

      // Savunanın kayıplarını Cloud Function ile düş
      try {
        const defLossMap: Record<string, number> = {};
        for (const dr of defenderResults) {
          if (dr.destroyed > 0) defLossMap[dr.unitId] = (defLossMap[dr.unitId] ?? 0) + dr.destroyed;
        }
        if (Object.keys(defLossMap).length > 0) {
          await fetch(`${CF_BASE}/deductDefenderLosses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ defenderUid: activeMarch.targetId, losses: defLossMap, attackerName: getCurrentUser()?.displayName ?? 'Oyuncu', won }),
          });
        }
      } catch (err) { console.warn('[PvP] Defender loss deduction error:', err); }

      setActiveMarch(null);
      scheduleSave();
      // İstatistikleri hemen güncelle — hem saldıran hem savunan
      if (uid) {
        setTimeout(() => {
          const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
          const brs = battleReportsRef.current;
          syncPlayerProfile(uid, {
            warPower, hqLevel: hqLv, playerPower: playerPowerRef.current,
            wins: brs.filter(r => r.won).length,
            losses: brs.filter(r => !r.won).length,
          });
          // Kaybeden tarafın playerPower'ını da güncelle (oyunda olmasa bile sıralamada güncel görünsün)
          const defUid = activeMarch?.targetId;
          if (defUid && won) {
            // Savunan kaybetti: warPower kaybını yansıt (birim kayıpları power'ı etkilemez)
            const newDefPower = Math.max(0, defPlayerPower - transferPower);
            syncPlayerProfile(defUid, { playerPower: newDefPower });
          } else if (defUid && !won) {
            // Savunan kazandı: warPower artışını yansıt
            const newDefPower = defPlayerPower + transferPower;
            syncPlayerProfile(defUid, { playerPower: newDefPower });
          }
        }, 1000);
      }
    })().catch(err => {
      console.warn('[PvP] Resolve hatası:', err);
      setActiveMarch(null);
      scheduleSave();
    });
    return () => clearTimeout(safetyTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, activeMarch?.secondsRemaining]);

  // ── Context Value ────────────────────────────────────────────
  const value = useMemo<DesertGameContextValue>(() => ({
    resources,
    getResource,
    canAfford,
    gold: goldAmount,
    canAffordGold,
    addGold,
    deductGold,
    addResource,
    speedUpWithGold,
    calcGoldCost,
    calcUpgradeGoldCost,
    buyResourceWithGold,
    buildings,
    getBuilding,
    canUpgradeBuilding,
    upgradeBuilding,
    getUpgradeCost,
    getUpgradeTime,
    researchStates,
    isResearched,
    canStartResearch,
    startResearch,
    getAvailableResearch,
    getUnlockedUnitsForBuilding,
    getTrainedCount,
    getTotalTrainedUnits,
    getUnitCap,
    getBuildingUnitCount,
    canStartTraining,
    startTraining,
    getTrainingCost,
    getMaxTrainable,
    adjustTrainedUnits,
    targets: getMapTargets().filter(t =>
      !t.minHQLevel ||
      (buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1) >= t.minHQLevel
    ),
    activeMarch,
    battleReports,
    wins,
    losses,
    incomingAttack,
    birlikler,
    addBirlik,
    removeBirlik,
    shieldUntil,
    buyShield,
    buyWarPower,
    playerPower,
    lastBattleReport,
    clearLastBattleReport,
    getTotalAttackPower,
    canAttack,
    attackTarget,
    cancelMarch,
    pvpTargets,
    pvpLoading,
    refreshPvPTargets,
    attackPvPTarget,
    getPvPCooldown,
    revengeTargets,
    allianceContribution,
    canDonate,
    donate,
    canRequestHelp,
    requestHelp,
    missions,
    claimMissionReward,
    launchJointAttack,
    uid: uid ?? null,
    displayName: (() => {
      try {
        const user = getCurrentUser();
        if (user?.displayName) return user.displayName;
      } catch {}
      return uid ? `Komutan_${uid.slice(0, 6)}` : 'Misafir';
    })(),
    toastMsg,
    clearToast: () => setToastMsg(null),
    alliance,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    resources, getResource, canAfford, buyResourceWithGold,
    buildings, getBuilding, canUpgradeBuilding, upgradeBuilding, getUpgradeCost, getUpgradeTime,
    researchStates, isResearched, canStartResearch, startResearch, getAvailableResearch, getUnlockedUnitsForBuilding,
    getTrainedCount, getTotalTrainedUnits, getUnitCap, getBuildingUnitCount, canStartTraining, startTraining, getTrainingCost, getMaxTrainable, adjustTrainedUnits,
    activeMarch, battleReports, wins, losses, incomingAttack, birlikler, addBirlik, removeBirlik, shieldUntil, buyShield, buyWarPower,
    playerPower, lastBattleReport, clearLastBattleReport, getTotalAttackPower, canAttack, attackTarget, cancelMarch,
    pvpTargets, pvpLoading, refreshPvPTargets, attackPvPTarget, getPvPCooldown, revengeTargets, scheduleSave,
    allianceContribution, canDonate, donate, canRequestHelp, requestHelp,
    missions, claimMissionReward,
    launchJointAttack,
    uid, toastMsg, alliance,
  ]);

  if (!loaded) return null;

  return (
    <DesertGameContext.Provider value={value}>
      {children}
    </DesertGameContext.Provider>
  );
}
