/**
 * Savaş Motoru v3 — Branch-aware, güç bazlı, adil ve şeffaf.
 *
 * Kurallar:
 * 1. Her birim sadece CAN_ATTACK matrisindeki branş'lara hasar verir
 * 2. Hedef alamadığı branş'lara 0 hasar (piyade hava birimlerine vuramaz)
 * 3. Toplam efektif güç = verilen hasar toplamı
 * 4. Efektif gücü yüksek olan kazanır
 * 5. Kayıplar güç oranına göre, orantılı dağıtılır
 */

import { canBranchAttack } from '../data/combatMatrix';
import { UNIT_MAP } from '../data/units';
import type { MarchUnit, DefenseUnit, UnitBattleResult, DefenseUnitResult } from '../state/types';

// ── Ayarlanabilir sabitler ────────────────────────────────────
export const COMBAT_CONFIG = {
  WINNER_MIN_LOSS: 0.05,
  WINNER_MAX_LOSS: 0.50,
  LOSER_MIN_LOSS: 0.60,
  LOSER_MAX_LOSS: 1.00,
} as const;

// ── Girdi / Çıktı tipleri ─────────────────────────────────────
export interface CombatInput {
  attackerUnits: MarchUnit[];
  defenderUnits: DefenseUnit[];
  attackerResearchBonus: Record<string, number>;
  defenderResearchBonus?: Record<string, number>;
}

export interface CombatResult {
  won: boolean;
  attackerResults: UnitBattleResult[];
  defenderResults: DefenseUnitResult[];
  totalAttackerLosses: number;
  totalDefenderDestroyed: number;
  totalAttackPower: number;
  totalDefensePower: number;
}

interface UnitEntry {
  unitId: string;
  branch: string;
  count: number;
  powerPerUnit: number;
  totalPower: number;
}

function buildEntries(
  units: { unitId: string; count: number }[],
  researchBonus: Record<string, number>,
): UnitEntry[] {
  return units
    .map(u => {
      const def = UNIT_MAP[u.unitId];
      if (!def || u.count <= 0) return null;
      const bonus = 1 + (researchBonus[def.researchBranch] ?? 0);
      const ppu = def.attackPower * bonus;
      return { unitId: u.unitId, branch: def.branch, count: u.count, powerPerUnit: ppu, totalPower: u.count * ppu };
    })
    .filter(Boolean) as UnitEntry[];
}

/**
 * Bir tarafın diğer tarafa verdiği efektif hasarı hesapla.
 * Her birim sadece CAN_ATTACK matrisindeki hedeflere hasar verir.
 */
function calcEffectiveDamage(
  attackers: UnitEntry[],
  defenders: UnitEntry[],
): { totalDamage: number; damagePerUnit: Map<string, number> } {
  let totalDamage = 0;
  const damagePerUnit = new Map<string, number>();

  for (const atk of attackers) {
    // Bu birimin vurabileceği hedefler
    const validTargets = defenders.filter(d => canBranchAttack(atk.branch, d.branch));
    if (validTargets.length === 0) {
      damagePerUnit.set(atk.unitId, 0);
      continue;
    }
    // Hasarı hedefler arasında eşit dağıt
    const damage = atk.totalPower;
    damagePerUnit.set(atk.unitId, damage);
    totalDamage += damage;
  }

  return { totalDamage, damagePerUnit };
}

