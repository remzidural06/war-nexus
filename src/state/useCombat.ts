import { useCallback } from 'react';
import { MAP_TARGETS } from '../data/mapTargets';
import { UNIT_MAP } from '../data/units';
import { RESEARCH_MAP } from '../data/research';
import { calcBattleOutcome, deductUnitsProportionally } from '../utils/economyMath';
import { getCurrentUser } from '../services/authService';
import { db } from '../services/firebase';
import { syncPlayerProfile } from '../services/cloudSave';
import { findPvPTargets, launchPvPAttack, loadDefenderBase, cancelPvPMarch } from '../services/pvpService';
import type { PvPTarget } from '../services/pvpService';
import { addWarScore as addWarScoreSvc, saveWarBattleLog } from '../services/allianceService';
import {
  filterOffensiveUnits,
  calcMarchAttackPower,
  buildResearchBranchBonus,
  calcDefenderPower,
  PVP_COOLDOWN_MS,
} from './pvpHelpers';
import { resolveMarchResult, resolveIncomingResult, calcTravelSeconds, calcMarchCost } from './combatResolvers';
import { t } from '../i18n';
import type {
  Resource,
  BuildingState,
  ResearchState,
  March,
  MarchUnit,
  BattleReport,
  IncomingAttack,
  Mission,
  Birlik,
} from './types';

/**
 * Custom hook that encapsulates all combat, PvP, and joint-attack callbacks.
 *
 * Effects/listeners that resolve incoming PvP attacks remain in DesertGameContext.
 * This hook receives refs and setters from the parent and returns callback functions.
 */
