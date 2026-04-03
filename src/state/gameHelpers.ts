import { UNIT_MAP } from '../data/units';
import type { ResourceKey, Resource } from './types';

// ─── Unit Capacity Table ─────────────────────────────────────
export const UNIT_CAP_TABLE: Record<number, number> = {
  1: 50, 2: 50, 3: 100, 4: 100, 5: 200, 6: 200,
  7: 350, 8: 350, 9: 500, 10: 500, 11: 700, 12: 700,
  13: 900, 14: 900, 15: 1100, 16: 1100, 17: 1300, 18: 1300,
  19: 1500, 20: 1500,
};

export function getUnitCapForLevel(hqLevel: number): number {
  return UNIT_CAP_TABLE[Math.min(hqLevel, 20)] ?? 50;
}

// ─── Gold Cost Calculation ───────────────────────────────────
export function calcGoldCostForTime(remainingSeconds: number): number {
  const minutes = remainingSeconds / 60;
  if (minutes <= 0) return 0;
  if (minutes <= 5) return 5;
  if (minutes <= 15) return 10;
  if (minutes <= 30) return 20;
  if (minutes <= 60) return 35;
  if (minutes <= 120) return 60;
  if (minutes <= 240) return 100;
  if (minutes <= 480) return 180;
  if (minutes <= 720) return 280;
  if (minutes <= 1440) return 450;
  if (minutes <= 2880) return 800;
  if (minutes <= 4320) return 1200;
  return Math.ceil(1200 + (minutes - 4320) / 5);
}

export function calcUpgradeGoldCostForLevel(buildingLevel: number): number {
  const estimatedMinutes = Math.pow(buildingLevel, 2.2) * 3;
  return calcGoldCostForTime(estimatedMinutes * 60);
}

// ─── Training Cost ───────────────────────────────────────────
export function calcTrainingCost(unitId: string, qty: number): { cash: number; oil: number; ore: number } {
  const unit = UNIT_MAP[unitId];
  if (!unit) return { cash: 0, oil: 0, ore: 0 };
  return {
    cash: unit.costCash * qty,
    oil: unit.costOil * qty,
    ore: unit.costOre * qty,
  };
}

// ─── Gold-to-Resource Exchange Rate ──────────────────────────
export const GOLD_TO_RESOURCE_BASE: Record<string, number> = {
  cash: 500,
  oil: 200,
  ore: 150,
};

export function calcGoldExchangeAmount(
  resourceKey: 'cash' | 'oil' | 'ore',
  goldAmount: number,
  bankLevel: number,
): number {
  const baseRate = GOLD_TO_RESOURCE_BASE[resourceKey] ?? 500;
  return Math.round(baseRate * goldAmount * (1 + 0.10 * bankLevel));
}

// ─── Resource Helpers ────────────────────────────────────────
export function canAffordResources(
  resources: Resource[],
  cash: number,
  oil: number,
  ore: number,
): boolean {
  return (
    (resources.find(r => r.key === 'cash')?.amount ?? 0) >= cash &&
    (resources.find(r => r.key === 'oil')?.amount ?? 0) >= oil &&
    (resources.find(r => r.key === 'ore')?.amount ?? 0) >= ore
  );
}

// ─── Initial State Factories ─────────────────────────────────
export function makeInitialResources(): Resource[] {
  return [
    { key: 'cash', label: 'Nakit', amount: 2000, capacity: 10000000, productionPerHour: 400, icon: '💵' },
    { key: 'oil', label: 'Petrol', amount: 800, capacity: 10000000, productionPerHour: 200, icon: '🛢️' },
    { key: 'ore', label: 'Cevher', amount: 500, capacity: 10000000, productionPerHour: 150, icon: '⛏️' },
    { key: 'gold', label: 'Altın', amount: 150, capacity: 1000000, productionPerHour: 0, icon: '🪙' },
  ];
}
