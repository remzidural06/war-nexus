import { useCallback, useMemo } from 'react';
import type { Resource, ResourceKey, BuildingState } from './types';
import {
  calcGoldCostForTime,
  calcUpgradeGoldCostForLevel,
  calcGoldExchangeAmount,
} from './gameHelpers';
import { t } from '../i18n';

/**
 * Custom hook that encapsulates all economy-related callbacks.
 *
 * Resources state itself remains in DesertGameContext (too coupled to persistence),
 * but all read/write helpers for resources and gold live here.
 */
export function useEconomy(
  resourcesRef: React.MutableRefObject<Resource[]>,
  resources: Resource[],
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>,
  buildingsRef: React.MutableRefObject<BuildingState[]>,
  scheduleSave: () => void,
  saveNow: () => void,
  setToastMsg: (msg: string | null) => void,
) {
  // ── Resource helpers ─────────────────────────────────────────
  const getResource = useCallback((key: ResourceKey) =>
    resourcesRef.current.find(r => r.key === key)!,
  [resourcesRef]);

  const canAfford = useCallback((cash: number, oil: number, ore: number) => {
    const rs = resourcesRef.current;
    return (
      (rs.find(r => r.key === 'cash')?.amount ?? 0) >= cash &&
      (rs.find(r => r.key === 'oil')?.amount ?? 0) >= oil &&
      (rs.find(r => r.key === 'ore')?.amount ?? 0) >= ore
    );
  }, [resourcesRef]);

  const deductCost = useCallback((cash: number, oil: number, ore: number) => {
    setResources(current =>
      current.map(r => {
        if (r.key === 'cash') return { ...r, amount: Math.max(0, r.amount - cash) };
        if (r.key === 'oil') return { ...r, amount: Math.max(0, r.amount - oil) };
        if (r.key === 'ore') return { ...r, amount: Math.max(0, r.amount - ore) };
        return r;
      }),
    );
  }, [setResources]);

  // ── Gold helpers ────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goldAmount = useMemo(() => resourcesRef.current.find(r => r.key === 'gold')?.amount ?? 0, [resources]);

  const canAffordGold = useCallback((amount: number) => {
    return (resourcesRef.current.find(r => r.key === 'gold')?.amount ?? 0) >= amount;
  }, [resourcesRef]);

  const addGold = useCallback((amount: number) => {
    setResources(curr => curr.map(r =>
      r.key === 'gold' ? { ...r, amount: Math.min(r.capacity, r.amount + amount) } : r,
    ));
    scheduleSave();
  }, [setResources, scheduleSave]);

  const deductGold = useCallback((amount: number) => {
    setResources(curr => curr.map(r =>
      r.key === 'gold' ? { ...r, amount: Math.max(0, r.amount - amount) } : r,
    ));
    scheduleSave();
  }, [setResources, scheduleSave]);

  const calcGoldCost = useCallback(calcGoldCostForTime, []);
  const calcUpgradeGoldCost = useCallback(calcUpgradeGoldCostForLevel, []);

  const addResource = useCallback((key: 'cash' | 'oil' | 'ore', amount: number) => {
    setResources(curr => curr.map(r =>
      r.key === key ? { ...r, amount: Math.min(r.capacity, r.amount + amount) } : r,
    ));
  }, [setResources]);

  const buyResourceWithGold = useCallback((resourceKey: 'cash' | 'oil' | 'ore', goldAmt: number): boolean => {
    if (goldAmt <= 0) return false;
    if (!canAffordGold(goldAmt)) return false;
    const bankLevel = buildingsRef.current.find(b => b.id === 'bank')?.level ?? 1;
    const gained = calcGoldExchangeAmount(resourceKey, goldAmt, bankLevel);
    deductGold(goldAmt);
    setResources(current =>
      current.map(r =>
        r.key === resourceKey ? { ...r, amount: Math.min(r.capacity, r.amount + gained) } : r,
      ),
    );
    setToastMsg(t('common.goldExchange', { gold: String(goldAmt), amount: gained.toLocaleString(), resource: resourceKey === 'cash' ? '💵' : resourceKey === 'oil' ? '🛢️' : '⛏️' }));
    saveNow();
    return true;
  }, [canAffordGold, deductGold, buildingsRef, setResources, setToastMsg, saveNow]);

  return {
    getResource,
    canAfford,
    deductCost,
    goldAmount,
    canAffordGold,
    addGold,
    deductGold,
    addResource,
    buyResourceWithGold,
    calcGoldCost,
    calcUpgradeGoldCost,
  };
}