export function useCombat(
  uid: string | null,
  // Refs
  buildingsRef: React.MutableRefObject<BuildingState[]>,
  resourcesRef: React.MutableRefObject<Resource[]>,
  researchRef: React.MutableRefObject<ResearchState[]>,
  marchRef: React.MutableRefObject<March | null>,
  birliklerRef: React.MutableRefObject<Birlik[]>,
  battleReportsRef: React.MutableRefObject<BattleReport[]>,
  playerPowerRef: React.MutableRefObject<number>,
  firestoreMarchIdRef: React.MutableRefObject<string | null>,
  allianceRef: React.MutableRefObject<any>,
  shieldUntilRef: React.MutableRefObject<number>,
  // State setters
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>,
  setBuildings: React.Dispatch<React.SetStateAction<BuildingState[]>>,
  setActiveMarch: React.Dispatch<React.SetStateAction<March | null>>,
  setBattleReports: React.Dispatch<React.SetStateAction<BattleReport[]>>,
  setIncomingAttack: React.Dispatch<React.SetStateAction<IncomingAttack | null>>,
  setBirlikler: React.Dispatch<React.SetStateAction<Birlik[]>>,
  setWarPower: React.Dispatch<React.SetStateAction<number>>,
  setShieldUntil: React.Dispatch<React.SetStateAction<number>>,
  setLastBattleReport: React.Dispatch<React.SetStateAction<BattleReport | null>>,
  setMissions: React.Dispatch<React.SetStateAction<Mission[]>>,
  setToastMsg: (msg: string | null) => void,
  setPvpTargets: React.Dispatch<React.SetStateAction<PvPTarget[]>>,
  setPvpLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setPvpCooldowns: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  setRevengeTargets: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  // State values needed
  pvpCooldowns: Record<string, number>,
  shieldUntil: number,
  warPower: number,
  playerPower: number,
  // Economy functions
  canAffordGold: (amount: number) => boolean,
  deductGold: (amount: number) => void,
  canAfford: (cash: number, oil: number, ore: number) => boolean,
  // Base functions
  getTotalTrainedUnits: () => number,
  // Save functions
  scheduleSave: () => void,
  _saveNow: () => void,
  // Wins/Losses persistent counters
  winsRef: React.MutableRefObject<number>,
  lossesRef: React.MutableRefObject<number>,
  setWins: React.Dispatch<React.SetStateAction<number>>,
  setLosses: React.Dispatch<React.SetStateAction<number>>,
) {
  // ── Helper: add battle report + update ref + increment wins/losses ──
  const addBattleReport = useCallback((report: BattleReport) => {
    setBattleReports(prev => {
      const next = [report, ...prev].slice(0, 20);
      battleReportsRef.current = next;
      return next;
    });
    if (report.won) {
      setWins(prev => { const n = prev + 1; winsRef.current = n; return n; });
    } else {
      setLosses(prev => { const n = prev + 1; lossesRef.current = n; return n; });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PvP cooldown ──────────────────────────────────────────────
  const getPvPCooldown = useCallback((targetUid: string): number => {
    const lastAttack = pvpCooldowns[targetUid];
    if (!lastAttack) return 0;
    const remaining = Math.max(0, (lastAttack + PVP_COOLDOWN_MS) - Date.now());
    return Math.ceil(remaining / 1000); // saniye
  }, [pvpCooldowns]);

  // ── Clear last battle report ──────────────────────────────────
  const clearLastBattleReport = useCallback(() => {
    setLastBattleReport(null);
  }, [setLastBattleReport]);

  // ── getTotalAttackPower ───────────────────────────────────────
  const getTotalAttackPower = useCallback((committedUnits: number) => {
    const total = getTotalTrainedUnits();
    if (total === 0 || committedUnits === 0) return 0;
    const ratio = Math.min(1, committedUnits / total);
    // Research bonuses: each completed node in a branch adds 12% attack power for that branch
    const branchBonus: Record<string, number> = {};
    for (const rs of researchRef.current) {
      if (rs.completed) {
        const node = RESEARCH_MAP[rs.nodeId];
        if (node) {
          branchBonus[node.branch] = (branchBonus[node.branch] ?? 0) + 0.12;
        }
      }
    }
    let power = 0;
    for (const b of buildingsRef.current) {
      for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
        const unit = UNIT_MAP[unitId];
        if (!unit) continue;
        const bonus = 1 + (branchBonus[unit.researchBranch] ?? 0);
        power += Math.floor(count * ratio) * unit.attackPower * bonus;
      }
    }
    return Math.max(1, Math.round(power));
  }, [getTotalTrainedUnits, researchRef, buildingsRef]);

  // ── canAttack ─────────────────────────────────────────────────
  const canAttack = useCallback((targetId: string, committedUnits: number) => {
    if (marchRef.current !== null) return false;
    if (committedUnits < 1) return false;
    // Kalkan aktifken saldiri yapilamaz
    if (Date.now() < shieldUntilRef.current) return false;
    return getTotalTrainedUnits() >= committedUnits;
  }, [marchRef, getTotalTrainedUnits, shieldUntilRef]);

  // ── attackTarget (CPU) ────────────────────────────────────────
  const attackTarget = useCallback((targetId: string, targetName: string, committedUnits: number, marchUnits?: MarchUnit[]) => {
    if (!canAttack(targetId, committedUnits)) return;
    const target = MAP_TARGETS.find(t => t.id === targetId);
    if (!target) return;
    // Sefer maliyeti kontrolü ve kesintisi
    const cost = marchUnits ? calcMarchCost(marchUnits, UNIT_MAP) : { cash: 0, oil: 0, ore: 0 };
    if (marchUnits && !canAfford(cost.cash, cost.oil, cost.ore)) {
      setToastMsg(t('attack.insufficientResources'));
      return;
    }
    if (marchUnits) {
      setResources(prev => prev.map(r => {
        if (r.key === 'cash') return { ...r, amount: r.amount - cost.cash };
        if (r.key === 'oil') return { ...r, amount: r.amount - cost.oil };
        if (r.key === 'ore') return { ...r, amount: r.amount - cost.ore };
        return r;
      }));
    }
    const power = getTotalAttackPower(committedUnits);
    const travelSec = calcTravelSeconds(committedUnits);
    const march: March = {
      id: `march_${Date.now()}`,
      targetId,
      targetName,
      type: 'attack',
      committedUnits,
      totalSeconds: travelSec,
      secondsRemaining: travelSec,
      attackPower: power,
      marchUnits,
      marchCost: cost,
    };
    setActiveMarch(march);
    scheduleSave();
  }, [canAttack, canAfford, getTotalAttackPower, setActiveMarch, setResources, setToastMsg, scheduleSave]);

  // ── cancelMarch ───────────────────────────────────────────────
  const cancelMarch = useCallback(async () => {
    const march = marchRef.current;
    if (!march || march.type === 'return') return;
    // Sefer maliyetini iade et
    if (march.marchCost) {
      const c = march.marchCost;
      setResources(prev => prev.map(r => {
        if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity, r.amount + c.cash) };
        if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity, r.amount + c.oil) };
        if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity, r.amount + c.ore) };
        return r;
      }));
    }
    // Firestore'daki march'i iptal olarak isaretle
    const fsId = firestoreMarchIdRef.current || march.id;
    setActiveMarch(null);
    firestoreMarchIdRef.current = null;
    scheduleSave();
    try {
      await cancelPvPMarch(fsId);
    } catch (err: any) {
      console.warn('[PvP] Iptal Firestore guncellenemedi:', err?.message);
    }
  }, [marchRef, firestoreMarchIdRef, setActiveMarch, setResources, scheduleSave]);

  // ── resolveMarch (CPU PvE) ────────────────────────────────────
  const resolveMarch = useCallback((march: March) => {
    const target = MAP_TARGETS.find(t => t.id === march.targetId);
    if (!target) return;

    const hasShield = Date.now() < shieldUntilRef.current;
    const res = resolveMarchResult(
      march, target, researchRef.current, RESEARCH_MAP, warPower, hasShield,
    );

    // Apply power mutation
    if (res.won) {
      setWarPower(prev => prev + res.powerChange);
    } else {
      setWarPower(prev => Math.max(0, prev + res.powerChange));
    }

    // Apply birlikler wipe on loss
    if (res.clearBirlikler) {
      setBirlikler([]);
    }

    // Apply resource changes
    const rc = res.resourceChanges;
    setResources(current =>
      current.map(r => {
        if (r.key === 'cash') return { ...r, amount: res.won ? Math.min(r.capacity, r.amount + rc.cash) : Math.max(0, r.amount + rc.cash) };
        if (r.key === 'oil') return { ...r, amount: res.won ? Math.min(r.capacity, r.amount + rc.oil) : Math.max(0, r.amount + rc.oil) };
        if (r.key === 'ore') return { ...r, amount: res.won ? Math.min(r.capacity, r.amount + rc.ore) : Math.max(0, r.amount + rc.ore) };
        return r;
      }),
    );

    addBattleReport(res.report);
    setLastBattleReport(res.report);

    setMissions(prev =>
      prev.map(m => {
        if (m.type === 'attack' && !m.completed) {
          if (m.requiresWin && !res.won) return m;
          const next = { ...m, currentCount: m.currentCount + 1 };
          if (next.currentCount >= next.targetCount) next.completed = true;
          return next;
        }
        return m;
      }),
    );

    // CPU counter-attack
    if (res.counterAttack) {
      const ca = res.counterAttack;
      setIncomingAttack({
        id: `incoming_${Date.now()}`,
        attackerName: ca.attackerName,
        unitCount: ca.unitCount,
        attackUnits: ca.attackUnits,
        totalSeconds: ca.totalSeconds,
        secondsRemaining: ca.totalSeconds,
      });
    }

    scheduleSave();
    // Istatistikleri guncelle
    if (uid) {
      setTimeout(() => {
        const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
        const brs = battleReportsRef.current;
        syncPlayerProfile(uid, {
          warPower, hqLevel: hqLv, playerPower: playerPowerRef.current,
          wins: winsRef.current,
          losses: lossesRef.current,
        });
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, warPower, scheduleSave, addBattleReport]);

  // ── resolveIncomingAttack (PvP defense) ───────────────────────
  const resolveIncomingAttack = useCallback(async (attack: IncomingAttack) => {
    // Savunma birimleri: ordu envanteri + birlik birimleri
    const unitTotals: Record<string, number> = {};
    // Envanterden
    for (const b of buildingsRef.current) {
      for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
        if (count > 0) unitTotals[unitId] = (unitTotals[unitId] ?? 0) + count;
      }
    }
    // Birliklerden (envanterden dusulmus birimler)
    for (const bl of birliklerRef.current) {
      for (const slot of bl.slots) {
        if (slot.count > 0) unitTotals[slot.unitId] = (unitTotals[slot.unitId] ?? 0) + slot.count;
      }
    }
    // Seferdeki birimleri savunmadan cikar — sefere giden birimler usste kalmaz
    const march = marchRef.current;
    if (march?.marchUnits) {
      for (const mu of march.marchUnits) {
        if (unitTotals[mu.unitId]) {
          unitTotals[mu.unitId] = Math.max(0, unitTotals[mu.unitId] - mu.count);
        }
      }
    }
    const playerDefenseUnits: MarchUnit[] = Object.entries(unitTotals)
      .filter(([_, count]) => count > 0)
      .map(([unitId, count]) => ({ unitId, count, buildingId: '' }));

    // Oyuncunun arastirma bonuslari
    const branchBonus: Record<string, number> = {};
    for (const rs of researchRef.current) {
      if (rs.completed) {
        const node = RESEARCH_MAP[rs.nodeId];
        if (node) branchBonus[node.branch] = (branchBonus[node.branch] ?? 0) + 0.12;
      }
    }

    // Saldiranin profilini Firestore'dan oku (playerPower ve kaynaklar icin)
    let attackerPlayerPower = 0;
    let attackerCash = 0, attackerOil = 0, attackerOre = 0;
    if (attack.attackerUid) {
      try {
        const attackerBase = await loadDefenderBase(attack.attackerUid);
        if (attackerBase) {
          const aBlds = attackerBase.buildings ?? [];
          attackerPlayerPower = calcDefenderPower(aBlds, UNIT_MAP, attackerBase.warPower ?? 0);
          const aRes = attackerBase.resources ?? [];
          attackerCash = (aRes.find((r: any) => r.key === 'cash')?.amount ?? 0);
          attackerOil = (aRes.find((r: any) => r.key === 'oil')?.amount ?? 0);
          attackerOre = (aRes.find((r: any) => r.key === 'ore')?.amount ?? 0);
        }
      } catch {}
    }

    const myResources = resourcesRef.current;
    const myCash = myResources.find(r => r.key === 'cash')?.amount ?? 0;
    const myOil = myResources.find(r => r.key === 'oil')?.amount ?? 0;
    const myOre = myResources.find(r => r.key === 'ore')?.amount ?? 0;

    // Pure combat resolution
    const res = resolveIncomingResult(
      attack.attackUnits,
      playerDefenseUnits,
      branchBonus,
      { cash: attackerCash, oil: attackerOil, ore: attackerOre },
      { cash: myCash, oil: myOil, ore: myOre },
      attackerPlayerPower,
      playerPower,
      attack.attackerName,
    );

    // Apply unit losses to buildings and birlikler (only when defender lost)
    if (res.defenderUnitLosses.length > 0) {
      const remainingLoss: Record<string, number> = {};
      for (const dl of res.defenderUnitLosses) {
        remainingLoss[dl.unitId] = dl.destroyed;
      }
      // Envanterden dus
      setBuildings(prev =>
        prev.map(b => {
          const newTrained = { ...b.trainedUnits };
          let changed = false;
          for (const [unitId, loss] of Object.entries(remainingLoss)) {
            const current = newTrained[unitId] ?? 0;
            if (current > 0) {
              const deducted = Math.min(current, loss);
              newTrained[unitId] = current - deducted;
              remainingLoss[unitId] -= deducted;
              changed = true;
            }
          }
          return changed ? { ...b, trainedUnits: newTrained } : b;
        }),
      );
      // Kalan kayiplari birliklerden dus
      setBirlikler(prev => prev.map(bl => ({
        ...bl,
        slots: bl.slots.map(slot => {
          const loss = remainingLoss[slot.unitId] ?? 0;
          if (loss <= 0) return slot;
          const deducted = Math.min(slot.count, loss);
          remainingLoss[slot.unitId] -= deducted;
          return { ...slot, count: slot.count - deducted };
        }).filter(slot => slot.count > 0),
      })).filter(bl => bl.slots.length > 0));
    }

    // Apply resource changes
    const rc = res.resourceChanges;
    if (res.defended) {
      setWarPower(prev => prev + res.transferPower);
      setResources(current =>
        current.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity, r.amount + rc.cash) };
          if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity, r.amount + rc.oil) };
          if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity, r.amount + rc.ore) };
          return r;
        }),
      );
    } else {
      setResources(current =>
        current.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.max(0, r.amount + rc.cash) };
          if (r.key === 'oil') return { ...r, amount: Math.max(0, r.amount + rc.oil) };
          if (r.key === 'ore') return { ...r, amount: Math.max(0, r.amount + rc.ore) };
          return r;
        }),
      );
      setWarPower(prev => Math.max(0, prev + res.powerChange));
      setShieldUntil(Date.now() + 4 * 60 * 60 * 1000);
      setBirlikler([]);
    }

    const { report, defended } = res;
    addBattleReport(report);
    setLastBattleReport(report);
    // Firestore'daki march'i resolved olarak isaretle
    try { db.marches().doc(attack.id).update({ status: 'resolved' }); } catch {}
    scheduleSave();
    // Istatistikleri guncelle
    if (uid) {
      const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
      const brs = battleReportsRef.current;
      syncPlayerProfile(uid, {
        warPower, hqLevel: hqLv, playerPower: playerPowerRef.current,
        wins: brs.filter(r => r.won).length,
        losses: brs.filter(r => !r.won).length,
      });
      const attackerUid = attack.attackerUid;
      if (attackerUid && attackerPlayerPower > 0) {
        syncPlayerProfile(attackerUid, { playerPower: defended ? Math.max(0, attackerPlayerPower - res.transferPower) : attackerPlayerPower + res.transferPower });
      }
    }
    // Ittifak savasi skor ekleme (savunan taraf — flag bazli)
    if (attack.isWarAttack && attack.warAllianceId) {
      (async () => {
        try {
          const myPlayerSnap = await db.players().doc(uid!).get();
          const myAid = myPlayerSnap.exists() ? (myPlayerSnap.data() as any)?.allianceId : null;
          const enemyAid = attack.warAllianceId;
          if (myAid && enemyAid) {
            const warScore = defended ? 10 : 0;
            let myName = 'Komutan';
            try { const u = getCurrentUser(); if (u?.displayName) myName = u.displayName; } catch {}
            await addWarScoreSvc(myAid, enemyAid, warScore, myName, attack.attackerName, defended);
            await saveWarBattleLog(myAid, report, defended ? myName : attack.attackerName, warScore);
            const freshSnap = await db.alliances().doc(myAid).get();
            if (freshSnap.exists()) {
              setTimeout(async () => {
                try {
                  await db.alliances().doc(myAid).get();
                } catch {}
              }, 1500);
            }
          }
        } catch (err) { console.warn('[PvP] resolveIncoming war score error:', err); }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, playerPower, warPower, scheduleSave, addBattleReport]);

  // ── Joint Attack ──────────────────────────────────────────────
  const launchJointAttack = useCallback((
    targetId: string,
    targetName: string,
    committedUnits: number,
    allyPower: number,
  ): BattleReport | null => {
    const target = MAP_TARGETS.find(t => t.id === targetId);
    if (!target) return null;
    const pp = getTotalAttackPower(committedUnits);
    const combinedPower = pp + allyPower;
    const { won, losses } = calcBattleOutcome(combinedPower, target.defenseRating, committedUnits);
    if (losses > 0) {
      setBuildings(current => {
        let remaining = losses;
        return current.map(b => {
          if (remaining <= 0 || !b.trainedUnits) return b;
          const total = Object.values(b.trainedUnits).reduce((a, v) => a + v, 0);
          if (total === 0) return b;
          const deduct = Math.min(remaining, total);
          remaining -= deduct;
          return { ...b, trainedUnits: deductUnitsProportionally(b.trainedUnits, deduct) };
        });
      });
    }
    if (won) {
      setResources(current =>
        current.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardCash) };
          if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardOil) };
          if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity, r.amount + target.rewardOre) };
          return r;
        }),
      );
    }
    const report: BattleReport = {
      id: `joint_${Date.now()}`,
      targetId,
      targetName: `[ITTIFAK] ${targetName}`,
      timestamp: Date.now(),
      won,
      attackPower: combinedPower,
      defensePower: target.defenseRating,
      unitsLost: losses,
      rewardCash: won ? target.rewardCash : 0,
      rewardOil: won ? target.rewardOil : 0,
      rewardOre: won ? target.rewardOre : 0,
    };
    addBattleReport(report);
    setMissions(prev =>
      prev.map(m => {
        if (m.type === 'attack' && !m.completed) {
          if (m.requiresWin && !won) return m;
          const next = { ...m, currentCount: m.currentCount + 1 };
          if (next.currentCount >= next.targetCount) next.completed = true;
          return next;
        }
        return m;
      }),
    );
    scheduleSave();
    return report;
  }, [getTotalAttackPower, setBuildings, setResources, addBattleReport, setMissions, scheduleSave]);

  // ── refreshPvPTargets ─────────────────────────────────────────
  const refreshPvPTargets = useCallback(async () => {
    if (!uid) return;
    setPvpLoading(true);
    try {
      const hqLv = buildingsRef.current.find(b => b.id === 'hq')?.level ?? 1;
      const targets = await findPvPTargets(uid, hqLv);
      setPvpTargets(targets);
    } catch (err) {
      console.warn('[PvP] Target refresh failed:', err);
    }
    setPvpLoading(false);
  }, [uid, buildingsRef, setPvpTargets, setPvpLoading]);

  // ── attackPvPTarget ───────────────────────────────────────────
  const attackPvPTarget = useCallback(async (
    target: PvPTarget,
    committedUnits: number,
    marchUnits: MarchUnit[],
    isWarAttack = false,
  ) => {
    if (!uid) return;
    if (marchRef.current) return;
    // PvP cooldown kontrolu
    const cooldown = getPvPCooldown(target.uid);
    if (cooldown > 0) {
      setToastMsg(t('pvp.cooldownRemaining', { h: String(Math.floor(cooldown / 3600)), m: String(Math.floor((cooldown % 3600) / 60)) }));
      return;
    }

    // Ayni ittifak uyesine saldiri engelle
    const myAllianceTag = allianceRef.current?.myAllianceData?.tag;
    if (myAllianceTag && target.allianceTag && target.allianceTag === myAllianceTag) {
      setToastMsg(t('pvp.cannotAttackAlly'));
      return;
    }

    // Savunma birimlerini saldiridan cikar (airDefense saldirida gitmez)
    const filteredMarchUnits = filterOffensiveUnits(marchUnits, UNIT_MAP);
    if (filteredMarchUnits.length === 0) {
      setToastMsg(t('pvp.needOffensiveUnits'));
      return;
    }

    // Sefer maliyeti kontrolü ve kesintisi
    const marchCost = calcMarchCost(filteredMarchUnits, UNIT_MAP);
    if (!canAfford(marchCost.cash, marchCost.oil, marchCost.ore)) {
      setToastMsg(t('attack.insufficientResources'));
      return;
    }
    setResources(prev => prev.map(r => {
      if (r.key === 'cash') return { ...r, amount: r.amount - marchCost.cash };
      if (r.key === 'oil') return { ...r, amount: r.amount - marchCost.oil };
      if (r.key === 'ore') return { ...r, amount: r.amount - marchCost.ore };
      return r;
    }));

    // Guc hesabi: dogrudan marchUnits'ten (birlik bazli)
    const branchBonus = buildResearchBranchBonus(researchRef.current, RESEARCH_MAP);
    const attackPower = calcMarchAttackPower(filteredMarchUnits, UNIT_MAP, branchBonus);

    const totalUnitCount = filteredMarchUnits.reduce((s, u) => s + u.count, 0);
    const travelSeconds = calcTravelSeconds(totalUnitCount);

    // Firestore'a march yaz — id'yi al, sonra lokal state set et
    let attackerName = `Komutan_${uid.slice(0, 6)}`;
    try { const u = getCurrentUser(); if (u?.displayName) attackerName = u.displayName; } catch {}

    const now = Date.now();
    let marchId: string;
    try {
      marchId = await launchPvPAttack({
        attackerUid: uid,
        attackerName,
        defenderUid: target.uid,
        defenderName: target.displayName,
        marchUnits: filteredMarchUnits,
        attackPower,
        committedUnits: filteredMarchUnits.reduce((s, u) => s + u.count, 0),
        startedAt: now,
        arrivesAt: now + travelSeconds * 1000,
        travelSeconds,
        status: 'marching',
      });
    } catch {
      setToastMsg(t('pvp.attackFailed'));
      return;
    }

    firestoreMarchIdRef.current = marchId;
    const march: March = {
      id: marchId,
      targetId: target.uid,
      targetName: target.displayName,
      type: 'attack',
      committedUnits: filteredMarchUnits.reduce((s, u) => s + u.count, 0),
      totalSeconds: travelSeconds,
      secondsRemaining: travelSeconds,
      attackPower,
      marchUnits: filteredMarchUnits,
      marchCost,
      isWarAttack,
    };
    setActiveMarch(march);
    scheduleSave();
  }, [uid, marchRef, firestoreMarchIdRef, allianceRef, researchRef, getPvPCooldown, canAfford, setResources, setToastMsg, setActiveMarch, scheduleSave]);

  // ── buyShield ─────────────────────────────────────────────────
  const buyShield = useCallback((durationMs: number, goldCost: number): boolean => {
    // Ittifak savasi sirasinda kalkan satin alinamaz
    if (allianceRef.current?.myAllianceData?.activeWar) return false;
    if (!canAffordGold(goldCost)) return false;
    deductGold(goldCost);
    setShieldUntil(Date.now() + durationMs);
    scheduleSave();
    return true;
  }, [allianceRef, canAffordGold, deductGold, setShieldUntil, scheduleSave]);

  // ── buyWarPower ───────────────────────────────────────────────
  const buyWarPower = useCallback((amount: number, goldCost: number): boolean => {
    if (!canAffordGold(goldCost)) return false;
    deductGold(goldCost);
    setWarPower(prev => prev + amount);
    scheduleSave();
    return true;
  }, [canAffordGold, deductGold, setWarPower, scheduleSave]);

  return {
    // Combat
    getTotalAttackPower,
    canAttack,
    attackTarget,
    cancelMarch,
    resolveMarch,
    resolveIncomingAttack,
    addBattleReport,
    clearLastBattleReport,
    // Joint attack
    launchJointAttack,
    // PvP
    getPvPCooldown,
    refreshPvPTargets,
    attackPvPTarget,
    // Shop
    buyShield,
    buyWarPower,
  };
}
