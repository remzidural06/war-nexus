/**
 * Combat Interaction Matrix v2
 * Hangi birim dalı hangi dala saldırabilir.
 * Tek kaynak (single source of truth) — HelpScreen ve combatEngine buradan okur.
 *
 * Tasarım prensipleri:
 * - Hiçbir branş yenilmez olmamalı (her birimin en az 1 counter'ı var)
 * - Gerçekçi: MANPADS piyade helikopter/UAV düşürür, jet kara hedeflerini de vurur
 * - Dengeli: karışık ordu (kara+hava+deniz) her zaman avantajlı
 *
 * Tablo:
 * | Saldıran ↓ / Hedef →  | inf | arm | art | uav | hel | fix | bom | nav | air |
 * |------------------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|
 * | infantry               |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |  ❌ |  ❌ |  ❌ |  ✅ |
 * | armor                  |  ✅ |  ✅ |  ✅ |  ❌ |  ❌ |  ❌ |  ❌ |  ✅ |  ✅ |
 * | artillery              |  ✅ |  ✅ |  ✅ |  ❌ |  ❌ |  ❌ |  ❌ |  ✅ |  ✅ |
 * | uav                    |  ✅ |  ✅ |  ✅ |  ✅ |  ❌ |  ❌ |  ❌ |  ✅ |  ✅ |
 * | helicopter             |  ✅ |  ✅ |  ✅ |  ❌ |  ✅ |  ❌ |  ❌ |  ✅ |  ✅ |
 * | fixedWing              |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |
 * | bomber                 |  ✅ |  ✅ |  ✅ |  ❌ |  ❌ |  ❌ |  ❌ |  ✅ |  ✅ |
 * | naval                  |  ✅ |  ✅ |  ✅ |  ❌ |  ❌ |  ❌ |  ❌ |  ✅ |  ❌ |
 * | airDefense             |  ❌ |  ❌ |  ❌ |  ✅ |  ✅ |  ✅ |  ✅ |  ❌ |  ❌ |
 */

export type UnitBranch =
  | 'infantry' | 'armor' | 'artillery'
  | 'uav' | 'helicopter' | 'fixedWing' | 'bomber'
  | 'naval' | 'airDefense';

/** attacker branch → saldırabildiği hedef dallar */
export const CAN_ATTACK: Record<UnitBranch, UnitBranch[]> = {
  // Piyade: kara + UAV/helikopter (MANPADS) + hava savunma
  infantry:   ['infantry', 'armor', 'artillery', 'uav', 'helicopter', 'airDefense'],

  // Zırhlı: kara + deniz + hava savunma (ama hava birimlerine vuramaz)
  armor:      ['infantry', 'armor', 'artillery', 'naval', 'airDefense'],

  // Topçu: kara + deniz + hava savunma
  artillery:  ['infantry', 'armor', 'artillery', 'naval', 'airDefense'],

  // İHA: kara + deniz + hava savunma + diğer UAV'lar
  uav:        ['infantry', 'armor', 'artillery', 'naval', 'uav', 'airDefense'],

  // Helikopter: kara + deniz + hava savunma + diğer helikopterler
  helicopter: ['infantry', 'armor', 'artillery', 'naval', 'helicopter', 'airDefense'],

  // Savaş uçağı (multirole): HER ŞEYİ vurabilir — en güçlü ama en pahalı
  fixedWing:  ['infantry', 'armor', 'artillery', 'uav', 'helicopter', 'fixedWing', 'bomber', 'naval', 'airDefense'],

  // Bombardıman uçağı: kara + deniz + hava savunma (hava savaşı yapamaz)
  bomber:     ['infantry', 'armor', 'artillery', 'naval', 'airDefense'],

  // Deniz: kara + deniz (hava vuramaz, hava savunma vuramaz)
  naval:      ['infantry', 'armor', 'artillery', 'naval'],

  // Hava savunma: savunurken tüm birimlere hasar verir (saldırıda zaten gitmez)
  airDefense: ['infantry', 'armor', 'artillery', 'uav', 'helicopter', 'fixedWing', 'bomber', 'naval', 'airDefense'],
};

/** A dalı B dalına saldırabilir mi? */
export function canBranchAttack(attacker: string, defender: string): boolean {
  return (CAN_ATTACK[attacker as UnitBranch] ?? []).includes(defender as UnitBranch);
}

export type Interaction = 'canAttack' | 'mutual' | 'getsAttacked' | 'none';

/** İki dal arasındaki etkileşim türü (seçili birimin perspektifinden) */
export function getInteraction(selectedBranch: string, targetBranch: string): Interaction {
  const canAtt = canBranchAttack(selectedBranch, targetBranch);
  const getsAtt = canBranchAttack(targetBranch, selectedBranch);
  if (canAtt && getsAtt) return 'mutual';
  if (canAtt) return 'canAttack';
  if (getsAtt) return 'getsAttacked';
  return 'none';
}
