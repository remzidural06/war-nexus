import { UNIT_DEFINITIONS, UNIT_MAP, getUnitsForBuilding } from '../data/units';
import { CAN_ATTACK, type UnitBranch } from '../data/combatMatrix';

const VALID_BRANCHES: UnitBranch[] = [
  'infantry', 'armor', 'artillery', 'uav', 'helicopter',
  'fixedWing', 'bomber', 'naval', 'airDefense',
];

const VALID_RESEARCH_BRANCHES = ['land', 'air', 'naval', 'defense'];

// ─── Unit ID uniqueness ──────────────────────────────────────
describe('unit data integrity', () => {
  test('no duplicate unit IDs', () => {
    const ids = UNIT_DEFINITIONS.map(u => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('UNIT_MAP contains all units', () => {
    expect(Object.keys(UNIT_MAP).length).toBe(UNIT_DEFINITIONS.length);
  });

  test('every unit has a valid branch', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(VALID_BRANCHES).toContain(unit.branch);
    }
  });

  test('every unit has a valid research branch', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(VALID_RESEARCH_BRANCHES).toContain(unit.researchBranch);
    }
  });

  test('every unit has positive attack power', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.attackPower).toBeGreaterThan(0);
    }
  });

  test('every unit has positive defense power', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.defensePower).toBeGreaterThan(0);
    }
  });

  test('every unit has non-negative costs', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.costCash).toBeGreaterThanOrEqual(0);
      expect(unit.costOil).toBeGreaterThanOrEqual(0);
      expect(unit.costOre).toBeGreaterThanOrEqual(0);
    }
  });

  test('every unit has positive training time', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.trainingSeconds).toBeGreaterThan(0);
    }
  });

  test('tier is between 1 and 4', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.tier).toBeGreaterThanOrEqual(1);
      expect(unit.tier).toBeLessThanOrEqual(4);
    }
  });

  test('every unit has a required building', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.requiredBuildingId).toBeTruthy();
    }
  });

  test('minBuildingLevel is positive', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.minBuildingLevel).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── getUnitsForBuilding ─────────────────────────────────────
describe('getUnitsForBuilding', () => {
  test('returns units for barracks', () => {
    const units = getUnitsForBuilding('barracks', 20);
    expect(units.length).toBeGreaterThan(0);
    units.forEach(u => expect(u.requiredBuildingId).toBe('barracks'));
  });

  test('returns empty for unknown building', () => {
    const units = getUnitsForBuilding('nonexistent', 20);
    expect(units.length).toBe(0);
  });

  test('level 0 returns no units', () => {
    const units = getUnitsForBuilding('barracks', 0);
    expect(units.length).toBe(0);
  });

  test('higher level unlocks more units', () => {
    const l1 = getUnitsForBuilding('barracks', 1);
    const l15 = getUnitsForBuilding('barracks', 15);
    expect(l15.length).toBeGreaterThanOrEqual(l1.length);
  });
});
