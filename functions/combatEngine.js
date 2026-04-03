/**
 * Server-side Combat Engine — client combatEngine.ts'in basitleştirilmiş versiyonu.
 * Branch-aware çapraz tablo, efektif hasar karşılaştırması.
 */

// ── Birim branch + attackPower tablosu (units.ts'den) ─────────
const UNIT_DATA = {
  // Infantry
  rifleman: { branch: 'infantry', atk: 6 }, machineGunner: { branch: 'infantry', atk: 10 },
  antiTankOp: { branch: 'infantry', atk: 22 }, manpadsOp: { branch: 'infantry', atk: 8 },
  sniper: { branch: 'infantry', atk: 20 }, combatEngineer: { branch: 'infantry', atk: 16 },
  paradropper: { branch: 'infantry', atk: 28 }, frogman: { branch: 'infantry', atk: 25 },
  droneOp: { branch: 'infantry', atk: 32 }, specOps: { branch: 'infantry', atk: 42 },
  // Armor
  kirpi: { branch: 'armor', atk: 14 }, cobra2: { branch: 'armor', atk: 12 },
  kaplanIfv: { branch: 'armor', atk: 30 }, bradley: { branch: 'armor', atk: 35 },
  puma: { branch: 'armor', atk: 33 }, leopard2a7: { branch: 'armor', atk: 68 },
  m1a2sep3: { branch: 'armor', atk: 72 }, t90m: { branch: 'armor', atk: 65 },
  k2panther: { branch: 'armor', atk: 70 }, altay: { branch: 'armor', atk: 67 },
  t14armata: { branch: 'armor', atk: 88 }, merkava4: { branch: 'armor', atk: 82 },
  // Artillery
  firtina: { branch: 'artillery', atk: 78 }, himars: { branch: 'artillery', atk: 95 },
  kasirga: { branch: 'artillery', atk: 90 },
  // UAV
  tb2: { branch: 'uav', atk: 28 }, mq9reaper: { branch: 'uav', atk: 32 },
  akinci: { branch: 'uav', atk: 40 }, tb3: { branch: 'uav', atk: 48 },
  harop: { branch: 'uav', atk: 52 }, switchblade600: { branch: 'uav', atk: 45 },
  xq58valkyrie: { branch: 'uav', atk: 78 },
  // Helicopter
  uh60m: { branch: 'helicopter', atk: 22 }, ah1z: { branch: 'helicopter', atk: 38 },
  ah64e: { branch: 'helicopter', atk: 58 }, t129atak: { branch: 'helicopter', atk: 50 },
  ka52m: { branch: 'helicopter', atk: 55 }, mi28nm: { branch: 'helicopter', atk: 52 },
  // FixedWing
  f16v: { branch: 'fixedWing', atk: 60 }, fa18ef: { branch: 'fixedWing', atk: 65 },
  rafale: { branch: 'fixedWing', atk: 70 }, typhoon: { branch: 'fixedWing', atk: 67 },
  su35s: { branch: 'fixedWing', atk: 72 }, gripenE: { branch: 'fixedWing', atk: 60 },
  j16: { branch: 'fixedWing', atk: 68 }, f35a: { branch: 'fixedWing', atk: 95 },
  f22raptor: { branch: 'fixedWing', atk: 110 }, su57felon: { branch: 'fixedWing', atk: 100 },
  j20: { branch: 'fixedWing', atk: 98 }, kaan: { branch: 'fixedWing', atk: 102 },
  kizilelmafighter: { branch: 'fixedWing', atk: 96 },
  // Bomber
  b2spirit: { branch: 'bomber', atk: 138 }, b21raider: { branch: 'bomber', atk: 155 },
  // Naval
  heybeliada: { branch: 'naval', atk: 20 }, milgem: { branch: 'naval', atk: 25 },
  tf2000: { branch: 'naval', atk: 58 }, f125: { branch: 'naval', atk: 62 },
  constellation: { branch: 'naval', atk: 68 }, type212a: { branch: 'naval', atk: 70 },
  arleighburke: { branch: 'naval', atk: 95 }, type055: { branch: 'naval', atk: 100 },
  zumwalt: { branch: 'naval', atk: 105 }, qecarrier: { branch: 'naval', atk: 130 },
  fordcarrier: { branch: 'naval', atk: 155 }, virginiaclass: { branch: 'naval', atk: 125 },
  // Air Defense
  stinger: { branch: 'airDefense', atk: 5 }, iglaS: { branch: 'airDefense', atk: 5 },
  hisarA: { branch: 'airDefense', atk: 8 }, hisarO: { branch: 'airDefense', atk: 10 },
  ironDome: { branch: 'airDefense', atk: 8 }, patriotPac3: { branch: 'airDefense', atk: 12 },
  siper: { branch: 'airDefense', atk: 15 }, s500: { branch: 'airDefense', atk: 18 },
  thaad: { branch: 'airDefense', atk: 15 },
};

