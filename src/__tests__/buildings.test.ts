import { BUILDING_DEFINITIONS, ALL_BUILDING_IDS } from '../data/buildings';
import { calcUpgradeCost, calcUpgradeTime } from '../utils/economyMath';

// ─── Building data integrity ─────────────────────────────────
describe('building data integrity', () => {
  test('no duplicate building IDs', () => {
    const unique = new Set(ALL_BUILDING_IDS);
    expect(unique.size).toBe(ALL_BUILDING_IDS.length);
  });

  test('ALL_BUILDING_IDS matches BUILDING_DEFINITIONS keys', () => {
    const defKeys = Object.keys(BUILDING_DEFINITIONS).sort();
    const allIds = [...ALL_BUILDING_IDS].sort();
    expect(allIds).toEqual(defKeys);
  });

  test('every building has positive maxLevel', () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      expect(def.maxLevel).toBeGreaterThan(0);
    }
  });

  test('every building has non-negative base costs', () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      expect(def.baseCostCash).toBeGreaterThanOrEqual(0);
      expect(def.baseCostOil).toBeGreaterThanOrEqual(0);
      expect(def.baseCostOre).toBeGreaterThanOrEqual(0);
    }
  });

  test('every building has positive upgrade time', () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      expect(def.baseUpgradeSeconds).toBeGreaterThan(0);
    }
  });

  test('cost scale factor > 1 (costs increase)', () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      expect(def.costScaleFactor).toBeGreaterThan(1);
    }
  });

  test('time scale factor > 1 (time increases)', () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      expect(def.timeScaleFactor).toBeGreaterThan(1);
    }
  });

  test('id field matches its key in BUILDING_DEFINITIONS', () => {
    for (const [key, def] of Object.entries(BUILDING_DEFINITIONS)) {
      expect(def.id).toBe(key);
    }
  });
});

// ─── Cost scaling monotonicity ───────────────────────────────
describe('cost scaling', () => {
  test('upgrade cost increases with level for all buildings', () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      const c1 = calcUpgradeCost(def, 1);
      const c5 = calcUpgradeCost(def, 5);
      expect(c5.cash + c5.oil + c5.ore).toBeGreaterThan(c1.cash + c1.oil + c1.ore);
    }
  });

  test('upgrade time increases with level for all buildings', () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      const t1 = calcUpgradeTime(def, 1);
      const t5 = calcUpgradeTime(def, 5);
      expect(t5).toBeGreaterThan(t1);
    }
  });
});

// ─── Economy buildings have production ───────────────────────
describe('economy buildings', () => {
  const economyBuildings = Object.values(BUILDING_DEFINITIONS).filter(
    d => d.category === 'economy',
  );

  test('economy buildings have produceResource', () => {
    for (const def of economyBuildings) {
      expect(def.produceResource).toBeTruthy();
    }
  });
});
