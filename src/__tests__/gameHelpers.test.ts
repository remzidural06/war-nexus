import {
  getUnitCapForLevel,
  calcGoldCostForTime,
  calcUpgradeGoldCostForLevel,
  calcTrainingCost,
  calcGoldExchangeAmount,
  canAffordResources,
  makeInitialResources,
} from '../state/gameHelpers';

// ─── getUnitCapForLevel ──────────────────────────────────────
describe('getUnitCapForLevel', () => {
  test('level 1 returns 50', () => {
    expect(getUnitCapForLevel(1)).toBe(50);
  });

  test('level 5 returns 200', () => {
    expect(getUnitCapForLevel(5)).toBe(200);
  });

  test('level 20 returns 1500', () => {
    expect(getUnitCapForLevel(20)).toBe(1500);
  });

  test('level above 20 clamps to 20', () => {
    expect(getUnitCapForLevel(25)).toBe(1500);
  });

  test('capacity increases or stays same with level', () => {
    let prev = 0;
    for (let lvl = 1; lvl <= 20; lvl++) {
      const cap = getUnitCapForLevel(lvl);
      expect(cap).toBeGreaterThanOrEqual(prev);
      prev = cap;
    }
  });
});

// ─── calcGoldCostForTime ─────────────────────────────────────
describe('calcGoldCostForTime', () => {
  test('zero seconds returns 0', () => {
    expect(calcGoldCostForTime(0)).toBe(0);
  });

  test('negative seconds returns 0', () => {
    expect(calcGoldCostForTime(-100)).toBe(0);
  });

  test('5 minutes = 5 gold', () => {
    expect(calcGoldCostForTime(5 * 60)).toBe(5);
  });

  test('1 hour = 35 gold', () => {
    expect(calcGoldCostForTime(60 * 60)).toBe(35);
  });

  test('24 hours = 450 gold', () => {
    expect(calcGoldCostForTime(24 * 3600)).toBe(450);
  });

  test('cost increases with time', () => {
    const short = calcGoldCostForTime(60);
    const long = calcGoldCostForTime(3600);
    expect(long).toBeGreaterThan(short);
  });
});

// ─── calcUpgradeGoldCostForLevel ─────────────────────────────
describe('calcUpgradeGoldCostForLevel', () => {
  test('level 1 returns low cost', () => {
    const cost = calcUpgradeGoldCostForLevel(1);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(50);
  });

  test('cost increases with level', () => {
    const l1 = calcUpgradeGoldCostForLevel(1);
    const l10 = calcUpgradeGoldCostForLevel(10);
    expect(l10).toBeGreaterThan(l1);
  });
});

// ─── calcTrainingCost ────────────────────────────────────────
describe('calcTrainingCost', () => {
  test('rifleman cost scales with quantity', () => {
    const c1 = calcTrainingCost('rifleman', 1);
    const c10 = calcTrainingCost('rifleman', 10);
    expect(c10.cash).toBe(c1.cash * 10);
    expect(c10.oil).toBe(c1.oil * 10);
    expect(c10.ore).toBe(c1.ore * 10);
  });

  test('unknown unit returns zero costs', () => {
    const cost = calcTrainingCost('nonexistent', 5);
    expect(cost).toEqual({ cash: 0, oil: 0, ore: 0 });
  });

  test('costs are non-negative', () => {
    const cost = calcTrainingCost('rifleman', 1);
    expect(cost.cash).toBeGreaterThanOrEqual(0);
    expect(cost.oil).toBeGreaterThanOrEqual(0);
    expect(cost.ore).toBeGreaterThanOrEqual(0);
  });
});

// ─── calcGoldExchangeAmount ──────────────────────────────────
describe('calcGoldExchangeAmount', () => {
  test('higher bank level gives more resources', () => {
    const l1 = calcGoldExchangeAmount('cash', 10, 1);
    const l10 = calcGoldExchangeAmount('cash', 10, 10);
    expect(l10).toBeGreaterThan(l1);
  });

  test('more gold gives more resources', () => {
    const g1 = calcGoldExchangeAmount('cash', 1, 5);
    const g10 = calcGoldExchangeAmount('cash', 10, 5);
    expect(g10).toBeGreaterThan(g1);
  });

  test('result is positive for valid inputs', () => {
    expect(calcGoldExchangeAmount('oil', 5, 3)).toBeGreaterThan(0);
  });
});

// ─── canAffordResources ──────────────────────────────────────
describe('canAffordResources', () => {
  const resources = makeInitialResources();

  test('can afford within budget', () => {
    expect(canAffordResources(resources, 100, 100, 100)).toBe(true);
  });

  test('cannot afford beyond budget', () => {
    expect(canAffordResources(resources, 999999, 0, 0)).toBe(false);
  });

  test('zero cost is always affordable', () => {
    expect(canAffordResources(resources, 0, 0, 0)).toBe(true);
  });
});

// ─── makeInitialResources ────────────────────────────────────
describe('makeInitialResources', () => {
  test('returns 4 resources', () => {
    expect(makeInitialResources().length).toBe(4);
  });

  test('includes cash, oil, ore, gold', () => {
    const keys = makeInitialResources().map(r => r.key);
    expect(keys).toContain('cash');
    expect(keys).toContain('oil');
    expect(keys).toContain('ore');
    expect(keys).toContain('gold');
  });

  test('all start with positive amounts', () => {
    for (const r of makeInitialResources()) {
      expect(r.amount).toBeGreaterThan(0);
    }
  });
});
