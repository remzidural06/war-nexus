import {
  calcUpgradeCost,
  calcUpgradeTime,
  calcBattleOutcome,
  deductUnitsProportionally,
  calcAttackPower,
} from '../utils/economyMath';
import { BUILDING_DEFINITIONS } from '../data/buildings';

// ─── calcUpgradeCost ──────────────────────────────────────────
describe('calcUpgradeCost', () => {
  const hq = BUILDING_DEFINITIONS.hq;

  test('level 1 returns base cost', () => {
    const cost = calcUpgradeCost(hq, 1);
    expect(cost.cash).toBe(hq.baseCostCash);
    expect(cost.oil).toBe(hq.baseCostOil);
    expect(cost.ore).toBe(hq.baseCostOre);
  });

  test('level 2 applies scale factor', () => {
    const cost = calcUpgradeCost(hq, 2);
    expect(cost.cash).toBe(Math.round(hq.baseCostCash * hq.costScaleFactor));
  });

  test('level 3 compounds correctly', () => {
    const cost = calcUpgradeCost(hq, 3);
    expect(cost.cash).toBe(Math.round(hq.baseCostCash * Math.pow(hq.costScaleFactor, 2)));
  });

  test('higher levels cost more', () => {
    const l1 = calcUpgradeCost(hq, 1);
    const l5 = calcUpgradeCost(hq, 5);
    expect(l5.cash).toBeGreaterThan(l1.cash);
  });
});

// ─── calcUpgradeTime ─────────────────────────────────────────
describe('calcUpgradeTime', () => {
  const barracks = BUILDING_DEFINITIONS.barracks;

  test('level 1 returns base time', () => {
    expect(calcUpgradeTime(barracks, 1)).toBe(barracks.baseUpgradeSeconds);
  });

  test('time increases with level', () => {
    const t1 = calcUpgradeTime(barracks, 1);
    const t5 = calcUpgradeTime(barracks, 5);
    expect(t5).toBeGreaterThan(t1);
  });
});

// ─── calcBattleOutcome ───────────────────────────────────────
describe('calcBattleOutcome', () => {
  test('superior attack wins', () => {
    const { won } = calcBattleOutcome(1000, 500, 100);
    expect(won).toBe(true);
  });

  test('inferior attack loses', () => {
    const { won } = calcBattleOutcome(200, 1000, 100);
    expect(won).toBe(false);
  });

  test('losses never exceed committed units', () => {
    const { losses } = calcBattleOutcome(100, 2000, 50);
    expect(losses).toBeLessThanOrEqual(50);
  });

  test('losses are non-negative', () => {
    const { losses } = calcBattleOutcome(1000, 100, 100);
    expect(losses).toBeGreaterThanOrEqual(0);
  });

  test('overwhelming victory has low losses', () => {
    const { losses } = calcBattleOutcome(5000, 100, 100);
    expect(losses).toBeLessThan(50);
  });

  test('crushing defeat has high losses', () => {
    const { losses } = calcBattleOutcome(10, 5000, 100);
    expect(losses).toBeGreaterThan(50);
  });
});

// ─── deductUnitsProportionally ───────────────────────────────
describe('deductUnitsProportionally', () => {
  test('deducts from first unit if only one type', () => {
    const units = { soldier: 100 };
    const result = deductUnitsProportionally(units, 30);
    expect(result.soldier).toBe(70);
  });

  test('total deducted equals losses', () => {
    const units = { soldier: 50, sniper: 50 };
    const result = deductUnitsProportionally(units, 60);
    const remaining = Object.values(result).reduce((a, b) => a + b, 0);
    expect(remaining).toBe(40);
  });

  test('losses capped at total units', () => {
    const units = { soldier: 10 };
    const result = deductUnitsProportionally(units, 999);
    expect(result.soldier).toBe(0);
  });

  test('zero losses returns unchanged', () => {
    const units = { soldier: 50, sniper: 25 };
    const result = deductUnitsProportionally(units, 0);
    expect(result).toEqual(units);
  });

  test('empty units returns unchanged', () => {
    const units = {};
    const result = deductUnitsProportionally(units, 50);
    expect(result).toEqual({});
  });

  test('units never go below zero', () => {
    const units = { soldier: 20, lightTank: 5 };
    const result = deductUnitsProportionally(units, 100);
    Object.values(result).forEach(count => {
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── calcAttackPower ─────────────────────────────────────────
describe('calcAttackPower', () => {
  test('zero committed gives zero power', () => {
    expect(calcAttackPower(0, 100, 10)).toBe(0);
  });

  test('zero available gives zero power', () => {
    expect(calcAttackPower(50, 0, 10)).toBe(0);
  });

  test('power scales with committed units', () => {
    const p10 = calcAttackPower(10, 100, 10);
    const p50 = calcAttackPower(50, 100, 10);
    expect(p50).toBeGreaterThan(p10);
  });
});
