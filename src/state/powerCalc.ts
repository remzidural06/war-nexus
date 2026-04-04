// ── Player Power Calculation (pure function) ─────────────────
const POWER_PER_UNIT_TIER: Record<number, number> = { 1: 10, 2: 30, 3: 60, 4: 100 };

export function calcPlayerPower(
  buildings: { level: number; trainedUnits?: Record<string, number> }[],
  researchStates: { nodeId: string; completed: boolean }[],
  warPower: number,
  unitMap: Record<string, { tier: number }>,
  researchMap: Record<string, { tier: number }>,
): number {
  // Bina seviyeleri: kademeli güç (seviye N'e yükseltme +N×100 güç verir)
  const buildingPower = buildings.reduce((sum, b) => sum + b.level * (b.level + 1) / 2 * 100, 0);
  // Eğitilmiş birimler: adet × tier ağırlığı
  const unitPower = buildings.reduce((sum, b) => {
    for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
      const def = unitMap[unitId];
      sum += count * (POWER_PER_UNIT_TIER[def?.tier ?? 1] ?? 10);
    }
    return sum;
  }, 0);
  // Tamamlanan araştırmalar: tier × 50
  const researchPower = researchStates
    .filter(r => r.completed)
    .reduce((sum, r) => {
      const node = researchMap[r.nodeId];
      return sum + (node?.tier ?? 1) * 50;
    }, 0);
  const basePower = buildingPower + unitPower + researchPower;
  const cappedWarPower = Math.min(warPower, basePower);
  return basePower + cappedWarPower;
}
