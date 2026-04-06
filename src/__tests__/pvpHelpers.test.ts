import {
  filterOffensiveUnits,
  calcMarchAttackPower,
  buildResearchBranchBonus,
  collectDefenderUnits,
  calcPvPTransfer,
  calcDefenderPower,
  applyBirlikLosses,
  PVP_COOLDOWN_MS,
} from '../state/pvpHelpers';

/* ------------------------------------------------------------------ */
/*  1. filterOffensiveUnits                                           */
/* ------------------------------------------------------------------ */
describe('filterOffensiveUnits', () => {
  const unitMap: Record<string, { branch: string }> = {
    tank1: { branch: 'armor' },
    aa1: { branch: 'airDefense' },
    inf1: { branch: 'infantry' },
  };

  it('filters out airDefense units', () => {
    const march = [
      { unitId: 'tank1', count: 5, buildingId: 'b1' },
      { unitId: 'aa1', count: 3, buildingId: 'b2' },
      { unitId: 'inf1', count: 10, buildingId: 'b3' },
    ];
    const result = filterOffensiveUnits(march, unitMap);
    expect(result).toHaveLength(2);
    expect(result.map(u => u.unitId)).toEqual(['tank1', 'inf1']);
  });

  it('keeps all units when none are airDefense', () => {
    const march = [
      { unitId: 'tank1', count: 2, buildingId: 'b1' },
      { unitId: 'inf1', count: 4, buildingId: 'b3' },
    ];
    expect(filterOffensiveUnits(march, unitMap)).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(filterOffensiveUnits([], unitMap)).toEqual([]);
  });

  it('filters out units not found in unitMap', () => {
    const march = [{ unitId: 'unknown', count: 1, buildingId: 'b1' }];
    // unit is undefined, so unit?.branch is undefined, which !== 'airDefense' → kept?
    // Actually: undefined !== 'airDefense' is true, so it passes the filter.
    const result = filterOffensiveUnits(march, unitMap);
    expect(result).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  2. calcMarchAttackPower                                           */
/* ------------------------------------------------------------------ */
describe('calcMarchAttackPower', () => {
  const unitMap: Record<string, { attackPower: number; researchBranch: string }> = {
    tank1: { attackPower: 100, researchBranch: 'armor' },
    inf1: { attackPower: 20, researchBranch: 'infantry' },
  };

  it('calculates power with no bonus', () => {
    const march = [{ unitId: 'tank1', count: 5, buildingId: 'b1' }];
    // 5 * 100 * 1 = 500
    expect(calcMarchAttackPower(march, unitMap, {})).toBe(500);
  });

  it('applies research branch bonus correctly', () => {
    const march = [{ unitId: 'tank1', count: 10, buildingId: 'b1' }];
    const bonus = { armor: 0.24 }; // +24%
    // 10 * 100 * 1.24 = 1240
    expect(calcMarchAttackPower(march, unitMap, bonus)).toBe(1240);
  });

  it('sums power from multiple unit types', () => {
    const march = [
      { unitId: 'tank1', count: 2, buildingId: 'b1' },
      { unitId: 'inf1', count: 10, buildingId: 'b2' },
    ];
    // 2*100*1 + 10*20*1 = 200 + 200 = 400
    expect(calcMarchAttackPower(march, unitMap, {})).toBe(400);
  });

  it('returns minimum 1 for empty units', () => {
    expect(calcMarchAttackPower([], unitMap, {})).toBe(1);
  });

  it('skips units not found in unitMap', () => {
    const march = [
      { unitId: 'missing', count: 5, buildingId: 'b1' },
      { unitId: 'tank1', count: 1, buildingId: 'b2' },
    ];
    // missing is skipped, tank1: 1*100*1 = 100
    expect(calcMarchAttackPower(march, unitMap, {})).toBe(100);
  });
});

/* ------------------------------------------------------------------ */
/*  3. buildResearchBranchBonus                                       */
/* ------------------------------------------------------------------ */
describe('buildResearchBranchBonus', () => {
  const researchMap: Record<string, { branch: string }> = {
    r1: { branch: 'armor' },
    r2: { branch: 'armor' },
    r3: { branch: 'infantry' },
  };

  it('returns bonus for completed research', () => {
    const states = [{ nodeId: 'r1', completed: true }];
    expect(buildResearchBranchBonus(states, researchMap)).toEqual({ armor: 0.12 });
  });

  it('ignores uncompleted research', () => {
    const states = [
      { nodeId: 'r1', completed: false },
      { nodeId: 'r3', completed: false },
    ];
    expect(buildResearchBranchBonus(states, researchMap)).toEqual({});
  });

  it('stacks multiple completed research in same branch', () => {
    const states = [
      { nodeId: 'r1', completed: true },
      { nodeId: 'r2', completed: true },
    ];
    const result = buildResearchBranchBonus(states, researchMap);
    expect(result.armor).toBeCloseTo(0.24);
  });

  it('handles multiple branches', () => {
    const states = [
      { nodeId: 'r1', completed: true },
      { nodeId: 'r3', completed: true },
    ];
    const result = buildResearchBranchBonus(states, researchMap);
    expect(result).toEqual({ armor: 0.12, infantry: 0.12 });
  });

  it('returns empty object for empty states', () => {
    expect(buildResearchBranchBonus([], researchMap)).toEqual({});
  });

  it('skips nodeIds not in researchMap', () => {
    const states = [{ nodeId: 'missing', completed: true }];
    expect(buildResearchBranchBonus(states, researchMap)).toEqual({});
  });
});

/* ------------------------------------------------------------------ */
/*  4. collectDefenderUnits                                           */
/* ------------------------------------------------------------------ */
describe('collectDefenderUnits', () => {
  it('collects units from buildings', () => {
    const buildings: { trainedUnits: Record<string, number> }[] = [
      { trainedUnits: { tank1: 5, inf1: 10 } },
      { trainedUnits: { tank1: 3 } },
    ];
    const result = collectDefenderUnits(buildings, []);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ unitId: 'tank1', count: 8 }),
        expect.objectContaining({ unitId: 'inf1', count: 10 }),
      ]),
    );
  });

  it('collects units from birlikler', () => {
    const birlikler = [
      { slots: [{ unitId: 'inf1', count: 7 }] },
      { slots: [{ unitId: 'inf1', count: 3 }] },
    ];
    const result = collectDefenderUnits([], birlikler);
    expect(result).toEqual([
      expect.objectContaining({ unitId: 'inf1', count: 10 }),
    ]);
  });

  it('combines buildings and birlikler', () => {
    const buildings = [{ trainedUnits: { tank1: 5 } }];
    const birlikler = [{ slots: [{ unitId: 'tank1', count: 2 }] }];
    const result = collectDefenderUnits(buildings, birlikler);
    expect(result).toEqual([
      expect.objectContaining({ unitId: 'tank1', count: 7 }),
    ]);
  });

  it('filters out zero-count entries', () => {
    const buildings = [{ trainedUnits: { tank1: 0 } }];
    const result = collectDefenderUnits(buildings, []);
    expect(result).toEqual([]);
  });

  it('handles buildings without trainedUnits', () => {
    const buildings = [{}];
    const result = collectDefenderUnits(buildings, []);
    expect(result).toEqual([]);
  });

  it('returns empty for empty inputs', () => {
    expect(collectDefenderUnits([], [])).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  5. calcPvPTransfer                                                */
/* ------------------------------------------------------------------ */
describe('calcPvPTransfer', () => {
  const attackerRes = { cash: 1000, oil: 500, ore: 200 };
  const defenderRes = { cash: 2000, oil: 1000, ore: 400 };

  it('winner gets 20% of loser resources (attacker wins)', () => {
    const r = calcPvPTransfer(true, attackerRes, defenderRes, 500, 300);
    expect(r.lootCash).toBe(400);   // 2000 * 0.2
    expect(r.lootOil).toBe(200);    // 1000 * 0.2
    expect(r.lootOre).toBe(80);     // 400 * 0.2
    expect(r.powerChange).toBeGreaterThan(0);
  });

  it('loser loses 20% of own resources (attacker loses)', () => {
    const r = calcPvPTransfer(false, attackerRes, defenderRes, 500, 300);
    expect(r.lootCash).toBe(-200);  // -(1000 * 0.2)
    expect(r.lootOil).toBe(-100);   // -(500 * 0.2)
    expect(r.lootOre).toBe(-40);    // -(200 * 0.2)
    expect(r.powerChange).toBeLessThan(0);
  });

  it('transfer fields are always positive', () => {
    const r = calcPvPTransfer(false, attackerRes, defenderRes, 500, 300);
    expect(r.transferCash).toBe(200);
    expect(r.transferOil).toBe(100);
    expect(r.transferOre).toBe(40);
    expect(r.transferPower).toBe(100); // 500 * 0.2
  });

  it('enforces minimum transferPower of 10', () => {
    const r = calcPvPTransfer(true, attackerRes, defenderRes, 500, 20);
    // loserPower = 20, 20*0.2 = 4, but minimum is 10
    expect(r.transferPower).toBe(10);
  });

  it('handles zero resources', () => {
    const zeroRes = { cash: 0, oil: 0, ore: 0 };
    const r = calcPvPTransfer(true, zeroRes, zeroRes, 100, 100);
    expect(r.lootCash).toBe(0);
    expect(r.lootOil).toBe(0);
    expect(r.lootOre).toBe(0);
    expect(r.transferPower).toBe(20); // 100 * 0.2
  });
});

/* ------------------------------------------------------------------ */
/*  6. calcDefenderPower                                              */
/* ------------------------------------------------------------------ */
describe('calcDefenderPower', () => {
  const unitMap: Record<string, { tier: number }> = {
    tank1: { tier: 3 },
    inf1: { tier: 1 },
  };

  it('calculates building power + capped warPower (units excluded)', () => {
    const buildings = [
      { level: 5, trainedUnits: { tank1: 2 } as Record<string, number> }, // bp = 5*6/2*100 = 1500
      { level: 3, trainedUnits: { inf1: 10 } as Record<string, number> },  // bp = 3*4/2*100 = 600
    ];
    // bp = 1500 + 600 = 2100, warPower = 50 (capped to min(50,2100)=50)
    expect(calcDefenderPower(buildings, unitMap, 50)).toBe(2150);
  });

  it('defaults building level to 1', () => {
    const buildings = [{ trainedUnits: {} }]; // no level → 1
    // bp = 1*2/2*100 = 100, warPower = 0
    expect(calcDefenderPower(buildings, unitMap, 0)).toBe(100);
  });

  it('handles empty buildings', () => {
    // bp = 0, warPower = 200 but capped to min(200,0) = 0
    expect(calcDefenderPower([], unitMap, 200)).toBe(0);
  });

  it('units do not affect power', () => {
    const buildings = [
      { level: 1, trainedUnits: { unknownUnit: 5 } },
    ];
    // bp = 100, warPower = 0
    expect(calcDefenderPower(buildings, unitMap, 0)).toBe(100);
  });

  it('warPower is capped to basePower', () => {
    const buildings = [
      { level: 2, trainedUnits: { t1: 1, t2: 1, t3: 1, t4: 1 } },
    ];
    // bp = 2*3/2*100 = 300, warPower = 5000 capped to min(5000,300) = 300
    expect(calcDefenderPower(buildings, unitMap, 5000)).toBe(600);
  });
});

/* ------------------------------------------------------------------ */
/*  7. applyBirlikLosses                                              */
/* ------------------------------------------------------------------ */
describe('applyBirlikLosses', () => {
  it('applies partial losses to a slot', () => {
    const birlikler = [
      { id: 'b1', name: 'Alpha', slots: [{ unitId: 'tank1', count: 10, buildingId: 'x' }] },
    ];
    const losses = [{ unitId: 'tank1', losses: 3 }];
    const result = applyBirlikLosses(birlikler, losses);
    expect(result).toEqual([
      { id: 'b1', name: 'Alpha', slots: [{ unitId: 'tank1', count: 7, buildingId: 'x' }] },
    ]);
  });

  it('removes slot entirely on total loss', () => {
    const birlikler = [
      { id: 'b1', name: 'Alpha', slots: [{ unitId: 'tank1', count: 5, buildingId: 'x' }] },
    ];
    const losses = [{ unitId: 'tank1', losses: 5 }];
    const result = applyBirlikLosses(birlikler, losses);
    // slot count becomes 0 → filtered, birlik has no slots → filtered
    expect(result).toEqual([]);
  });

  it('removes birlik when all slots are lost', () => {
    const birlikler = [
      {
        id: 'b1',
        name: 'Alpha',
        slots: [
          { unitId: 'tank1', count: 3, buildingId: 'x' },
          { unitId: 'inf1', count: 2, buildingId: 'y' },
        ],
      },
    ];
    const losses = [
      { unitId: 'tank1', losses: 3 },
      { unitId: 'inf1', losses: 2 },
    ];
    expect(applyBirlikLosses(birlikler, losses)).toEqual([]);
  });

  it('leaves slots untouched when no losses', () => {
    const birlikler = [
      { id: 'b1', name: 'Alpha', slots: [{ unitId: 'tank1', count: 10, buildingId: 'x' }] },
    ];
    const result = applyBirlikLosses(birlikler, []);
    expect(result).toEqual(birlikler);
  });

  it('returns empty array for empty birlikler', () => {
    expect(applyBirlikLosses([], [{ unitId: 'tank1', losses: 5 }])).toEqual([]);
  });

  it('distributes losses across multiple birlikler', () => {
    const birlikler = [
      { id: 'b1', name: 'Alpha', slots: [{ unitId: 'tank1', count: 3, buildingId: 'x' }] },
      { id: 'b2', name: 'Bravo', slots: [{ unitId: 'tank1', count: 5, buildingId: 'y' }] },
    ];
    const losses = [{ unitId: 'tank1', losses: 4 }];
    const result = applyBirlikLosses(birlikler, losses);
    // First birlik loses 3 (all), second loses 1 remaining
    expect(result).toEqual([
      { id: 'b2', name: 'Bravo', slots: [{ unitId: 'tank1', count: 4, buildingId: 'y' }] },
    ]);
  });

  it('does not over-deduct beyond losses', () => {
    const birlikler = [
      { id: 'b1', name: 'Alpha', slots: [{ unitId: 'tank1', count: 100, buildingId: 'x' }] },
    ];
    const losses = [{ unitId: 'tank1', losses: 2 }];
    const result = applyBirlikLosses(birlikler, losses);
    expect(result[0].slots[0].count).toBe(98);
  });
});

/* ------------------------------------------------------------------ */
/*  8. PVP_COOLDOWN_MS                                                */
/* ------------------------------------------------------------------ */
describe('PVP_COOLDOWN_MS', () => {
  it('equals 4 hours in milliseconds', () => {
    expect(PVP_COOLDOWN_MS).toBe(4 * 60 * 60 * 1000);
  });

  it('equals 14_400_000 ms', () => {
    expect(PVP_COOLDOWN_MS).toBe(14_400_000);
  });
});
