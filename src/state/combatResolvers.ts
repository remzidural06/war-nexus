/**
 * Pure combat resolution functions — no side effects, no state setters.
 * Each function takes inputs and returns a mutations object for the caller to apply.
 */

import { resolveUnitCombat } from '../utils/combatEngine';
import { buildResearchBranchBonus } from './pvpHelpers';
import type {
  March,
  BattleReport,
  MapTarget,
  MarchUnit,
} from './types';

// ── Sefer maliyeti: birim tier'ına göre lojistik harcama ─────────────
const MARCH_COST_PER_TIER: Record<number, { cash: number; oil: number; ore: number }> = {
  1: { cash: 5, oil: 3, ore: 2 },
  2: { cash: 15, oil: 10, ore: 5 },
  3: { cash: 30, oil: 20, ore: 10 },
  4: { cash: 50, oil: 35, ore: 20 },
};

export function calcMarchCost(
  marchUnits: { unitId: string; count: number }[],
  unitMap: Record<string, { tier: number }>,
): { cash: number; oil: number; ore: number } {
  let cash = 0, oil = 0, ore = 0;
  for (const u of marchUnits) {
    const tier = unitMap[u.unitId]?.tier ?? 1;
    const cost = MARCH_COST_PER_TIER[tier] ?? MARCH_COST_PER_TIER[1];
    cash += u.count * cost.cash;
    oil += u.count * cost.oil;
    ore += u.count * cost.ore;
  }
  return { cash, oil, ore };
}

// ── Sefer süresi: birim sayısına göre 3dk–5dk arası (180–300 saniye) ──
const MIN_TRAVEL = 180; // 3 dakika
const MAX_TRAVEL = 300; // 5 dakika
const UNIT_CAP = 500;   // 500+ birimde max süre

export function calcTravelSeconds(unitCount: number): number {
  const ratio = Math.min(unitCount, UNIT_CAP) / UNIT_CAP;
  return Math.round(MIN_TRAVEL + ratio * (MAX_TRAVEL - MIN_TRAVEL));
}

// ── March Resolution (PvE) ───────────────────────────────────

export interface MarchResolutionResult {
  won: boolean;
  report: BattleReport;
  powerChange: number;
  resourceChanges: { cash: number; oil: number; ore: number };
  clearBirlikler: boolean;
  counterAttack: {
    attackerName: string;
    attackUnits: { unitId: string; count: number }[];
    unitCount: number;
    totalSeconds: number;
  } | null;
}

export function resolveMarchResult(
  march: March,
  target: MapTarget,
  researchStates: { nodeId: string; completed: boolean }[],
  researchMap: Record<string, { branch: string }>,
  currentWarPower: number,
  hasShield: boolean,
  /** Inject randomness for testability; defaults to Math.random */
  rng: () => number = Math.random,
): MarchResolutionResult {
  const branchBonus = buildResearchBranchBonus(researchStates, researchMap);

  const result = resolveUnitCombat({
    attackerUnits: march.marchUnits ?? [],
    defenderUnits: target.defenseUnits ?? [],
    attackerResearchBonus: branchBonus,
  });

  const { won } = result;
  const totalDefPower = result.totalDefensePower;
  const losses = result.totalAttackerLosses;

  // Power change
  const powerChange = won
    ? Math.max(20, Math.round(totalDefPower * 0.3))
    : -Math.round(currentWarPower * 0.1);

  // Resource changes
  const resourceChanges = won
    ? { cash: target.rewardCash, oil: target.rewardOil, ore: target.rewardOre }
    : {
        cash: -Math.round(target.rewardCash * 0.5),
        oil: -Math.round(target.rewardOil * 0.5),
        ore: -Math.round(target.rewardOre * 0.5),
      };

  // Battle report
  const report: BattleReport = {
    id: `report_${Date.now()}`,
    targetId: march.targetId,
    targetName: march.targetName,
    timestamp: Date.now(),
    won,
    attackPower: result.totalAttackPower,
    defensePower: result.totalDefensePower,
    unitsLost: losses,
    rewardCash: resourceChanges.cash,
    rewardOil: resourceChanges.oil,
    rewardOre: resourceChanges.ore,
    powerChange,
    attackerResults: result.attackerResults,
    defenderResults: result.defenderResults,
  };

  // CPU counter-attack (40% chance, no shield, target has defense units)
  let counterAttack: MarchResolutionResult['counterAttack'] = null;
  if (!hasShield && rng() < 0.4 && target.defenseUnits && target.defenseUnits.length > 0) {
    const scale = 0.3 + rng() * 0.5;
    const attackUnits = target.defenseUnits
      .map(du => ({ unitId: du.unitId, count: Math.max(1, Math.round(du.count * scale)) }))
      .filter(du => du.count > 0);
    const unitCount = attackUnits.reduce((s, u) => s + u.count, 0);
    const totalSeconds = calcTravelSeconds(unitCount);
    counterAttack = {
      attackerName: target.player,
      attackUnits,
      unitCount,
      totalSeconds,
    };
  }

  return {
    won,
    report,
    powerChange,
    resourceChanges,
    clearBirlikler: !won,
    counterAttack,
  };
}

