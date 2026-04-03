import { resolveUnitCombat, resolveClassicCombat, COMBAT_CONFIG } from '../utils/combatEngine';
import type { CombatInput } from '../utils/combatEngine';

// ─── resolveClassicCombat ────────────────────────────────────
describe('resolveClassicCombat', () => {
  test('superior attack wins', () => {
    const { won } = resolveClassicCombat(1000, 500, 100);
    expect(won).toBe(true);
  });

  test('inferior attack loses', () => {
    const { won } = resolveClassicCombat(200, 1000, 100);
    expect(won).toBe(false);
  });

  test('equal power wins (attacker advantage)', () => {
    const { won } = resolveClassicCombat(500, 500, 100);
    expect(won).toBe(true);
  });

  test('losses never exceed committed units', () => {
    const { losses } = resolveClassicCombat(10, 10000, 50);
    expect(losses).toBeLessThanOrEqual(50);
  });

  test('losses are non-negative', () => {
    const { losses } = resolveClassicCombat(5000, 1, 100);
    expect(losses).toBeGreaterThanOrEqual(0);
  });

  test('overwhelming victory has low losses', () => {
    const { losses } = resolveClassicCombat(10000, 100, 100);
    expect(losses).toBeLessThan(50);
  });

  test('crushing defeat has high losses', () => {
    const { losses } = resolveClassicCombat(10, 10000, 100);
    expect(losses).toBeGreaterThan(50);
  });
});

// ─── resolveUnitCombat ───────────────────────────────────────
describe('resolveUnitCombat', () => {
  const makeInput = (
    attackerUnits: { unitId: string; count: number }[],
    defenderUnits: { unitId: string; count: number }[],
    attackerResearchBonus: Record<string, number> = {},
    defenderResearchBonus: Record<string, number> = {},
  ): CombatInput => ({
    attackerUnits: attackerUnits.map(u => ({ ...u, fromBuildingId: 'barracks' })),
    defenderUnits: defenderUnits.map(u => ({ ...u })),
    attackerResearchBonus,
    defenderResearchBonus,
  });

  test('attacker wins with stronger units', () => {
    // rifleman (atk:6) vs rifleman - more attackers should win
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 200 }],
      [{ unitId: 'rifleman', count: 50 }],
    ));
    expect(result.won).toBe(true);
  });

  test('defender wins when stronger', () => {
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 10 }],
      [{ unitId: 'rifleman', count: 200 }],
    ));
    expect(result.won).toBe(false);
  });

  test('empty attacker loses', () => {
    const result = resolveUnitCombat(makeInput(
      [],
      [{ unitId: 'rifleman', count: 50 }],
    ));
    expect(result.won).toBe(false);
  });

  test('empty defender means attacker wins', () => {
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 50 }],
      [],
    ));
    expect(result.won).toBe(true);
    expect(result.totalAttackerLosses).toBe(0);
  });

  test('both empty results in no win', () => {
    const result = resolveUnitCombat(makeInput([], []));
    expect(result.won).toBe(false);
  });

  test('attacker losses are non-negative', () => {
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 100 }],
      [{ unitId: 'rifleman', count: 100 }],
    ));
    expect(result.totalAttackerLosses).toBeGreaterThanOrEqual(0);
  });

  test('defender destroyed count is non-negative', () => {
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 100 }],
      [{ unitId: 'rifleman', count: 100 }],
    ));
    expect(result.totalDefenderDestroyed).toBeGreaterThanOrEqual(0);
  });

  test('attacker losses do not exceed deployed units', () => {
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 50 }],
      [{ unitId: 'rifleman', count: 200 }],
    ));
    const totalDeployed = result.attackerResults.reduce((s, a) => s + a.deployed, 0);
    expect(result.totalAttackerLosses).toBeLessThanOrEqual(totalDeployed);
  });

  test('defender destroyed does not exceed count', () => {
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 200 }],
      [{ unitId: 'rifleman', count: 50 }],
    ));
    const totalDefCount = result.defenderResults.reduce((s, d) => s + d.count, 0);
    expect(result.totalDefenderDestroyed).toBeLessThanOrEqual(totalDefCount);
  });

  test('research bonus increases effective power', () => {
    const withoutBonus = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 100 }],
      [{ unitId: 'rifleman', count: 100 }],
    ));
    const withBonus = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 100 }],
      [{ unitId: 'rifleman', count: 100 }],
      { land: 1 },  // +100% attack bonus
    ));
    expect(withBonus.totalAttackPower).toBeGreaterThan(withoutBonus.totalAttackPower);
  });

  test('totalAttackPower and totalDefensePower are positive with units', () => {
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 50 }],
      [{ unitId: 'rifleman', count: 50 }],
    ));
    expect(result.totalAttackPower).toBeGreaterThan(0);
    expect(result.totalDefensePower).toBeGreaterThan(0);
  });

  test('mixed army vs single branch', () => {
    // Infantry + armor vs only infantry — mixed should deal more damage
    const result = resolveUnitCombat(makeInput(
      [
        { unitId: 'rifleman', count: 50 },
        { unitId: 'altay', count: 20 },
      ],
      [{ unitId: 'rifleman', count: 100 }],
    ));
    expect(result.totalAttackPower).toBeGreaterThan(0);
    expect(result.attackerResults.length).toBe(2);
  });

  test('air defense cannot be attacked by infantry only by branch rules', () => {
    // Air defense only attacks air units; infantry can attack airDefense
    const result = resolveUnitCombat(makeInput(
      [{ unitId: 'rifleman', count: 100 }],
      [{ unitId: 'patriot', count: 10 }],
    ));
    // infantry can attack airDefense per combat matrix
    expect(result.totalAttackPower).toBeGreaterThan(0);
  });
});

// ─── COMBAT_CONFIG ───────────────────────────────────────────
describe('COMBAT_CONFIG', () => {
  test('winner loss range is valid', () => {
    expect(COMBAT_CONFIG.WINNER_MIN_LOSS).toBeLessThan(COMBAT_CONFIG.WINNER_MAX_LOSS);
    expect(COMBAT_CONFIG.WINNER_MIN_LOSS).toBeGreaterThanOrEqual(0);
    expect(COMBAT_CONFIG.WINNER_MAX_LOSS).toBeLessThanOrEqual(1);
  });

  test('loser loss range is valid', () => {
    expect(COMBAT_CONFIG.LOSER_MIN_LOSS).toBeLessThan(COMBAT_CONFIG.LOSER_MAX_LOSS);
    expect(COMBAT_CONFIG.LOSER_MIN_LOSS).toBeGreaterThanOrEqual(0);
    expect(COMBAT_CONFIG.LOSER_MAX_LOSS).toBeLessThanOrEqual(1);
  });
});
