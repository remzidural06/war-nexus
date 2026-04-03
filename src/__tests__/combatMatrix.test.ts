import { CAN_ATTACK, canBranchAttack, getInteraction, type UnitBranch } from '../data/combatMatrix';

const ALL_BRANCHES: UnitBranch[] = [
  'infantry', 'armor', 'artillery', 'uav', 'helicopter',
  'fixedWing', 'bomber', 'naval', 'airDefense',
];

// ─── canBranchAttack ─────────────────────────────────────────
describe('canBranchAttack', () => {
  test('infantry can attack infantry', () => {
    expect(canBranchAttack('infantry', 'infantry')).toBe(true);
  });

  test('infantry cannot attack fixedWing', () => {
    expect(canBranchAttack('infantry', 'fixedWing')).toBe(false);
  });

  test('fixedWing can attack everything', () => {
    for (const branch of ALL_BRANCHES) {
      expect(canBranchAttack('fixedWing', branch)).toBe(true);
    }
  });

  test('naval cannot attack air units', () => {
    expect(canBranchAttack('naval', 'uav')).toBe(false);
    expect(canBranchAttack('naval', 'helicopter')).toBe(false);
    expect(canBranchAttack('naval', 'fixedWing')).toBe(false);
    expect(canBranchAttack('naval', 'bomber')).toBe(false);
  });

  test('unknown branch returns false', () => {
    expect(canBranchAttack('unknown', 'infantry')).toBe(false);
  });
});

// ─── CAN_ATTACK matrix ──────────────────────────────────────
describe('CAN_ATTACK matrix', () => {
  test('all branches are defined', () => {
    for (const branch of ALL_BRANCHES) {
      expect(CAN_ATTACK[branch]).toBeDefined();
      expect(Array.isArray(CAN_ATTACK[branch])).toBe(true);
    }
  });

  test('every branch can attack at least one target', () => {
    for (const branch of ALL_BRANCHES) {
      expect(CAN_ATTACK[branch].length).toBeGreaterThan(0);
    }
  });

  test('no branch is immune — every branch has at least one attacker', () => {
    for (const defender of ALL_BRANCHES) {
      const hasAttacker = ALL_BRANCHES.some(attacker =>
        CAN_ATTACK[attacker].includes(defender),
      );
      expect(hasAttacker).toBe(true);
    }
  });

  test('CAN_ATTACK values only contain valid branch names', () => {
    for (const branch of ALL_BRANCHES) {
      for (const target of CAN_ATTACK[branch]) {
        expect(ALL_BRANCHES).toContain(target);
      }
    }
  });

  test('no duplicate entries in any branch target list', () => {
    for (const branch of ALL_BRANCHES) {
      const targets = CAN_ATTACK[branch];
      const unique = new Set(targets);
      expect(unique.size).toBe(targets.length);
    }
  });
});

// ─── getInteraction ──────────────────────────────────────────
describe('getInteraction', () => {
  test('mutual when both can attack each other', () => {
    expect(getInteraction('infantry', 'armor')).toBe('mutual');
  });

  test('canAttack when only attacker can hit', () => {
    // infantry can attack airDefense, but airDefense can also attack infantry → mutual
    // armor cannot attack uav, uav can attack armor → getsAttacked
    // bomber can attack naval, naval can attack bomber? Let's check:
    // bomber → naval ✅, naval → bomber ❌ → canAttack
    expect(getInteraction('bomber', 'naval')).toBe('canAttack');
  });

  test('getsAttacked when only defender can hit', () => {
    // naval cannot attack uav, uav can attack naval
    expect(getInteraction('naval', 'uav')).toBe('getsAttacked');
  });
});