// ── Incoming Attack Resolution (PvP defense) ─────────────────

export interface IncomingResolutionResult {
  defended: boolean;
  report: BattleReport;
  powerChange: number;
  resourceChanges: { cash: number; oil: number; ore: number };
  transferCash: number;
  transferOil: number;
  transferOre: number;
  transferPower: number;
  clearBirlikler: boolean;
  applyShield: boolean;
  defenderUnitLosses: { unitId: string; destroyed: number }[];
}

export function resolveIncomingResult(
  attackUnits: { unitId: string; count: number }[],
  defenderUnits: MarchUnit[],
  defenderResearchBonus: Record<string, number>,
  attackerResources: { cash: number; oil: number; ore: number },
  defenderResources: { cash: number; oil: number; ore: number },
  attackerPlayerPower: number,
  defenderPlayerPower: number,
  attackerName: string,
): IncomingResolutionResult {
  // Combat: enemy attacks, player defends
  const result = resolveUnitCombat({
    attackerUnits: attackUnits.map(u => ({ unitId: u.unitId, count: u.count, buildingId: '' })),
    defenderUnits: defenderUnits.map(u => ({ unitId: u.unitId, count: u.count })),
    attackerResearchBonus: {},
    defenderResearchBonus,
  });

  const defended = !result.won;

  // Loser's 20% resources and power transfer to winner
  const loserPP = defended ? attackerPlayerPower : defenderPlayerPower;
  const loserRes = defended ? attackerResources : defenderResources;
  const transferCash = Math.round(loserRes.cash * 0.2);
  const transferOil = Math.round(loserRes.oil * 0.2);
  const transferOre = Math.round(loserRes.ore * 0.2);
  const transferPower = Math.max(10, Math.round(loserPP * 0.2));

  const sign = defended ? 1 : -1;
  const resourceChanges = {
    cash: sign * transferCash,
    oil: sign * transferOil,
    ore: sign * transferOre,
  };
  const powerChange = sign * transferPower;

  // Defender unit losses (only when defender lost)
  const defenderUnitLosses: { unitId: string; destroyed: number }[] = [];
  if (!defended && result.defenderResults) {
    for (const dr of result.defenderResults) {
      if (dr.destroyed > 0) {
        defenderUnitLosses.push({ unitId: dr.unitId, destroyed: dr.destroyed });
      }
    }
  }

  const defenderLossCount = defended ? 0 : result.totalDefenderDestroyed;

  const report: BattleReport = {
    id: `report_def_${Date.now()}`,
    targetId: 'defense',
    targetName: `${attackerName} Saldırısı`,
    timestamp: Date.now(),
    won: defended,
    attackPower: result.totalAttackPower,
    defensePower: result.totalDefensePower,
    unitsLost: defenderLossCount,
    rewardCash: resourceChanges.cash,
    rewardOil: resourceChanges.oil,
    rewardOre: resourceChanges.ore,
    powerChange,
    attackerResults: result.attackerResults,
    defenderResults: result.defenderResults,
  };

  return {
    defended,
    report,
    powerChange,
    resourceChanges,
    transferCash,
    transferOil,
    transferOre,
    transferPower,
    clearBirlikler: !defended,
    applyShield: !defended,
    defenderUnitLosses,
  };
}
