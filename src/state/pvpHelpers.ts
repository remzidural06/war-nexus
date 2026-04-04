/**
 * PvP helper functions — pure calculations extracted from DesertGameContext.
 * No side effects, no state, fully testable.
 */

import type { MarchUnit } from './types';

/** Filter out airDefense units (they don't march on attacks) */
export function filterOffensiveUnits(
  marchUnits: MarchUnit[],
  unitMap: Record<string, { branch: string }>,
): MarchUnit[] {
  return marchUnits.filter(mu => {
    const unit = unitMap[mu.unitId];
    return unit?.branch !== 'airDefense';
  });
}

/** Calculate attack power from march units with research bonuses */
export function calcMarchAttackPower(
  marchUnits: MarchUnit[],
  unitMap: Record<string, { attackPower: number; researchBranch: string }>,
  researchBranchBonus: Record<string, number>,
): number {
  let power = 0;
  for (const mu of marchUnits) {
    const unit = unitMap[mu.unitId];
    if (!unit) continue;
    const bonus = 1 + (researchBranchBonus[unit.researchBranch] ?? 0);
    power += Math.round(mu.count * unit.attackPower * bonus);
  }
  return Math.max(1, power);
}

/** Build research branch bonus map from completed research states */
export function buildResearchBranchBonus(
  researchStates: { nodeId: string; completed: boolean }[],
  researchMap: Record<string, { branch: string }>,
): Record<string, number> {
  const bonus: Record<string, number> = {};
  for (const rs of researchStates) {
    if (rs.completed) {
      const node = researchMap[rs.nodeId];
      if (node) bonus[node.branch] = (bonus[node.branch] ?? 0) + 0.12;
    }
  }
  return bonus;
}

/** Collect all defender units from buildings + birlikler */
export function collectDefenderUnits(
  buildings: { trainedUnits?: Record<string, number> }[],
  birlikler: { slots: { unitId: string; count: number }[] }[],
): { unitId: string; count: number; buildingId: string }[] {
  const totals: Record<string, number> = {};
  for (const b of buildings) {
    for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
      if ((count as number) > 0) totals[unitId] = (totals[unitId] ?? 0) + (count as number);
    }
  }
  for (const bl of birlikler) {
    for (const slot of bl.slots) {
      if (slot.count > 0) totals[slot.unitId] = (totals[slot.unitId] ?? 0) + slot.count;
    }
  }
  return Object.entries(totals)
    .filter(([_, count]) => count > 0)
    .map(([unitId, count]) => ({ unitId, count, buildingId: '' }));
}

/** Calculate resource transfers: loser gives 20% to winner */
export function calcPvPTransfer(
  won: boolean,
  attackerResources: { cash: number; oil: number; ore: number },
  defenderResources: { cash: number; oil: number; ore: number },
  attackerPower: number,
  defenderPower: number,
): {
  lootCash: number;
  lootOil: number;
  lootOre: number;
  powerChange: number;
  transferCash: number;
  transferOil: number;
  transferOre: number;
  transferPower: number;
} {
  const loserCash = won ? defenderResources.cash : attackerResources.cash;
  const loserOil = won ? defenderResources.oil : attackerResources.oil;
  const loserOre = won ? defenderResources.ore : attackerResources.ore;
  const loserPower = won ? defenderPower : attackerPower;

  const transferCash = Math.round(loserCash * 0.2);
  const transferOil = Math.round(loserOil * 0.2);
  const transferOre = Math.round(loserOre * 0.2);
  const transferPower = Math.max(10, Math.round(loserPower * 0.2));

  return {
    lootCash: won ? transferCash : -transferCash,
    lootOil: won ? transferOil : -transferOil,
    lootOre: won ? transferOre : -transferOre,
    powerChange: won ? transferPower : -transferPower,
    transferCash,
    transferOil,
    transferOre,
    transferPower,
  };
}

/** Calculate defender's player power from their base data */
export function calcDefenderPower(
  buildings: { level?: number; trainedUnits?: Record<string, number> }[],
  unitMap: Record<string, { tier: number }>,
  warPower: number,
): number {
  const tierPower: Record<number, number> = { 1: 10, 2: 30, 3: 60, 4: 100 };
  const bp = buildings.reduce((s, b) => s + (b.level ?? 1) * 100, 0);
  const up = buildings.reduce((s, b) => {
    for (const [uId, cnt] of Object.entries(b.trainedUnits ?? {})) {
      const def = unitMap[uId];
      s += (cnt as number) * (tierPower[def?.tier ?? 1] ?? 10);
    }
    return s;
  }, 0);
  return bp + up + warPower;
}

/** Apply unit losses to birlikler after combat */
export function applyBirlikLosses<T extends { unitId: string; count: number; buildingId: string }>(
  birlikler: { id: string; name: string; slots: T[] }[],
  attackerResults: { unitId: string; losses: number }[],
): typeof birlikler {
  const lossMap: Record<string, number> = {};
  for (const ar of attackerResults) {
    if (ar.losses > 0) lossMap[ar.unitId] = (lossMap[ar.unitId] ?? 0) + ar.losses;
  }
  return birlikler.map(bl => ({
    ...bl,
    slots: bl.slots.map(slot => {
      const loss = lossMap[slot.unitId] ?? 0;
      if (loss <= 0) return slot;
      const deduct = Math.min(slot.count, loss);
      lossMap[slot.unitId] = loss - deduct;
      return { ...slot, count: slot.count - deduct };
    }).filter(slot => slot.count > 0),
  })).filter(bl => bl.slots.length > 0);
}

/** PvP cooldown constant — 4 hours */
export const PVP_COOLDOWN_MS = 4 * 60 * 60 * 1000;
