import type { Mission, BuildingState, ResearchState, BattleReport } from './types';

// ── Mission Progress Synchronization (pure function) ─────────
export function syncMissionProgress(
  missions: Mission[],
  buildings: BuildingState[],
  researchStates: ResearchState[],
  battleReports: BattleReport[],
): Mission[] {
  return missions.map(m => {
    if (m.claimed) return m;
    let count = m.currentCount;
    if (m.type === 'upgrade') {
      if (m.targetBuildingId) {
        const b = buildings.find(x => x.id === m.targetBuildingId);
        count = Math.max(count, b ? Math.max(0, b.level - 1) : 0);
      } else {
        count = Math.max(count, buildings.reduce((s, b) => s + Math.max(0, b.level - 1), 0));
      }
    } else if (m.type === 'train') {
      if (m.targetUnitId) {
        const uid = m.targetUnitId;
        count = Math.max(count, buildings.reduce((s, b) => s + ((b.trainedUnits ?? {})[uid] ?? 0), 0));
      } else {
        count = Math.max(count, buildings.reduce((s, b) =>
          s + Object.values(b.trainedUnits ?? {}).reduce((a: number, c: unknown) => a + (c as number), 0), 0));
      }
    } else if (m.type === 'research') {
      count = Math.max(count, researchStates.filter(r => r.completed).length);
    } else if (m.type === 'attack') {
      const wins = battleReports.filter(r => r.won).length;
      count = Math.max(count, m.requiresWin ? wins : battleReports.length);
    }
    // donate tipi görevler handleDonateSuccess callback'i ile doğrudan artırılıyor
    const completed = count >= m.targetCount;
    if (count === m.currentCount && completed === m.completed) return m;
    return { ...m, currentCount: Math.min(count, m.targetCount), completed };
  });
}