// ── Çapraz tablo: hangi branch hangi branch'a saldırabilir ──
const CAN_ATTACK = {
  infantry:   ['infantry', 'armor', 'artillery', 'uav', 'helicopter', 'airDefense'],
  armor:      ['infantry', 'armor', 'artillery', 'naval', 'airDefense'],
  artillery:  ['infantry', 'armor', 'artillery', 'naval', 'airDefense'],
  uav:        ['infantry', 'armor', 'artillery', 'naval', 'uav', 'airDefense'],
  helicopter: ['infantry', 'armor', 'artillery', 'naval', 'helicopter', 'airDefense'],
  fixedWing:  ['infantry', 'armor', 'artillery', 'uav', 'helicopter', 'fixedWing', 'bomber', 'naval', 'airDefense'],
  bomber:     ['infantry', 'armor', 'artillery', 'naval', 'airDefense'],
  naval:      ['infantry', 'armor', 'artillery', 'naval'],
  airDefense: ['infantry', 'armor', 'artillery', 'uav', 'helicopter', 'fixedWing', 'bomber', 'naval', 'airDefense'],
};

function canBranchAttack(attacker, defender) {
  return (CAN_ATTACK[attacker] ?? []).includes(defender);
}

/**
 * Server-side savaş çözümleme.
 * @param {Array<{unitId, count}>} attackerUnits — saldıran birimler
 * @param {Array<{unitId, count}>} defenderUnits — savunan birimler
 * @returns {{ won, attackerResults, defenderResults, totalAttackPower, totalDefensePower, totalAttackerLosses, totalDefenderDestroyed }}
 */
function resolveServerCombat(attackerUnits, defenderUnits) {
  // Entry oluştur
  const atkEntries = attackerUnits.map(u => {
    const def = UNIT_DATA[u.unitId];
    if (!def || u.count <= 0) return null;
    return { unitId: u.unitId, branch: def.branch, count: u.count, atk: def.atk, totalPower: u.count * def.atk };
  }).filter(Boolean);

  const defEntries = defenderUnits.map(u => {
    const def = UNIT_DATA[u.unitId];
    if (!def || u.count <= 0) return null;
    return { unitId: u.unitId, branch: def.branch, count: u.count, atk: def.atk, totalPower: u.count * def.atk };
  }).filter(Boolean);

  const totalAtkCount = atkEntries.reduce((s, a) => s + a.count, 0);
  const totalDefCount = defEntries.reduce((s, d) => s + d.count, 0);

  // Birim yoksa
  if (totalAtkCount === 0 || totalDefCount === 0) {
    return {
      won: totalDefCount === 0 && totalAtkCount > 0,
      totalAttackPower: atkEntries.reduce((s, a) => s + a.totalPower, 0),
      totalDefensePower: defEntries.reduce((s, d) => s + d.totalPower, 0),
      totalAttackerLosses: 0,
      totalDefenderDestroyed: totalDefCount,
      attackerResults: atkEntries.map(a => ({ unitId: a.unitId, branch: a.branch, deployed: a.count, losses: 0, damageDealt: a.totalPower })),
      defenderResults: defEntries.map(d => ({ unitId: d.unitId, branch: d.branch, count: d.count, destroyed: d.count })),
    };
  }

  // Efektif hasar hesapla (branch-aware)
  let atkEffDamage = 0;
  for (const atk of atkEntries) {
    const hasTarget = defEntries.some(d => canBranchAttack(atk.branch, d.branch));
    if (hasTarget) atkEffDamage += atk.totalPower;
  }

  let defEffDamage = 0;
  for (const def of defEntries) {
    const hasTarget = atkEntries.some(a => canBranchAttack(def.branch, a.branch));
    if (hasTarget) defEffDamage += def.totalPower;
  }

  // Kazanan: efektif hasarı yüksek olan
  const won = atkEffDamage >= defEffDamage;

  // Kayıplar: karşı tarafın birim sayısı kadar, orantılı dağıtılır
  const atkLossTotal = Math.min(totalDefCount, totalAtkCount);
  const defLossTotal = Math.min(totalAtkCount, totalDefCount);

  const attackerResults = atkEntries.map(a => {
    const share = totalAtkCount > 0 ? Math.ceil(atkLossTotal * (a.count / totalAtkCount)) : 0;
    return { unitId: a.unitId, branch: a.branch, deployed: a.count, losses: Math.min(a.count, share), damageDealt: a.totalPower };
  });

  const defenderResults = defEntries.map(d => {
    const share = totalDefCount > 0 ? Math.ceil(defLossTotal * (d.count / totalDefCount)) : 0;
    return { unitId: d.unitId, branch: d.branch, count: d.count, destroyed: Math.min(d.count, share) };
  });

  return {
    won,
    totalAttackPower: Math.round(atkEffDamage),
    totalDefensePower: Math.round(defEffDamage),
    totalAttackerLosses: attackerResults.reduce((s, a) => s + a.losses, 0),
    totalDefenderDestroyed: defenderResults.reduce((s, d) => s + d.destroyed, 0),
    attackerResults,
    defenderResults,
  };
}

module.exports = { resolveServerCombat, UNIT_DATA };
