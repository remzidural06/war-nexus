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
import { UNIT_DEFINITIONS, UNIT_MAP, getUnitsForBuilding } from '../data/units';
import { RESEARCH_NODES, RESEARCH_MAP } from '../data/research';
import { MAP_TARGETS, getMapTargets } from '../data/mapTargets';
import { INITIAL_MISSIONS } from '../data/missions';
import { calcUpgradeCost, calcUpgradeTime, calcBattleOutcome, deductUnitsProportionally } from '../utils/economyMath';
import { resolveUnitCombat, resolveClassicCombat } from '../utils/combatEngine';
import { saveToCloud, loadFromCloud, syncPlayerProfile, migratePlayerPower } from '../services/cloudSave';
import { getCurrentUser } from '../services/authService';
import { db, CF_BASE } from '../services/firebase';
import { t } from '../i18n';
import { findPvPTargets, launchPvPAttack, loadDefenderBase, listenIncomingMarches, resolvePvPMarch, cancelPvPMarch } from '../services/pvpService';
import type { PvPTarget, FirestoreMarch } from '../services/pvpService';
import { useAllianceState } from './useAllianceState';
import { addWarScore as addWarScoreSvc, saveWarBattleLog, getMyAlliance } from '../services/allianceService';
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
  TrainingQueueItem,
} from './types';

// ─── Constants ────────────────────────────────────────────────
const STORAGE_KEY = 'war-nexus/v1';
const SAVE_BATCH_DELAY_MS = 4000;
const SCHEMA_VERSION = 3;

// Attack power is now read directly from UNIT_MAP (see units.ts)

