import { useCallback } from 'react';
import type {
  BuildingState,
  BuildingId,
  ResearchState,
  ResearchNode,
  UnitDefinition,
  Birlik,
  Mission,
  Resource,
  TrainingQueueItem,
} from './types';
import { BUILDING_DEFINITIONS } from '../data/buildings';
import { RESEARCH_NODES, RESEARCH_MAP } from '../data/research';
import { UNIT_MAP, getUnitsForBuilding } from '../data/units';
import { calcUpgradeCost, calcUpgradeTime } from '../utils/economyMath';
import { calcTrainingCost, getUnitCapForLevel } from './gameHelpers';

/**
 * Custom hook that encapsulates building, research, unit training,
 * and birlik (squad) management callbacks.
 *
 * Resources state and economy helpers remain in DesertGameContext / useEconomy;
 * this hook receives only the refs and setters it needs.
 */
export function useBase(
  buildingsRef: React.MutableRefObject<BuildingState[]>,
  setBuildings: React.Dispatch<React.SetStateAction<BuildingState[]>>,
  researchRef: React.MutableRefObject<ResearchState[]>,
  setResearchStates: React.Dispatch<React.SetStateAction<ResearchState[]>>,
  birliklerRef: React.MutableRefObject<Birlik[]>,
  setBirlikler: React.Dispatch<React.SetStateAction<Birlik[]>>,
  resourcesRef: React.MutableRefObject<Resource[]>,
  setMissions: React.Dispatch<React.SetStateAction<Mission[]>>,
  canAfford: (cash: number, oil: number, ore: number) => boolean,
  deductCost: (cash: number, oil: number, ore: number) => void,
  scheduleSave: () => void,
  saveNow: () => void,
) {
  // ── Building helpers ─────────────────────────────────────────
  const getBuilding = useCallback(
    (id: BuildingId) => buildingsRef.current.find(b => b.id === id),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const getUpgradeCost = useCallback((id: BuildingId) => {
    const def = BUILDING_DEFINITIONS[id];
    const b = buildingsRef.current.find(b => b.id === id);
    return calcUpgradeCost(def, b?.level ?? 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUpgradeTime = useCallback((id: BuildingId) => {
    const def = BUILDING_DEFINITIONS[id];
    const b = buildingsRef.current.find(b => b.id === id);
    return calcUpgradeTime(def, b?.level ?? 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUpgradeBuilding, deductCost, saveNow]);

  // ── Research helpers ─────────────────────────────────────────
  const isResearched = useCallback((nodeId: string) =>
    researchRef.current.find(r => r.nodeId === nodeId)?.completed ?? false,
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResearched]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canStartResearch, deductCost, saveNow]);

  const getUnlockedUnitsForBuilding = useCallback((buildingId: BuildingId): UnitDefinition[] => {
    const building = buildingsRef.current.find(b => b.id === buildingId);
    return getUnitsForBuilding(buildingId, building?.level ?? 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Unit helpers ─────────────────────────────────────────────
  const getTrainedCount = useCallback((buildingId: BuildingId, unitId: string) => {
    const b = buildingsRef.current.find(b => b.id === buildingId);
    return b?.trainedUnits?.[unitId] ?? 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTotalTrainedUnits = useCallback(() => {
    const envanterTotal = buildingsRef.current.reduce((total, b) => {
      return total + Object.values(b.trainedUnits ?? {}).reduce((a, v) => a + v, 0);
    }, 0);
    const birlikTotal = birliklerRef.current.reduce((total, bl) => {
      return total + bl.slots.reduce((a, s) => a + s.count, 0);
    }, 0);
    return envanterTotal + birlikTotal;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUnitCap = useCallback(() => {
    const hqLevel = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
    return getUnitCapForLevel(hqLevel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTrainingCost = useCallback(
    (unitId: string, qty: number) => calcTrainingCost(unitId, qty),
    [],
  );

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  // ── Birlik (Squad) helpers ──────────────────────────────────
  const addBirlik = useCallback((birlik: Birlik) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  const removeBirlik = useCallback((id: string) => {
    const bl = birliklerRef.current.find(b => b.id === id);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  return {
    // Building
    getBuilding,
    getUpgradeCost,
    getUpgradeTime,
    canUpgradeBuilding,
    upgradeBuilding,
    // Research
    isResearched,
    getAvailableResearch,
    canStartResearch,
    startResearch,
    getUnlockedUnitsForBuilding,
    // Units
    getTrainedCount,
    getTotalTrainedUnits,
    getUnitCap,
    getBuildingUnitCount,
    getTrainingCost,
    getMaxTrainable,
    canStartTraining,
    startTraining,
    adjustTrainedUnits,
    // Birlik
    addBirlik,
    removeBirlik,
  };
}