// ── Ana savaş fonksiyonu ──────────────────────────────────────
export function resolveUnitCombat(input: CombatInput): CombatResult {
  const { attackerUnits, defenderUnits, attackerResearchBonus, defenderResearchBonus } = input;

  const atkEntries = buildEntries(attackerUnits, attackerResearchBonus);
  const defEntries = buildEntries(
    defenderUnits.map(d => ({ unitId: d.unitId, count: d.count })),
    defenderResearchBonus ?? {},
  );

  const totalAttackerCount = atkEntries.reduce((s, a) => s + a.count, 0);
  const totalDefenderCount = defEntries.reduce((s, d) => s + d.count, 0);

  // Toplam güç (rapor için)
  const totalAttackPowerRaw = atkEntries.reduce((s, a) => s + a.totalPower, 0);
  const totalDefensePowerRaw = defEntries.reduce((s, d) => s + d.totalPower, 0);

  // Birim yoksa
  if (totalAttackerCount === 0 || totalDefenderCount === 0) {
    return {
      won: totalDefenderCount === 0 && totalAttackerCount > 0,
      attackerResults: atkEntries.map(a => ({
        unitId: a.unitId, branch: a.branch, deployed: a.count,
        losses: 0, damageDealt: Math.round(a.totalPower),
      })),
      defenderResults: defEntries.map(d => ({
        unitId: d.unitId, branch: d.branch, count: d.count, destroyed: d.count,
      })),
      totalAttackerLosses: 0,
      totalDefenderDestroyed: totalDefenderCount,
      totalAttackPower: Math.round(totalAttackPowerRaw),
      totalDefensePower: Math.round(totalDefensePowerRaw),
    };
  }

  // ── Efektif hasar hesabı (branch-aware) ──
  const atkDamage = calcEffectiveDamage(atkEntries, defEntries);
  const defDamage = calcEffectiveDamage(defEntries, atkEntries);

  // ── Kazanan: efektif hasarı yüksek olan ──
  const won = atkDamage.totalDamage >= defDamage.totalDamage;

  // ── Güç oranı ──
  const effectiveAtkPower = Math.max(1, atkDamage.totalDamage);
  const effectiveDefPower = Math.max(1, defDamage.totalDamage);
  const ratio = won
    ? effectiveAtkPower / effectiveDefPower
    : effectiveDefPower / effectiveAtkPower;

  // ── Branch-aware kayıp dağıtımı ──
  // Kayıp sadece karşı tarafın vurabildiği birimlere dağıtılır.
  // Piyade gemiyi vuramaz → gemi birimler kayıp almaz.

  /**
   * Hedeflenebilir birimleri bul ve kayıpları sadece onlara dağıt.
   * opponents: karşı taraf birimleri (hasar veren taraf)
   * targets: kayıp alacak taraf birimleri
   */
  function distributeTargetedLosses(
    opponents: UnitEntry[],
    targets: UnitEntry[],
  ): Map<string, number> {
    const lossMap = new Map<string, number>();
    targets.forEach(t => lossMap.set(t.unitId, 0));

    // Hangi hedef branch'ler vurulabiliyor?
    const targetableBranches = new Set<string>();
    for (const opp of opponents) {
      for (const tgt of targets) {
        if (canBranchAttack(opp.branch, tgt.branch)) {
          targetableBranches.add(tgt.branch);
        }
      }
    }

    // Sadece vurulabilir birimleri filtrele
    const vulnerable = targets.filter(t => targetableBranches.has(t.branch));
    const vulnerableCount = vulnerable.reduce((s, v) => s + v.count, 0);
    const opponentCount = opponents.reduce((s, o) => s + o.count, 0);

    if (vulnerableCount === 0 || opponentCount === 0) return lossMap;

    // Toplam kayıp = karşı tarafın birim sayısı (max vurulabilir birim sayısı)
    let remainingLoss = Math.min(opponentCount, vulnerableCount);

    for (const v of vulnerable) {
      if (remainingLoss <= 0) break;
      const share = Math.ceil(remainingLoss * (v.count / vulnerableCount));
      const loss = Math.min(v.count, share);
      lossMap.set(v.unitId, loss);
      remainingLoss -= loss;
    }

    return lossMap;
  }

  // ── Saldıran kayıpları: savunanın vurabildiği saldıran birimlerine ──
  const atkLossMap = distributeTargetedLosses(defEntries, atkEntries);
  const attackerResults: UnitBattleResult[] = atkEntries.map(a => {
    const dmgDealt = atkDamage.damagePerUnit.get(a.unitId) ?? 0;
    return {
      unitId: a.unitId,
      branch: a.branch,
      deployed: a.count,
      losses: atkLossMap.get(a.unitId) ?? 0,
      damageDealt: Math.round(dmgDealt),
    };
  });

  // ── Savunan kayıpları: saldıranın vurabildiği savunan birimlerine ──
  const defLossMap = distributeTargetedLosses(atkEntries, defEntries);
  const defenderResults: DefenseUnitResult[] = defEntries.map(d => ({
    unitId: d.unitId,
    branch: d.branch,
    count: d.count,
    destroyed: defLossMap.get(d.unitId) ?? 0,
  }));

  return {
    won,
    attackerResults,
    defenderResults,
    totalAttackerLosses: attackerResults.reduce((s, a) => s + a.losses, 0),
    totalDefenderDestroyed: defenderResults.reduce((s, d) => s + d.destroyed, 0),
    totalAttackPower: Math.round(effectiveAtkPower),
    totalDefensePower: Math.round(effectiveDefPower),
  };
}

// ── Eski sistem fallback ─────────────────────────────────────
export function resolveClassicCombat(
  attackPower: number,
  defensePower: number,
  committedUnits: number,
): { won: boolean; losses: number } {
  const won = attackPower >= defensePower;
  const ratio = attackPower / Math.max(1, defensePower);
  let lossRatio: number;
  if (won) {
    const dominance = Math.min(1, (ratio - 1) / 2);
    lossRatio = 0.50 - dominance * 0.45;
  } else {
    const inverseRatio = defensePower / Math.max(1, attackPower);
    const dominance = Math.min(1, (inverseRatio - 1) / 2);
    lossRatio = 0.60 + dominance * 0.40;
  }
  const losses = Math.min(committedUnits, Math.round(committedUnits * lossRatio));
  return { won, losses };
}
