import { useCallback } from 'react';
import type {
  Resource,
  ResourceKey,
  BuildingState,
  ResearchState,
  Mission,
} from './types';
import { t } from '../i18n';

/**
 * Custom hook that encapsulates alliance, mission, and speed-up callbacks.
 *
 * These are the remaining "orchestration" helpers that don't belong to
 * useEconomy, useBase, or useCombat.
 */
export function useGameShell(
  buildingsRef: React.MutableRefObject<BuildingState[]>,
  resourcesRef: React.MutableRefObject<Resource[]>,
  researchRef: React.MutableRefObject<ResearchState[]>,
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>,
  setBuildings: React.Dispatch<React.SetStateAction<BuildingState[]>>,
  setResearchStates: React.Dispatch<React.SetStateAction<ResearchState[]>>,
  setMissions: React.Dispatch<React.SetStateAction<Mission[]>>,
  setAllianceContribution: React.Dispatch<React.SetStateAction<number>>,
  setToastMsg: (msg: string | null) => void,
  allianceContribution: number,
  missions: Mission[],
  canAfford: (cash: number, oil: number, ore: number) => boolean,
  deductCost: (cash: number, oil: number, ore: number) => void,
  canAffordGold: (amount: number) => boolean,
  deductGold: (amount: number) => void,
  calcGoldCost: (seconds: number) => number,
  scheduleSave: () => void,
  saveNow: () => void,
) {
  // ── Alliance helpers ─────────────────────────────────────────
  const canDonate = useCallback((resource: ResourceKey, amount: number) => {
    if (amount <= 0) return false;
    return (resourcesRef.current.find(r => r.key === resource)?.amount ?? 0) >= amount;
  }, [resourcesRef]);

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
  }, [canDonate, deductCost, setAllianceContribution, setMissions, scheduleSave]);

  const canRequestHelp = useCallback(() => {
    if (allianceContribution < 10) return false;
    return buildingsRef.current.some(
      b => b.upgradeSecondsRemaining > 0 || b.researchSecondsRemaining > 0,
    );
  }, [allianceContribution, buildingsRef]);

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
  }, [canRequestHelp, setBuildings, setAllianceContribution, scheduleSave]);

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
    // Aninda kaydet — delay olursa claimed durumu kaybolabilir
    setTimeout(() => saveNow(), 100);
  }, [missions, setResources, setMissions, setToastMsg, saveNow]);

  // ── Speed-up with gold ───────────────────────────────────────
  /** Altinla hizlandir — kademeli oran (5dk=5, 1sa=50, 8sa=350, 24sa=1000) */
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
      // Arastirma binasini bul — nodeId veya bina id ile
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcGoldCost, canAffordGold, deductGold, buildingsRef, researchRef, setBuildings, setResearchStates, saveNow]);

  return {
    canDonate,
    donate,
    canRequestHelp,
    requestHelp,
    claimMissionReward,
    speedUpWithGold,
  };
}
