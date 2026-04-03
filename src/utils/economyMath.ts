import type { BuildingDefinition, BuildingState, ResourceKey } from '../state/types';

// Upgrade cost: baseCost * scaleFactor^(level-1)
export function calcUpgradeCost(
  def: BuildingDefinition,
  currentLevel: number,
): { cash: number; oil: number; ore: number } {
  const scale = Math.pow(def.costScaleFactor, currentLevel - 1);
  return {
    cash: Math.round(def.baseCostCash * scale),
    oil: Math.round(def.baseCostOil * scale),
    ore: Math.round(def.baseCostOre * scale),
  };
}

// Upgrade time: baseSeconds * timeScaleFactor^(level-1)
export function calcUpgradeTime(def: BuildingDefinition, currentLevel: number): number {
  return Math.round(def.baseUpgradeSeconds * Math.pow(def.timeScaleFactor, currentLevel - 1));
}

// Resource production per second at given level
export function calcProductionPerSecond(basePerHour: number, level: number): number {
  return (basePerHour * level) / 3600;
}

// Storage capacity scale (linear for now)
export function calcCapacity(baseCapacity: number, level: number): number {
  return Math.round(baseCapacity * (1 + (level - 1) * 0.5));
}

// Battle outcome: returns { won, losses }
export function calcBattleOutcome(
  attackPower: number,
  defensePower: number,
  committedUnits: number,
): { won: boolean; losses: number } {
  const ratio = attackPower / Math.max(1, defensePower);
  const won = ratio >= 1.0;
  let lossRatio: number;
  if (won) {
    lossRatio = Math.max(0.05, 0.5 - (ratio - 1) * 0.2);
  } else {
    lossRatio = Math.min(1.0, 0.7 + (1 - ratio) * 0.4);
  }
  const losses = Math.round(committedUnits * lossRatio);
  return { won, losses: Math.min(losses, committedUnits) };
}

// Attack power: weighted sum of committed units across buildings
export function calcAttackPower(
  committedUnits: number,
  totalAvailable: number,
  baseAttackPerUnit: number,
): number {
  if (totalAvailable === 0) return 0;
  return Math.round(committedUnits * baseAttackPerUnit);
}

// Proportionally deduct losses from a Record<unitId, count>
export function deductUnitsProportionally(
  trainedUnits: Record<string, number>,
  losses: number,
): Record<string, number> {
  const total = Object.values(trainedUnits).reduce((a, b) => a + b, 0);
  if (total === 0 || losses <= 0) return trainedUnits;
  let remaining = Math.min(losses, total);
  const result: Record<string, number> = { ...trainedUnits };
  for (const unitId of Object.keys(result)) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, result[unitId]);
    result[unitId] -= take;
    remaining -= take;
  }
  return result;
}