// ─── Initial State ────────────────────────────────────────────
function makeInitialResources(): Resource[] {
  return [
    { key: 'cash', label: 'Nakit', amount: 2000, capacity: 10000000, productionPerHour: 400, icon: '💵' },
    { key: 'oil', label: 'Petrol', amount: 800, capacity: 10000000, productionPerHour: 200, icon: '🛢️' },
    { key: 'ore', label: 'Cevher', amount: 500, capacity: 10000000, productionPerHour: 150, icon: '⛏️' },
    { key: 'gold', label: 'Altın', amount: 150, capacity: 1000000, productionPerHour: 0, icon: '🪙' },
  ];
}

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
  attackPvPTarget: (target: PvPTarget, committedUnits: number, marchUnits: MarchUnit[]) => void;
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
  const [lastBattleReport, setLastBattleReport] = useState<BattleReport | null>(null);
  const [pvpTargets, setPvpTargets] = useState<PvPTarget[]>([]);
  const [pvpLoading, setPvpLoading] = useState(false);
  const [pvpCooldowns, setPvpCooldowns] = useState<Record<string, number>>({}); // targetUid → lastAttackTimestamp
  const [revengeTargets, setRevengeTargets] = useState<Record<string, number>>({}); // attackerUid → timestamp
  const PVP_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 saat

  const getPvPCooldown = useCallback((targetUid: string): number => {
    const lastAttack = pvpCooldowns[targetUid];
    if (!lastAttack) return 0;
    const remaining = Math.max(0, (lastAttack + PVP_COOLDOWN_MS) - Date.now());
    return Math.ceil(remaining / 1000); // saniye
  }, [pvpCooldowns]);
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

  /** setBattleReports + ref anında güncelle (save'de ref kullanıldığı için) */
  const addBattleReport = (report: BattleReport) => {
    setBattleReports(prev => {
      const next = [report, ...prev].slice(0, 20);
      battleReportsRef.current = next;
      return next;
    });
  };
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
              setResources(migratedRes);
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
          const pending = pgSnap.exists ? (pgSnap.data()?.pendingGold ?? 0) : 0;
          if (pending > 0) {
            setResources(curr => curr.map(r =>
              r.key === 'gold' ? { ...r, amount: Math.min(r.capacity, r.amount + pending) } : r
            ));
            // pendingGold'u sıfırla
            await db.playerBases().doc(uid).set({ pendingGold: 0 }, { merge: true });
            setToastMsg(t('common.goldGiftReceived', { amount: String(pending) }));
          }
        } catch (e) { console.warn('[pendingGold]', e); }

        // pendingResources kontrolü — ittifak bağışı/kasadan gönderilen kaynaklar
        try {
          const prSnap = await db.playerBases().doc(uid).get();
          const pr = prSnap.exists ? (prSnap.data()?.pendingResources ?? null) : null;
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
          const up = blds.reduce((s: number, b: any) => {
            for (const [uId, cnt] of Object.entries(b.trainedUnits ?? {})) {
              const def = UNIT_MAP[uId];
              s += (cnt as number) * ({ 1: 10, 2: 30, 3: 60, 4: 100 }[def?.tier ?? 1] ?? 10);
            }
            return s;
          }, 0);
          const rp = researchRef.current.filter((r: any) => r.completed).reduce((s: number, r: any) => {
            const node = RESEARCH_MAP[r.nodeId];
            return s + (node?.tier ?? 1) * 50;
          }, 0);
          const hqLv = blds.find((b: any) => b.id === 'hq')?.level ?? 1;
          const pw = bp + up + rp;
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
      };
      // Yerel kayıt (offline cache)
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, uid }));
      // Bulut kayıt (Firestore)
      if (uid) {
        const _user = getCurrentUser();
        saveToCloud(uid, payload, _user?.displayName ?? undefined);
        const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
        // playerPower doğrudan hesapla (closure'da mevcut değil)
        const blds = buildingsRef.current;
        const _bp = blds.reduce((s, b) => s + b.level * (b.level + 1) / 2 * 100, 0);
        const _up = blds.reduce((s, b) => {
          for (const [uId, cnt] of Object.entries(b.trainedUnits ?? {})) {
            const def = UNIT_MAP[uId];
            s += (cnt as number) * ({ 1: 10, 2: 30, 3: 60, 4: 100 }[def?.tier ?? 1] ?? 10);
          }
          return s;
        }, 0);
        const _rp = researchRef.current.filter(r => r.completed).reduce((s, r) => {
          const node = RESEARCH_MAP[r.nodeId];
          return s + (node?.tier ?? 1) * 50;
        }, 0);
        const _basePower = _bp + _up + _rp;
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
    };
    const json = JSON.stringify(payload);
    // Web'de localStorage senkron — beforeunload'da kesin kaydedilir
    try { (globalThis as any).localStorage?.setItem(STORAGE_KEY, JSON.stringify({ ...payload, uid })); } catch {}
    AsyncStorage.setItem(STORAGE_KEY, json);
    if (uid) {
      const _user = getCurrentUser();
      saveToCloud(uid, payload, _user?.displayName ?? undefined);
    }
  }, [allianceContribution, missions, warPower, uid]);

  // pvpCooldowns değiştiğinde ANINDA kaydet (cooldown persist — 4sn gecikme yüzünden kayboluyordu)
  useEffect(() => {
    if (!loaded) return;
    if (Object.keys(pvpCooldowns).length > 0) saveNow();
  }, [pvpCooldowns, loaded, saveNow]);

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
          resolveMarch(next);
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
        resolveIncomingAttack(next);
        return null;
      }
      return next;
    });
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
    setMissions(prev => prev.map(m => {
      if (m.claimed) return m;
      let count = m.currentCount;
      if (m.type === 'upgrade') {
        if (m.targetBuildingId) {
          const b = buildings.find(x => x.id === m.targetBuildingId);
          count = Math.max(count, b ? Math.max(0, b.level - 1) : 0);
        } else {
          count = Math.max(count, buildings.reduce((s, b) => s + Math.max(0, b.level - 1), 0));
        }
      } else if (m.type === 'train') {
        if ((m as any).targetUnitId) {
          const uid = (m as any).targetUnitId;
          count = Math.max(count, buildings.reduce((s, b) => s + ((b.trainedUnits ?? {})[uid] ?? 0), 0));
        } else {
          count = Math.max(count, buildings.reduce((s, b) =>
            s + Object.values(b.trainedUnits ?? {}).reduce((a: number, c: any) => a + (c as number), 0), 0));
        }
      } else if (m.type === 'research') {
        count = Math.max(count, researchStates.filter(r => r.completed).length);
      } else if (m.type === 'attack') {
        const wins = battleReports.filter(r => r.won).length;
        count = Math.max(count, (m as any).requiresWin ? wins : battleReports.length);
      }
      // donate tipi görevler handleDonateSuccess callback'i ile doğrudan artırılıyor
      const completed = count >= m.targetCount;
      if (count === m.currentCount && completed === m.completed) return m;
      return { ...m, currentCount: Math.min(count, m.targetCount), completed };
    }));
  }, [loaded, buildings, researchStates, battleReports]);

  // Keep refs in sync
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { resourcesRef.current = resources; }, [resources]);
  useEffect(() => { researchRef.current = researchStates; }, [researchStates]);
  useEffect(() => { marchRef.current = activeMarch; }, [activeMarch]);
  useEffect(() => { birliklerRef.current = birlikler; }, [birlikler]);
  useEffect(() => { battleReportsRef.current = battleReports; }, [battleReports]);
  const pvpCooldownsRef = useRef(pvpCooldowns);
  useEffect(() => { pvpCooldownsRef.current = pvpCooldowns; }, [pvpCooldowns]);
  const revengeTargetsRef = useRef(revengeTargets);
  useEffect(() => { revengeTargetsRef.current = revengeTargets; }, [revengeTargets]);

  // ── Tick (1s) ───────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      const now = Date.now();

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
            resolveMarch(next);
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
          resolveIncomingAttack(next);
          return null;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ── March Resolution ─────────────────────────────────────────
  function resolveMarch(march: March) {
    const target = MAP_TARGETS.find(t => t.id === march.targetId);
    if (!target) return;

    // Araştırma bonusları
    const branchBonus: Record<string, number> = {};
    for (const rs of researchRef.current) {
      if (rs.completed) {
        const node = RESEARCH_MAP[rs.nodeId];
        if (node) branchBonus[node.branch] = (branchBonus[node.branch] ?? 0) + 0.12;
      }
    }

    let won: boolean;
    let losses: number;
    let attackerResults: BattleReport['attackerResults'];
    let defenderResults: BattleReport['defenderResults'];
    let totalDefPower: number;

    // Savaş çöz — her zaman resolveUnitCombat kullan
    const result = resolveUnitCombat({
      attackerUnits: march.marchUnits ?? [],
      defenderUnits: target.defenseUnits ?? [],
      attackerResearchBonus: branchBonus,
    });
    won = result.won;
    totalDefPower = result.totalDefensePower;
    attackerResults = result.attackerResults;
    defenderResults = result.defenderResults;
    losses = result.totalAttackerLosses;

    // Savaş gücü: kazanınca artar, kaybedince düşer
    let powerChange = 0;
    if (won) {
      powerChange = Math.max(20, Math.round(totalDefPower * 0.3));
      setWarPower(prev => prev + powerChange);
    } else {
      powerChange = -Math.round(warPower * 0.1);
      setWarPower(prev => Math.max(0, prev + powerChange));
    }

    // Birlik bazlı saldırı: kazanınca kayıp yok, kaybedince tüm birlikler silinir
    if (attackerResults) {
      if (!won) {
        setBirlikler([]);
      }
      // Kazanınca: 0 kayıp (birlikler korunur)
    }

    // Kazanan: ödül kazan
    if (won) {
      setResources(current =>
        current.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardCash) };
          if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardOil) };
          if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardOre) };
          return r;
        }),
      );
    }

    // Kaybeden: kaynak + XP kaybeder
    if (!won) {
      const cashLoss = Math.round(target.rewardCash * 0.5);
      const oilLoss = Math.round(target.rewardOil * 0.5);
      const oreLoss = Math.round(target.rewardOre * 0.5);
      setResources(current =>
        current.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.max(0, r.amount - cashLoss) };
          if (r.key === 'oil') return { ...r, amount: Math.max(0, r.amount - oilLoss) };
          if (r.key === 'ore') return { ...r, amount: Math.max(0, r.amount - oreLoss) };
          return r;
        }),
      );
    }

    const report: BattleReport = {
      id: `report_${Date.now()}`,
      targetId: march.targetId,
      targetName: march.targetName,
      timestamp: Date.now(),
      won,
      attackPower: result.totalAttackPower,
      defensePower: result.totalDefensePower,
      unitsLost: losses,
      rewardCash: won ? target.rewardCash : -Math.round(target.rewardCash * 0.5),
      rewardOil: won ? target.rewardOil : -Math.round(target.rewardOil * 0.5),
      rewardOre: won ? target.rewardOre : -Math.round(target.rewardOre * 0.5),
      powerChange,
      attackerResults,
      defenderResults,
    };
    addBattleReport(report);
    setLastBattleReport(report);

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

    // CPU karşı saldırı tetikle (%40 ihtimal, koruma kalkanı yoksa)
    const hasShield = Date.now() < shieldUntil;
    if (!hasShield && Math.random() < 0.4 && target.defenseUnits && target.defenseUnits.length > 0) {
      // Hedefin birimlerinden orantılı bir seçim
      const scale = 0.3 + Math.random() * 0.5;
      const attackUnits = target.defenseUnits
        .map(du => ({ unitId: du.unitId, count: Math.max(1, Math.round(du.count * scale)) }))
        .filter(du => du.count > 0);
      const retaliationCount = attackUnits.reduce((s, u) => s + u.count, 0);
      const retaliationTime = 600 + Math.round(Math.random() * 900); // 10-25 dk
      setIncomingAttack({
        id: `incoming_${Date.now()}`,
        attackerName: target.player,
        unitCount: retaliationCount,
        attackUnits,
        totalSeconds: retaliationTime,
        secondsRemaining: retaliationTime,
      });
    }

    scheduleSave();
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
  }

  // ── Incoming Attack Resolution ──────────────────────────────
  async function resolveIncomingAttack(attack: IncomingAttack) {
    // Savunma birimleri: ordu envanteri + birlik birimleri
    const unitTotals: Record<string, number> = {};
    // Envanterden
    for (const b of buildingsRef.current) {
      for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
        if (count > 0) unitTotals[unitId] = (unitTotals[unitId] ?? 0) + count;
      }
    }
    // Birliklerden (envanterden düşülmüş birimler)
    for (const bl of birliklerRef.current) {
      for (const slot of bl.slots) {
        if (slot.count > 0) unitTotals[slot.unitId] = (unitTotals[slot.unitId] ?? 0) + slot.count;
      }
    }
    const playerDefenseUnits: MarchUnit[] = Object.entries(unitTotals)
      .filter(([_, count]) => count > 0)
      .map(([unitId, count]) => ({ unitId, count, buildingId: '' }));

    // Oyuncunun araştırma bonusları
    const branchBonus: Record<string, number> = {};
    for (const rs of researchRef.current) {
      if (rs.completed) {
        const node = RESEARCH_MAP[rs.nodeId];
        if (node) branchBonus[node.branch] = (branchBonus[node.branch] ?? 0) + 0.12;
      }
    }

    // Savaş: düşman saldırıyor, oyuncu savunuyor
    // Düşman = attacker, Oyuncu = defender (doğal roller)
    // Araştırma bonusu savunana uygulanır (defenderResearchBonus olarak)
    const result = resolveUnitCombat({
      attackerUnits: attack.attackUnits.map(u => ({ unitId: u.unitId, count: u.count, buildingId: '' })),
      defenderUnits: playerDefenseUnits.map(u => ({ unitId: u.unitId, count: u.count })),
      attackerResearchBonus: {},  // düşmanın araştırma bonusu yok
      defenderResearchBonus: branchBonus,  // oyuncunun araştırma bonusu savunmada
    });

    // Düşman kazandıysa savunan kaybetti
    const defended = !result.won;

    // Savunanın kayıplarını envanterden VE birliklerden düş (sadece savunan kaybettiyse)
    const defenderUnitLosses = defended ? 0 : result.totalDefenderDestroyed;
    if (!defended && result.defenderResults) {
      // Kalan kayıp miktarını takip et — önce envanterden düş, kalanı birlikten
      const remainingLoss: Record<string, number> = {};
      for (const dr of result.defenderResults) {
        if (dr.destroyed > 0) remainingLoss[dr.unitId] = dr.destroyed;
      }
      // Envanterden düş
      setBuildings(prev =>
        prev.map(b => {
          const newTrained = { ...b.trainedUnits };
          let changed = false;
          for (const [unitId, loss] of Object.entries(remainingLoss)) {
            const current = newTrained[unitId] ?? 0;
            if (current > 0) {
              const deducted = Math.min(current, loss);
              newTrained[unitId] = current - deducted;
              remainingLoss[unitId] -= deducted;
              changed = true;
            }
          }
          return changed ? { ...b, trainedUnits: newTrained } : b;
        }),
      );
      // Kalan kayıpları birliklerden düş
      setBirlikler(prev => prev.map(bl => ({
        ...bl,
        slots: bl.slots.map(slot => {
          const loss = remainingLoss[slot.unitId] ?? 0;
          if (loss <= 0) return slot;
          const deducted = Math.min(slot.count, loss);
          remainingLoss[slot.unitId] -= deducted;
          return { ...slot, count: slot.count - deducted };
        }).filter(slot => slot.count > 0),
      })).filter(bl => bl.slots.length > 0));
    }

    // Saldıranın profilini Firestore'dan oku (playerPower ve kaynaklar için)
    let attackerPlayerPower = 0;
    let attackerCash = 0, attackerOil = 0, attackerOre = 0;
    if (attack.attackerUid) {
      try {
        const attackerBase = await loadDefenderBase(attack.attackerUid);
        if (attackerBase) {
          // playerPower hesapla
          const aBlds = attackerBase.buildings ?? [];
          const aBp = aBlds.reduce((s: number, b: any) => s + (b.level ?? 1) * 100, 0);
          const aUp = aBlds.reduce((s: number, b: any) => {
            for (const [uId, cnt] of Object.entries(b.trainedUnits ?? {})) {
              const def = UNIT_MAP[uId];
              s += (cnt as number) * ({ 1: 10, 2: 30, 3: 60, 4: 100 }[def?.tier ?? 1] ?? 10);
            }
            return s;
          }, 0);
          attackerPlayerPower = aBp + aUp + (attackerBase.warPower ?? 0);
          const aRes = attackerBase.resources ?? [];
          attackerCash = (aRes.find((r: any) => r.key === 'cash')?.amount ?? 0);
          attackerOil = (aRes.find((r: any) => r.key === 'oil')?.amount ?? 0);
          attackerOre = (aRes.find((r: any) => r.key === 'ore')?.amount ?? 0);
        }
      } catch {}
    }

    const myResources = resourcesRef.current;
    const myCash = myResources.find(r => r.key === 'cash')?.amount ?? 0;
    const myOil = myResources.find(r => r.key === 'oil')?.amount ?? 0;
    const myOre = myResources.find(r => r.key === 'ore')?.amount ?? 0;

    let cashChange = 0;
    let oilChange = 0;
    let oreChange = 0;
    let defPowerChange = 0;

    // Artık roller düz: attacker = düşman, defender = oyuncu
    const enemyPower = result.totalAttackPower;   // düşmanın birim gücü
    const myPower = result.totalDefensePower;      // oyuncunun birim gücü

    // Kaybeden tarafın playerPower ve kaynaklarının %20'si — kazanana aynısı eklenir
    const loserPP = defended ? attackerPlayerPower : playerPower;
    const loserC = defended ? attackerCash : myCash;
    const loserO = defended ? attackerOil : myOil;
    const loserR = defended ? attackerOre : myOre;
    const tCash = Math.round(loserC * 0.2);
    const tOil = Math.round(loserO * 0.2);
    const tOre = Math.round(loserR * 0.2);
    const tPower = Math.max(10, Math.round(loserPP * 0.2));

    if (defended) {
      cashChange = tCash;
      oilChange = tOil;
      oreChange = tOre;
      defPowerChange = tPower;
      setWarPower(prev => prev + tPower);
      setResources(current =>
        current.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity, r.amount + tCash) };
          if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity, r.amount + tOil) };
          if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity, r.amount + tOre) };
          return r;
        }),
      );
    } else {
      cashChange = -tCash;
      oilChange = -tOil;
      oreChange = -tOre;
      defPowerChange = -tPower;
      setResources(current =>
        current.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.max(0, r.amount + cashChange) };
          if (r.key === 'oil') return { ...r, amount: Math.max(0, r.amount + oilChange) };
          if (r.key === 'ore') return { ...r, amount: Math.max(0, r.amount + oreChange) };
          return r;
        }),
      );
      setWarPower(prev => Math.max(0, prev + defPowerChange));
      setShieldUntil(Date.now() + 4 * 60 * 60 * 1000);
      setBirlikler([]);
    }

    // Rapor: attackerResults = düşman birlikleri, defenderResults = senin birliklerin
    const report: BattleReport = {
      id: `report_def_${Date.now()}`,
      targetId: 'defense',
      targetName: `${attack.attackerName} Saldırısı`,
      timestamp: Date.now(),
      won: defended,
      attackPower: enemyPower,
      defensePower: myPower,
      unitsLost: defenderUnitLosses,
      rewardCash: cashChange,
      rewardOil: oilChange,
      rewardOre: oreChange,
      powerChange: defPowerChange,
      attackerResults: result.attackerResults,  // düşman (saldıran) birimleri
      defenderResults: result.defenderResults,  // senin (savunan) birimlerin
    };
    addBattleReport(report);
    setLastBattleReport(report);
    // Firestore'daki march'ı resolved olarak işaretle
    try { db.marches().doc(attack.id).update({ status: 'resolved' }); } catch {}
    scheduleSave();
    // İstatistikleri güncelle
    if (uid) {
      const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
      const brs = battleReportsRef.current;
      syncPlayerProfile(uid, {
        warPower, hqLevel: hqLv, playerPower: playerPowerRef.current,
        wins: brs.filter(r => r.won).length,
        losses: brs.filter(r => !r.won).length,
      });
      const attackerUid = attack.attackerUid;
      if (attackerUid && attackerPlayerPower > 0) {
        syncPlayerProfile(attackerUid, { playerPower: defended ? Math.max(0, attackerPlayerPower - tPower) : attackerPlayerPower + tPower });
      }
    }
    // İttifak savaşı skor ekleme (savunan taraf — flag bazlı)
    if (attack.isWarAttack && attack.warAllianceId) {
      (async () => {
        try {
          // Kendi ittifak ID'mi players dokümanından oku
          const myPlayerSnap = await db.players().doc(uid).get();
          const myAid = myPlayerSnap.exists ? (myPlayerSnap.data() as any)?.allianceId : null;
          const enemyAid = attack.warAllianceId;
          if (myAid && enemyAid) {
            const warScore = defended ? 10 : 0;
            let myName = 'Komutan';
            try { const u = getCurrentUser(); if (u?.displayName) myName = u.displayName; } catch {}
            await addWarScoreSvc(myAid, enemyAid, warScore, myName, attack.attackerName, defended);
            await saveWarBattleLog(myAid, report, defended ? myName : attack.attackerName, warScore);
            // Güncel veriyi oku — UI anında güncellensin
            const freshSnap = await db.alliances().doc(myAid).get();
            if (freshSnap.exists) {
              // Alliance hook'taki listener zaten tetiklenmiş olmalı
              // Ama tetiklenmemişse 1sn sonra tekrar dene
              setTimeout(async () => {
                try {
                  const s = await db.alliances().doc(myAid).get();
                  // onSnapshot listener bunu yakalayacak
                } catch {}
              }, 1500);
            }
          }
        } catch (err) { console.warn('[PvP] resolveIncoming war score error:', err); }
      })();
    }
  }

  // ── Resource helpers ─────────────────────────────────────────
  const getResource = useCallback((key: ResourceKey) =>
    resourcesRef.current.find(r => r.key === key)!,
  []);

  const canAfford = useCallback((cash: number, oil: number, ore: number) => {
    const rs = resourcesRef.current;
    return (
      (rs.find(r => r.key === 'cash')?.amount ?? 0) >= cash &&
      (rs.find(r => r.key === 'oil')?.amount ?? 0) >= oil &&
      (rs.find(r => r.key === 'ore')?.amount ?? 0) >= ore
    );
  }, []);

  const deductCost = useCallback((cash: number, oil: number, ore: number) => {
    setResources(current =>
      current.map(r => {
        if (r.key === 'cash') return { ...r, amount: Math.max(0, r.amount - cash) };
        if (r.key === 'oil') return { ...r, amount: Math.max(0, r.amount - oil) };
        if (r.key === 'ore') return { ...r, amount: Math.max(0, r.amount - ore) };
        return r;
      }),
    );
  }, []);

  // ── Gold helpers ────────────────────────────────────────────
  const goldAmount = useMemo(() => resourcesRef.current.find(r => r.key === 'gold')?.amount ?? 0, [resources]);

  const canAffordGold = useCallback((amount: number) => {
    return (resourcesRef.current.find(r => r.key === 'gold')?.amount ?? 0) >= amount;
  }, []);

  const addGold = useCallback((amount: number) => {
    setResources(curr => curr.map(r =>
      r.key === 'gold' ? { ...r, amount: Math.min(r.capacity, r.amount + amount) } : r,
    ));
    scheduleSave();
  }, [scheduleSave]);

  const deductGold = useCallback((amount: number) => {
    setResources(curr => curr.map(r =>
      r.key === 'gold' ? { ...r, amount: Math.max(0, r.amount - amount) } : r,
    ));
    scheduleSave();
  }, [scheduleSave]);

  /** Seviye bazlı sabit altın maliyeti (bina yükseltme) */
  /** Süre bazlı altın maliyeti — tüm hızlandırmalar (bina, araştırma, eğitim) */
  const calcGoldCost = useCallback((remainingSeconds: number): number => {
    const minutes = remainingSeconds / 60;
    if (minutes <= 0) return 0;
    if (minutes <= 5) return 5;
    if (minutes <= 15) return 10;
    if (minutes <= 30) return 20;
    if (minutes <= 60) return 35;
    if (minutes <= 120) return 60;       // 2 saat
    if (minutes <= 240) return 100;      // 4 saat
    if (minutes <= 480) return 180;      // 8 saat
    if (minutes <= 720) return 280;      // 12 saat
    if (minutes <= 1440) return 450;     // 24 saat
    if (minutes <= 2880) return 800;     // 48 saat
    if (minutes <= 4320) return 1200;    // 72 saat
    return Math.ceil(1200 + (minutes - 4320) / 5);  // 72sa+ → her 5dk +1 altın
  }, []);

  /** Bina yükseltme altın maliyeti — kalan süreye göre hesaplanır */
  const calcUpgradeGoldCost = useCallback((buildingLevel: number): number => {
    // Kalan süre bilinmiyorsa level bazlı tahmini maliyet
    const estimatedMinutes = Math.pow(buildingLevel, 2.2) * 3;
    return calcGoldCost(estimatedMinutes * 60);
  }, [calcGoldCost]);

  /** Altınla hızlandır — kademeli oran (5dk=5, 1sa=50, 8sa=350, 24sa=1000) */
  const speedUpWithGold = useCallback((type: 'building' | 'research' | 'training', id: string) => {
    if (type === 'building') {
      const b = buildingsRef.current.find(b => b.id === id);
      if (!b?.upgradeSecondsRemaining || b.upgradeSecondsRemaining <= 0) return;
      const cost = calcGoldCost(b.upgradeSecondsRemaining);
      if (!canAffordGold(cost)) return;
      deductGold(cost);
      const updated = buildingsRef.current.map(b2 =>
        b2.id === id ? { ...b2, upgradeSecondsRemaining: 0, isUpgrading: false, level: b2.level + 1 } : b2,
      );
      buildingsRef.current = updated;
      setBuildings(updated);
    } else if (type === 'research') {
      // Araştırma binasını bul — nodeId veya bina id ile
      const researchBuilding = buildingsRef.current.find(b2 => b2.activeResearchNodeId === id)
        ?? buildingsRef.current.find(b2 => b2.id === 'researchLab' && b2.activeResearchNodeId);
      const nodeId = researchBuilding?.activeResearchNodeId ?? id;
      const remaining = researchBuilding?.researchSecondsRemaining ?? 0;
      if (remaining <= 0 && !researchBuilding?.activeResearchNodeId) return;
      const cost = calcGoldCost(Math.max(1, remaining));
      if (!canAffordGold(cost)) return;
      deductGold(cost);
      const updatedResearch = researchRef.current.map(r =>
        r.nodeId === nodeId ? { ...r, secondsRemaining: 0, inProgress: false, completed: true } : r,
      );
      researchRef.current = updatedResearch;
      setResearchStates(updatedResearch);
      {
        const updatedBlds = buildingsRef.current.map(b2 =>
          (b2.activeResearchNodeId === nodeId || b2.id === researchBuilding?.id)
            ? { ...b2, activeResearchNodeId: null, researchSecondsRemaining: 0 } : b2,
        );
        buildingsRef.current = updatedBlds;
        setBuildings(updatedBlds);
      }
    } else if (type === 'training') {
      const b = buildingsRef.current.find(b => b.id === id);
      if (!b?.trainingQueue || b.trainingQueue.length === 0) return;
      const totalSecs = b.trainingQueue.reduce((s, q) => s + (q.secondsRemaining ?? 0), 0);
      const cost = calcGoldCost(totalSecs);
      if (!canAffordGold(cost)) return;
      deductGold(cost);
      const updatedBlds = buildingsRef.current.map(b2 => {
        if (b2.id !== id || !b2.trainingQueue) return b2;
        const newTrained = { ...b2.trainedUnits };
        for (const q of b2.trainingQueue) {
          newTrained[q.unitId] = (newTrained[q.unitId] ?? 0) + q.quantity;
        }
        return { ...b2, trainingQueue: [], trainedUnits: newTrained };
      });
      buildingsRef.current = updatedBlds;
      setBuildings(updatedBlds);
    }
    saveNow();
  }, [calcGoldCost, calcUpgradeGoldCost, canAffordGold, deductGold, saveNow]);

  /** Altın ile kaynak satın al — banka seviyesine göre kur hesaplanır */
  const GOLD_TO_RESOURCE_BASE: Record<string, number> = { cash: 500, oil: 200, ore: 150 };
  const buyResourceWithGold = useCallback((resourceKey: 'cash' | 'oil' | 'ore', goldAmount: number): boolean => {
    if (goldAmount <= 0) return false;
    if (!canAffordGold(goldAmount)) return false;
    const bankLevel = buildingsRef.current.find(b => b.id === 'bank')?.level ?? 1;
    const baseRate = GOLD_TO_RESOURCE_BASE[resourceKey] ?? 500;
    const gained = Math.round(baseRate * goldAmount * (1 + 0.10 * bankLevel));
    deductGold(goldAmount);
    setResources(current =>
      current.map(r =>
        r.key === resourceKey ? { ...r, amount: Math.min(r.capacity, r.amount + gained) } : r,
      ),
    );
    setToastMsg(t('common.goldExchange', { gold: String(goldAmount), amount: gained.toLocaleString(), resource: resourceKey === 'cash' ? '💵' : resourceKey === 'oil' ? '🛢️' : '⛏️' }));
    saveNow();
    return true;
  }, [canAffordGold, deductGold, saveNow]);

  // ── Building helpers ─────────────────────────────────────────
  const getBuilding = useCallback(
    (id: BuildingId) => buildingsRef.current.find(b => b.id === id),
    [],
  );

  const getUpgradeCost = useCallback((id: BuildingId) => {
    const def = BUILDING_DEFINITIONS[id];
    const b = buildingsRef.current.find(b => b.id === id);
    return calcUpgradeCost(def, b?.level ?? 1);
  }, []);

  const getUpgradeTime = useCallback((id: BuildingId) => {
    const def = BUILDING_DEFINITIONS[id];
    const b = buildingsRef.current.find(b => b.id === id);
    return calcUpgradeTime(def, b?.level ?? 1);
  }, []);

  const canUpgradeBuilding = useCallback((id: BuildingId) => {
    const b = buildingsRef.current.find(b => b.id === id);
    if (!b) return false;
    const def = BUILDING_DEFINITIONS[id];
    if (b.level >= def.maxLevel) return false;
    if (b.isUpgrading) return false;
    // Aynı anda yalnızca 1 bina yükseltilebilir
    if (buildingsRef.current.some(x => x.isUpgrading)) return false;
    const cost = calcUpgradeCost(def, b.level);
    return canAfford(cost.cash, cost.oil, cost.ore);
  }, [canAfford]);

  const upgradeBuilding = useCallback((id: BuildingId) => {
    if (!canUpgradeBuilding(id)) return;
    const def = BUILDING_DEFINITIONS[id];
    const b = buildingsRef.current.find(b => b.id === id)!;
    const cost = calcUpgradeCost(def, b.level);
    const time = calcUpgradeTime(def, b.level);
    deductCost(cost.cash, cost.oil, cost.ore);
    const updated = buildingsRef.current.map(building =>
      building.id === id
        ? { ...building, isUpgrading: true, upgradeSecondsRemaining: time }
        : building,
    );
    buildingsRef.current = updated;
    setBuildings(updated);
    // Görev güncelleme yükseltme bittiğinde yapılır (tick callback'te)
    saveNow();
  }, [canUpgradeBuilding, deductCost, saveNow]);

  // ── Research helpers ─────────────────────────────────────────
  const isResearched = useCallback((nodeId: string) =>
    researchRef.current.find(r => r.nodeId === nodeId)?.completed ?? false,
  []);

  const getAvailableResearch = useCallback((buildingId: BuildingId): ResearchNode[] => {
    const def = BUILDING_DEFINITIONS[buildingId];
    if (!def.researchBranch && buildingId !== 'researchLab') return [];
    return RESEARCH_NODES.filter(n => {
      if (buildingId === 'researchLab') return true;
      return n.branch === def.researchBranch;
    }).filter(n => {
      const state = researchRef.current.find(r => r.nodeId === n.id);
      if (state?.completed || state?.inProgress) return false;
      return n.requires.every(req => isResearched(req));
    });
  }, [isResearched, researchStates]);

  const canStartResearch = useCallback((buildingId: BuildingId, nodeId: string) => {
    const building = buildingsRef.current.find(b => b.id === buildingId);
    if (!building) return false;
    if (building.activeResearchNodeId !== null) return false;
    const node = RESEARCH_MAP[nodeId];
    if (!node) return false;
    const state = researchRef.current.find(r => r.nodeId === nodeId);
    if (state?.completed || state?.inProgress) return false;
    if (!node.requires.every(req => isResearched(req))) return false;
    return canAfford(node.costCash, node.costOil, node.costOre);
  }, [canAfford, isResearched]);

  const startResearch = useCallback((buildingId: BuildingId, nodeId: string) => {
    if (!canStartResearch(buildingId, nodeId)) return;
    const node = RESEARCH_MAP[nodeId];
    deductCost(node.costCash, node.costOil, node.costOre);
    const updatedBlds = buildingsRef.current.map(b =>
      b.id === buildingId
        ? { ...b, activeResearchNodeId: nodeId, researchSecondsRemaining: node.researchSeconds }
        : b,
    );
    buildingsRef.current = updatedBlds;
    setBuildings(updatedBlds);
    setResearchStates(current =>
      current.map(r =>
        r.nodeId === nodeId ? { ...r, inProgress: true, secondsRemaining: node.researchSeconds } : r,
      ),
    );
    setMissions(prev =>
      prev.map(m => {
        if (m.type === 'research' && !m.completed) {
          const next = { ...m, currentCount: m.currentCount + 1 };
          if (next.currentCount >= next.targetCount) next.completed = true;
          return next;
        }
        return m;
      }),
    );
    saveNow();
  }, [canStartResearch, deductCost, saveNow]);

  const getUnlockedUnitsForBuilding = useCallback((buildingId: BuildingId): UnitDefinition[] => {
    const building = buildingsRef.current.find(b => b.id === buildingId);
    return getUnitsForBuilding(buildingId, building?.level ?? 0);
  }, []);

  // ── Unit helpers ─────────────────────────────────────────────
  const getTrainedCount = useCallback((buildingId: BuildingId, unitId: string) => {
    const b = buildingsRef.current.find(b => b.id === buildingId);
    return b?.trainedUnits?.[unitId] ?? 0;
  }, []);

  const getTotalTrainedUnits = useCallback(() => {
    const envanterTotal = buildingsRef.current.reduce((total, b) => {
      return total + Object.values(b.trainedUnits ?? {}).reduce((a, v) => a + v, 0);
    }, 0);
    const birlikTotal = birliklerRef.current.reduce((total, bl) => {
      return total + bl.slots.reduce((a, s) => a + s.count, 0);
    }, 0);
    return envanterTotal + birlikTotal;
  }, []);

  /** HQ seviyesine bağlı bina başına maksimum birim kapasitesi (her askeri bina ayrı limit) */
  const UNIT_CAP_TABLE: Record<number, number> = {
    1: 50, 2: 50, 3: 100, 4: 100, 5: 200, 6: 200,
    7: 350, 8: 350, 9: 500, 10: 500, 11: 700, 12: 700,
    13: 900, 14: 900, 15: 1100, 16: 1100, 17: 1300, 18: 1300,
    19: 1500, 20: 1500,
  };
  /** Bina bazlı kapasite limiti döndürür */
  const getUnitCap = useCallback(() => {
    const hqLevel = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
    return UNIT_CAP_TABLE[Math.min(hqLevel, 20)] ?? 50;
  }, []);
  /** Belirli bir binadaki toplam birim sayısı (envanter + birlik içindeki) */
  const getBuildingUnitCount = useCallback((buildingId: BuildingId) => {
    const b = buildingsRef.current.find(b => b.id === buildingId);
    if (!b) return 0;
    const envanterCount = Object.values(b.trainedUnits ?? {}).reduce((a, v) => a + v, 0);
    // Birlik içindeki birimleri de say
    const birlikCount = birliklerRef.current.reduce((total, bl) => {
      return total + bl.slots.filter(s => s.buildingId === buildingId).reduce((a, s) => a + s.count, 0);
    }, 0);
    return envanterCount + birlikCount;
  }, []);

  const getTrainingCost = useCallback((unitId: string, qty: number) => {
    const unit = UNIT_MAP[unitId];
    if (!unit) return { cash: 0, oil: 0, ore: 0 };
    return {
      cash: unit.costCash * qty,
      oil: unit.costOil * qty,
      ore: unit.costOre * qty,
    };
  }, []);

  const getMaxTrainable = useCallback((buildingId: BuildingId, unitId: string) => {
    const unit = UNIT_MAP[unitId];
    if (!unit) return 0;
    const cap = getUnitCap();
    const currentUnits = getBuildingUnitCount(buildingId);
    const capRemaining = Math.max(0, cap - currentUnits);
    if (capRemaining <= 0) return 0;
    const cash = resourcesRef.current.find(r => r.key === 'cash')?.amount ?? 0;
    const oil = resourcesRef.current.find(r => r.key === 'oil')?.amount ?? 0;
    const ore = resourcesRef.current.find(r => r.key === 'ore')?.amount ?? 0;
    let maxByRes = Infinity;
    if (unit.costCash > 0) maxByRes = Math.min(maxByRes, Math.floor(cash / unit.costCash));
    if (unit.costOil > 0) maxByRes = Math.min(maxByRes, Math.floor(oil / unit.costOil));
    if (unit.costOre > 0) maxByRes = Math.min(maxByRes, Math.floor(ore / unit.costOre));
    return Math.min(capRemaining, maxByRes === Infinity ? capRemaining : maxByRes);
  }, [getBuildingUnitCount, getUnitCap]);

  const canStartTraining = useCallback((buildingId: BuildingId, unitId: string, qty: number) => {
    if (qty <= 0) return false;
    const unit = UNIT_MAP[unitId];
    if (!unit) return false;
    const building = buildingsRef.current.find(b => b.id === unit.requiredBuildingId);
    if (!building || building.level < unit.minBuildingLevel) return false;
    // Bina bazlı kapasite kontrolü
    const currentBuildingUnits = getBuildingUnitCount(buildingId);
    const cap = getUnitCap();
    if (currentBuildingUnits + qty > cap) return false;
    const cost = getTrainingCost(unitId, qty);
    return canAfford(cost.cash, cost.oil, cost.ore);
  }, [canAfford, getTrainingCost, getBuildingUnitCount, getUnitCap]);

  const startTraining = useCallback((buildingId: BuildingId, unitId: string, qty: number) => {
    if (!canStartTraining(buildingId, unitId, qty)) return;
    const unit = UNIT_MAP[unitId];
    const cost = getTrainingCost(unitId, qty);
    deductCost(cost.cash, cost.oil, cost.ore);
    const item: TrainingQueueItem = {
      unitId,
      quantity: qty,
      secondsRemaining: unit.trainingSeconds * qty,
      totalSeconds: unit.trainingSeconds * qty,
    };
    const updatedBlds = buildingsRef.current.map(b =>
      b.id === buildingId ? { ...b, trainingQueue: [...b.trainingQueue, item] } : b,
    );
    buildingsRef.current = updatedBlds;
    setBuildings(updatedBlds);
    setMissions(prev =>
      prev.map(m => {
        if (m.type === 'train' && !m.completed) {
          // targetUnitId varsa sadece o birim sayılır
          if (m.targetUnitId && m.targetUnitId !== unitId) return m;
          const next = { ...m, currentCount: m.currentCount + qty };
          if (next.currentCount >= next.targetCount) next.completed = true;
          return next;
        }
        return m;
      }),
    );
    saveNow();
  }, [canStartTraining, deductCost, getTrainingCost, saveNow]);

  /** Belirli bir binadaki birimin sayısını delta kadar değiştirir (negatif = düş, pozitif = ekle) */
  const adjustTrainedUnits = useCallback((buildingId: BuildingId, unitId: string, delta: number) => {
    setBuildings(current =>
      current.map(b => {
        if (b.id !== buildingId) return b;
        const cur = b.trainedUnits?.[unitId] ?? 0;
        const next = Math.max(0, cur + delta);
        return { ...b, trainedUnits: { ...b.trainedUnits, [unitId]: next } };
      }),
    );
    scheduleSave();
  }, [scheduleSave]);

  // ── Combat helpers ───────────────────────────────────────────
  const getTotalAttackPower = useCallback((committedUnits: number) => {
    const total = getTotalTrainedUnits();
    if (total === 0 || committedUnits === 0) return 0;
    const ratio = Math.min(1, committedUnits / total);
    // Research bonuses: each completed node in a branch adds 12% attack power for that branch
    const branchBonus: Record<string, number> = {};
    for (const rs of researchRef.current) {
      if (rs.completed) {
        const node = RESEARCH_MAP[rs.nodeId];
        if (node) {
          branchBonus[node.branch] = (branchBonus[node.branch] ?? 0) + 0.12;
        }
      }
    }
    let power = 0;
    for (const b of buildingsRef.current) {
      for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
        const unit = UNIT_MAP[unitId];
        if (!unit) continue;
        const bonus = 1 + (branchBonus[unit.researchBranch] ?? 0);
        power += Math.floor(count * ratio) * unit.attackPower * bonus;
      }
    }
    return Math.max(1, Math.round(power));
  }, [getTotalTrainedUnits]);

  const canAttack = useCallback((targetId: string, committedUnits: number) => {
    if (activeMarch !== null) return false;
    if (committedUnits < 1) return false;
    // Kalkan aktifken saldırı yapılamaz
    if (Date.now() < shieldUntil) return false;
    return getTotalTrainedUnits() >= committedUnits;
  }, [activeMarch, getTotalTrainedUnits]);

  const attackTarget = useCallback((targetId: string, targetName: string, committedUnits: number, marchUnits?: MarchUnit[]) => {
    if (!canAttack(targetId, committedUnits)) return;
    const target = MAP_TARGETS.find(t => t.id === targetId);
    if (!target) return;
    const power = getTotalAttackPower(committedUnits);
    const march: March = {
      id: `march_${Date.now()}`,
      targetId,
      targetName,
      type: 'attack',
      committedUnits,
      totalSeconds: target.travelSeconds,
      secondsRemaining: target.travelSeconds,
      attackPower: power,
      marchUnits,
    };
    setActiveMarch(march);
    scheduleSave();
  }, [canAttack, getTotalAttackPower, scheduleSave]);

  /** Aktif seferi iptal et — birlik bazlı saldırılarda birlikler korunur */
  const cancelMarch = useCallback(async () => {
    const march = marchRef.current;
    if (!march || march.type === 'return') return;
    // Firestore'daki march'ı iptal olarak işaretle
    const fsId = firestoreMarchIdRef.current || march.id;
    setActiveMarch(null);
    firestoreMarchIdRef.current = null;
    scheduleSave();
    try {
      await cancelPvPMarch(fsId);
    } catch (err: any) {
      console.warn('[PvP] İptal Firestore güncellenemedi:', err?.message);
    }
  }, [scheduleSave]);

  // ── Alliance helpers ─────────────────────────────────────────
  const canDonate = useCallback((resource: ResourceKey, amount: number) => {
    if (amount <= 0) return false;
    return (resourcesRef.current.find(r => r.key === resource)?.amount ?? 0) >= amount;
  }, []);

  const donate = useCallback((resource: ResourceKey, amount: number) => {
    if (!canDonate(resource, amount)) return;
    const contribution = resource === 'cash' ? Math.round(amount * 0.5) : Math.round(amount * 1.0);
    deductCost(
      resource === 'cash' ? amount : 0,
      resource === 'oil' ? amount : 0,
      resource === 'ore' ? amount : 0,
    );
    setAllianceContribution(c => c + contribution);
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
  }, [canDonate, deductCost, scheduleSave]);

  const canRequestHelp = useCallback(() => {
    if (allianceContribution < 10) return false;
    return buildingsRef.current.some(
      b => b.upgradeSecondsRemaining > 0 || b.researchSecondsRemaining > 0,
    );
  }, [allianceContribution]);

  const requestHelp = useCallback(() => {
    if (!canRequestHelp()) return;
    const HELP_REDUCTION = 90;
    setBuildings(current =>
      current.map(b => {
        if (b.upgradeSecondsRemaining > 0) {
          return { ...b, upgradeSecondsRemaining: Math.max(0, b.upgradeSecondsRemaining - HELP_REDUCTION) };
        }
        if (b.researchSecondsRemaining > 0) {
          return { ...b, researchSecondsRemaining: Math.max(0, b.researchSecondsRemaining - HELP_REDUCTION) };
        }
        return b;
      }),
    );
    setAllianceContribution(c => Math.max(0, c - 10));
    scheduleSave();
  }, [canRequestHelp, scheduleSave]);

  // ── Joint Attack ─────────────────────────────────────────────
  const launchJointAttack = useCallback((
    targetId: string,
    targetName: string,
    committedUnits: number,
    allyPower: number,
  ): BattleReport | null => {
    const target = MAP_TARGETS.find(t => t.id === targetId);
    if (!target) return null;
    const playerPower = getTotalAttackPower(committedUnits);
    const combinedPower = playerPower + allyPower;
    const { won, losses } = calcBattleOutcome(combinedPower, target.defenseRating, committedUnits);
    if (losses > 0) {
      setBuildings(current => {
        let remaining = losses;
        return current.map(b => {
          if (remaining <= 0 || !b.trainedUnits) return b;
          const total = Object.values(b.trainedUnits).reduce((a, v) => a + v, 0);
          if (total === 0) return b;
          const deduct = Math.min(remaining, total);
          remaining -= deduct;
          return { ...b, trainedUnits: deductUnitsProportionally(b.trainedUnits, deduct) };
        });
      });
    }
    if (won) {
      setResources(current =>
        current.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardCash) };
          if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardOil) };
          if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardOre) };
          return r;
        }),
      );
    }
    const report: BattleReport = {
      id: `joint_${Date.now()}`,
      targetId,
      targetName: `[İTTİFAK] ${targetName}`,
      timestamp: Date.now(),
      won,
      attackPower: combinedPower,
      defensePower: target.defenseRating,
      unitsLost: losses,
      rewardCash: won ? target.rewardCash : 0,
      rewardOil: won ? target.rewardOil : 0,
      rewardOre: won ? target.rewardOre : 0,
    };
    addBattleReport(report);
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
    setAllianceContribution(c => c + 2); // joint attacks earn 2 contribution
    scheduleSave();
    return report;
  }, [getTotalAttackPower, scheduleSave]);

  // ── Mission helpers ──────────────────────────────────────────
  const claimMissionReward = useCallback((missionId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission || !mission.completed || mission.claimed) return;
    setResources(current =>
      current.map(r => {
        if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity, r.amount + mission.rewardCash) };
        if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity, r.amount + mission.rewardOil) };
        if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity, r.amount + mission.rewardOre) };
        if (r.key === 'gold' && mission.rewardGold) return { ...r, amount: Math.min(r.capacity, r.amount + mission.rewardGold) };
        return r;
      }),
    );
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, claimed: true } : m));
    setToastMsg(t('missions.rewardClaimed'));
    // Anında kaydet — delay olursa claimed durumu kaybolabilir
    setTimeout(() => saveNow(), 100);
  }, [missions, saveNow]);

  // ── Player Power ─────────────────────────────────────────────
  const POWER_PER_UNIT_TIER: Record<number, number> = { 1: 10, 2: 30, 3: 60, 4: 100 };
  const playerPower = useMemo(() => {
    // Bina seviyeleri: kademeli güç (seviye N'e yükseltme +N×100 güç verir)
    const buildingPower = buildings.reduce((sum, b) => sum + b.level * (b.level + 1) / 2 * 100, 0);
    // Eğitilmiş birimler: adet × tier ağırlığı
    const unitPower = buildings.reduce((sum, b) => {
      for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
        const def = UNIT_MAP[unitId];
        sum += count * (POWER_PER_UNIT_TIER[def?.tier ?? 1] ?? 10);
      }
      return sum;
    }, 0);
    // Tamamlanan araştırmalar: tier × 50
    const researchPower = researchStates
      .filter(r => r.completed)
      .reduce((sum, r) => {
        const node = RESEARCH_MAP[r.nodeId];
        return sum + (node?.tier ?? 1) * 50;
      }, 0);
    const basePower = buildingPower + unitPower + researchPower;
    const cappedWarPower = Math.min(warPower, basePower);
    return basePower + cappedWarPower;
  }, [buildings, researchStates, warPower]);
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

  // playerPower veya savaş sonuçları değiştiğinde Firestore'a yaz (sıralama için)
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (!uid || !loaded) return;
    // İlk yüklemede battleReports restore edilmesini bekle
    if (!hasSyncedRef.current) {
      const timer = setTimeout(() => {
        hasSyncedRef.current = true;
        const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
        const brs = battleReportsRef.current;
        let dn: string | undefined;
        try { const u = getCurrentUser(); dn = u?.displayName ?? undefined; } catch {}
        syncPlayerProfile(uid, {
          displayName: dn, warPower, hqLevel: hqLv, playerPower,
          wins: brs.filter(r => r.won).length,
          losses: brs.filter(r => !r.won).length,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
    // Sonraki değişikliklerde hemen sync
    const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
    const brs = battleReportsRef.current;
    let dn2: string | undefined;
    try { const u = getCurrentUser(); dn2 = u?.displayName ?? undefined; } catch {}
    syncPlayerProfile(uid, {
      displayName: dn2, warPower, hqLevel: hqLv, playerPower,
      wins: brs.filter(r => r.won).length,
      losses: brs.filter(r => !r.won).length,
    });
  }, [playerPower, uid, loaded, battleReports]);

  // ── PvP ─────────────────────────────────────────────────────
  const refreshPvPTargets = useCallback(async () => {
    if (!uid) return;
    setPvpLoading(true);
    try {
      const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
      const targets = await findPvPTargets(uid, hqLv);
      setPvpTargets(targets);
    } catch (err) {
      console.warn('[PvP] Target refresh failed:', err);
    }
    setPvpLoading(false);
  }, [uid]);

  const attackPvPTarget = useCallback(async (
    target: PvPTarget,
    committedUnits: number,
    marchUnits: MarchUnit[],
    isWarAttack = false,
  ) => {
    if (!uid) return;
    if (marchRef.current) return;
    // PvP cooldown kontrolü
    const cooldown = getPvPCooldown(target.uid);
    if (cooldown > 0) {
      setToastMsg(t('pvp.cooldownRemaining', { h: String(Math.floor(cooldown / 3600)), m: String(Math.floor((cooldown % 3600) / 60)) }));
      return;
    }

    // Aynı ittifak üyesine saldırı engelle
    const myAllianceTag = allianceRef.current?.myAllianceData?.tag;
    if (myAllianceTag && target.allianceTag && target.allianceTag === myAllianceTag) {
      setToastMsg(t('pvp.cannotAttackAlly'));
      return;
    }

    // Savunma birimlerini saldırıdan çıkar (airDefense saldırıda gitmez)
    const filteredMarchUnits = marchUnits.filter(mu => {
      const unit = UNIT_MAP[mu.unitId];
      return unit?.branch !== 'airDefense';
    });
    if (filteredMarchUnits.length === 0) {
      setToastMsg(t('pvp.needOffensiveUnits'));
      return;
    }

    // Güç hesabı: doğrudan marchUnits'ten (birlik bazlı)
    let attackPower = 0;
    const branchBonus: Record<string, number> = {};
    for (const rs of researchRef.current) {
      if (rs.completed) {
        const node = RESEARCH_MAP[rs.nodeId];
        if (node) branchBonus[node.branch] = (branchBonus[node.branch] ?? 0) + 0.12;
      }
    }
    for (const mu of filteredMarchUnits) {
      const unit = UNIT_MAP[mu.unitId];
      if (!unit) continue;
      const bonus = 1 + (branchBonus[unit.researchBranch] ?? 0);
      attackPower += Math.round(mu.count * unit.attackPower * bonus);
    }
    if (attackPower < 1) attackPower = 1;

    const travelSeconds = 180; // 3 dakika sabit sefer süresi

    // Firestore'a march yaz — id'yi al, sonra lokal state set et
    let attackerName = `Komutan_${uid.slice(0, 6)}`;
    try { const u = getCurrentUser(); if (u?.displayName) attackerName = u.displayName; } catch {}

    const now = Date.now();
    let marchId: string;
    try {
      marchId = await launchPvPAttack({
        attackerUid: uid,
        attackerName,
        defenderUid: target.uid,
        defenderName: target.displayName,
        marchUnits: filteredMarchUnits,
        attackPower,
        committedUnits: filteredMarchUnits.reduce((s, u) => s + u.count, 0),
        startedAt: now,
        arrivesAt: now + travelSeconds * 1000,
        travelSeconds,
        status: 'marching',
      });
    } catch (err: any) {
      setToastMsg(t('pvp.attackFailed'));
      return;
    }

    firestoreMarchIdRef.current = marchId;
    const march: March = {
      id: marchId,
      targetId: target.uid,
      targetName: target.displayName,
      type: 'attack',
      committedUnits: filteredMarchUnits.reduce((s, u) => s + u.count, 0),
      totalSeconds: travelSeconds,
      secondsRemaining: travelSeconds,
      attackPower,
      marchUnits: filteredMarchUnits,
      isWarAttack,
    };
    setActiveMarch(march);
    scheduleSave();
  }, [uid, scheduleSave, getPvPCooldown]);

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
          const myRes = resourcesRef.current;
          const myCash = myRes.find(r => r.key === 'cash')?.amount ?? 0;
          const myOil = myRes.find(r => r.key === 'oil')?.amount ?? 0;
          const myOre = myRes.find(r => r.key === 'ore')?.amount ?? 0;

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
                const atkData = atkSnap.exists ? atkSnap.data() as any : null;
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
          resolveIncomingAttack({
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
      const defTotals: Record<string, number> = {};
      for (const b of (defBase.buildings ?? [])) {
        for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
          if ((count as number) > 0) defTotals[unitId] = (defTotals[unitId] ?? 0) + (count as number);
        }
      }
      for (const bl of (defBase.birlikler ?? [])) {
        for (const slot of (bl.slots ?? [])) {
          if (slot.count > 0) defTotals[slot.unitId] = (defTotals[slot.unitId] ?? 0) + slot.count;
        }
      }
      const defUnits = Object.entries(defTotals)
        .filter(([_, count]) => count > 0)
        .map(([unitId, count]) => ({ unitId, count, buildingId: '' }));

      // Araştırma bonusları
      const branchBonus: Record<string, number> = {};
      for (const rs of researchRef.current) {
        if (rs.completed) {
          const node = RESEARCH_MAP[rs.nodeId];
          if (node) branchBonus[node.branch] = (branchBonus[node.branch] ?? 0) + 0.12;
        }
      }

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
        // Kaybedince tüm birlikler silinir
        setBirlikler([]);
      } else if (attackerResults.length > 0) {
        // Kazanınca da kayıpları birliklerden düş
        const lossMap: Record<string, number> = {};
        for (const ar of attackerResults) {
          if (ar.losses > 0) lossMap[ar.unitId] = (lossMap[ar.unitId] ?? 0) + ar.losses;
        }
        setBirlikler(prev => prev.map(bl => ({
          ...bl,
          slots: bl.slots.map(slot => {
            const loss = lossMap[slot.unitId] ?? 0;
            if (loss <= 0) return slot;
            const deduct = Math.min(slot.count, loss);
            lossMap[slot.unitId] = loss - deduct;
            return { ...slot, count: slot.count - deduct };
          }).filter(slot => slot.count > 0),
        })).filter(bl => bl.slots.length > 0));
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
      // Savunanın playerPower'ını hesapla (bina + birim + araştırma + warPower)
      const defPlayerPower = (() => {
        const blds = defBase.buildings ?? [];
        const bp = blds.reduce((s: number, b: any) => s + (b.level ?? 1) * 100, 0);
        const up = blds.reduce((s: number, b: any) => {
          for (const [uId, cnt] of Object.entries(b.trainedUnits ?? {})) {
            const def = UNIT_MAP[uId];
            s += (cnt as number) * ({ 1: 10, 2: 30, 3: 60, 4: 100 }[def?.tier ?? 1] ?? 10);
          }
          return s;
        }, 0);
        return bp + up + (defBase.warPower ?? 0);
      })();

      // Kaybeden tarafın playerPower'ının %20'si — hem kazanan alır hem kaybeden kaybeder
      const loserPlayerPower = won ? defPlayerPower : playerPower;
      const loserCash = won ? defCash : myCash;
      const loserOil = won ? defOil : myOil;
      const loserOre = won ? defOre : myOre;

      const transferCash = Math.round(loserCash * 0.2);
      const transferOil = Math.round(loserOil * 0.2);
      const transferOre = Math.round(loserOre * 0.2);
      const transferPower = Math.max(10, Math.round(loserPlayerPower * 0.2));

      const lootCash = won ? transferCash : -transferCash;
      const lootOil = won ? transferOil : -transferOil;
      const lootOre = won ? transferOre : -transferOre;
      const powerChange = won ? transferPower : -transferPower;

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
            // Savunan kaybetti: birim kayıplarını düş ve yeni power hesapla
            const newDefPower = Math.max(0, defPlayerPower - result.totalDefenderDestroyed * 10 - transferPower);
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
    addResource: (key: 'cash' | 'oil' | 'ore', amount: number) => {
      setResources(curr => curr.map(r => r.key === key ? { ...r, amount: Math.min(r.capacity, r.amount + amount) } : r));
    },
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
    incomingAttack,
    birlikler,
    addBirlik: (birlik: Birlik) => {
      setBirlikler(prev => [...prev, birlik]);
      // Birimleri envanterden düş
      birlik.slots.forEach(s => {
        setBuildings(prev =>
          prev.map(b => {
            if (b.id !== s.buildingId) return b;
            const cur = b.trainedUnits?.[s.unitId] ?? 0;
            return { ...b, trainedUnits: { ...b.trainedUnits, [s.unitId]: Math.max(0, cur - s.count) } };
          }),
        );
      });
      scheduleSave();
    },
    removeBirlik: (id: string) => {
      const bl = birlikler.find(b => b.id === id);
      if (bl) {
        // Birimleri envantere geri ekle
        bl.slots.forEach(s => {
          setBuildings(prev =>
            prev.map(b => {
              if (b.id !== s.buildingId) return b;
              return { ...b, trainedUnits: { ...b.trainedUnits, [s.unitId]: (b.trainedUnits?.[s.unitId] ?? 0) + s.count } };
            }),
          );
        });
      }
      setBirlikler(prev => prev.filter(b => b.id !== id));
      scheduleSave();
    },
    shieldUntil,
    buyShield: (durationMs: number, goldCost: number) => {
      // İttifak savaşı sırasında kalkan satın alınamaz
      if (allianceRef.current?.myAllianceData?.activeWar) return false;
      if (!canAffordGold(goldCost)) return false;
      deductGold(goldCost);
      setShieldUntil(Date.now() + durationMs);
      scheduleSave();
      return true;
    },
    buyWarPower: (amount: number, goldCost: number) => {
      if (!canAffordGold(goldCost)) return false;
      deductGold(goldCost);
      setWarPower(prev => prev + amount);
      scheduleSave();
      return true;
    },
    playerPower,
    lastBattleReport,
    clearLastBattleReport: () => setLastBattleReport(null),
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
  }), [
    resources, getResource, canAfford, buyResourceWithGold,
    buildings, getBuilding, canUpgradeBuilding, upgradeBuilding, getUpgradeCost, getUpgradeTime,
    researchStates, isResearched, canStartResearch, startResearch, getAvailableResearch, getUnlockedUnitsForBuilding,
    getTrainedCount, getTotalTrainedUnits, getUnitCap, getBuildingUnitCount, canStartTraining, startTraining, getTrainingCost, getMaxTrainable, adjustTrainedUnits,
    activeMarch, battleReports, incomingAttack, birlikler, shieldUntil, playerPower, lastBattleReport, getTotalAttackPower, canAttack, attackTarget,
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
