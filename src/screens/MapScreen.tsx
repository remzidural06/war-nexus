import React, { useState, useMemo, useCallback } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDesertGame } from '../state/DesertGameContext';
import { MilitaryPanel } from '../components/MilitaryPanel';
import { ActionButton } from '../components/ActionButton';
import { BattleResultModal } from '../components/BattleResultModal';
import { colors } from '../theme/colors';
import { formatNumber, formatDuration } from '../utils/formatters';
import { UNIT_MAP } from '../data/units';
import { t } from '../i18n';
import type { BattleReport, MapTarget, MarchUnit } from '../state/types';

const DIFFICULTY_COLORS = {
  easy: colors.easy,
  medium: colors.medium,
  hard: colors.hard,
  elite: colors.elite,
};

const DIFFICULTY_LABEL_KEYS: Record<string, string> = {
  easy: 'map.easy',
  medium: 'map.medium',
  hard: 'map.hard',
  elite: 'map.elite',
};

const BRANCH_IMAGES: Record<string, any> = {
  barracks: require('../assets/base/branch_icons/infantry.png'),
  tankFactory: require('../assets/base/branch_icons/armor.png'),
  airport: require('../assets/base/branch_icons/air.png'),
  shipyard: require('../assets/base/branch_icons/naval.png'),
  defenseTower: require('../assets/base/branch_icons/airDefense.png'),
};

const BUILDING_BRANCHES = [
  { id: 'barracks',     branchKey: 'branches.infantry',   icon: '🪖' },
  { id: 'tankFactory',  branchKey: 'branches.armor',      icon: '🔫' },
  { id: 'airport',      branchKey: 'branches.air',        icon: '🛩️' },
  { id: 'shipyard',     branchKey: 'branches.naval',      icon: '⚓' },
  { id: 'defenseTower', branchKey: 'branches.airDefense', icon: '🎯' },
];

function winChance(attackPower: number, defenseRating: number): number {
  if (attackPower <= 0) return 0;
  const ratio = attackPower / (attackPower + defenseRating);
  return Math.round(ratio * 100);
}

function winChanceColor(pct: number): string {
  if (pct >= 70) return colors.success;
  if (pct >= 40) return colors.medium;
  return colors.danger;
}

export function MapScreen() {
  const {
    targets,
    activeMarch,
    battleReports,
    buildings,
    getTotalAttackPower,
    getTotalTrainedUnits,
    attackTarget,
    birlikler,
  } = useDesertGame();

  const [reportTarget, setReportTarget] = useState<BattleReport | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<MapTarget | null>(null);
  const [selectedBirlikIds, setSelectedBirlikIds] = useState<Set<string>>(new Set());

  const totalUnits = getTotalTrainedUnits();

  const unitBreakdown = useMemo(() => {
    return BUILDING_BRANCHES
      .map(({ id, branchKey, icon }) => {
        const b = buildings.find(b => b.id === id);
        const count = b?.trainedUnits
          ? Object.values(b.trainedUnits).reduce((a, v) => a + v, 0)
          : 0;
        return { id, branchKey, icon, count };
      });
  }, [buildings]);

  const attackPower = getTotalAttackPower(totalUnits);

  /** Seçilen birliklerden toplam birim ve güç hesabı */
  const selectedBirlikler = useMemo(
    () => birlikler.filter(b => selectedBirlikIds.has(b.id)),
    [birlikler, selectedBirlikIds],
  );

  const birlikTotal = useMemo(
    () => selectedBirlikler.reduce((sum, bl) => sum + bl.slots.reduce((a, s) => a + s.count, 0), 0),
    [selectedBirlikler],
  );

  const birlikPower = useMemo(() => {
    let power = 0;
    for (const bl of selectedBirlikler) {
      for (const slot of bl.slots) {
        const def = UNIT_MAP[slot.unitId];
        if (def) power += slot.count * def.attackPower;
      }
    }
    return power;
  }, [selectedBirlikler]);

  const openAttackPanel = useCallback((target: MapTarget) => {
    setSelectedTarget(target);
    setSelectedBirlikIds(new Set());
  }, []);

  const closeAttackPanel = useCallback(() => {
    setSelectedTarget(null);
    setSelectedBirlikIds(new Set());
  }, []);

  const handleAttack = useCallback(() => {
    if (!selectedTarget || birlikTotal < 1) return;
    const marchUnits: MarchUnit[] = selectedBirlikler.flatMap(bl =>
      bl.slots.map(s => ({ unitId: s.unitId, count: s.count, buildingId: s.buildingId })),
    );
    attackTarget(selectedTarget.id, selectedTarget.name, birlikTotal, marchUnits);
    closeAttackPanel();
  }, [selectedTarget, birlikTotal, selectedBirlikler, attackTarget, closeAttackPanel]);

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      {/* Ordu Durumu */}
      <MilitaryPanel title={t('map.armyStatusTitle')}>
        <View style={styles.armyRow}>
          <Text style={styles.armyTotal}>{t('map.totalUnits', { count: String(totalUnits) })}</Text>
          {attackPower > 0 && (
            <Text style={styles.armyPower}>{t('map.totalPower', { power: String(attackPower) })}</Text>
          )}
        </View>

        {unitBreakdown.length > 0 ? (
          <View style={styles.breakdownRow}>
            {unitBreakdown.map(u => (
              <View key={u.branchKey} style={styles.breakdownChip}>
                {BRANCH_IMAGES[u.id] ? (
                  <Image source={BRANCH_IMAGES[u.id]} style={styles.branchImg} />
                ) : (
                  <Text style={styles.breakdownIcon}>{u.icon}</Text>
                )}
                <Text style={styles.breakdownLabel} numberOfLines={1} adjustsFontSizeToFit>{t(u.branchKey)}</Text>
                <Text style={styles.breakdownCount}>{u.count}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('map.noUnits')}</Text>
        )}
      </MilitaryPanel>

      {/* Keşif — Düşman Üsleri */}
      <MilitaryPanel title={t('map.reconTitle')}>
        {targets.map(target => {
          const pct = winChance(attackPower, target.defenseRating);
          return (
            <Pressable key={target.id} onPress={() => openAttackPanel(target)}>
              <View style={styles.targetCard}>
                <View style={styles.targetHeader}>
                  <Text style={styles.targetName}>{target.name}</Text>
                  <View
                    style={[
                      styles.diffBadge,
                      { backgroundColor: DIFFICULTY_COLORS[target.difficulty] + '33' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.diffText,
                        { color: DIFFICULTY_COLORS[target.difficulty] },
                      ]}
                    >
                      {t(DIFFICULTY_LABEL_KEYS[target.difficulty])}
                    </Text>
                  </View>
                </View>
                <Text style={styles.targetPlayer}>{target.player}</Text>

                <View style={styles.targetStats}>
                  <Text style={styles.targetStat}>🛡️ {target.defenseRating}</Text>
                  <Text style={styles.targetStat}>⏱️ {formatDuration(target.travelSeconds)}</Text>
                  {totalUnits > 0 && (
                    <Text style={[styles.winChance, { color: winChanceColor(pct) }]}>
                      {t('map.winChance', { pct: String(pct) })}
                    </Text>
                  )}
                </View>

                <View style={styles.targetRewards}>
                  <Text style={styles.rewardText}>💵 {formatNumber(target.rewardCash)}</Text>
                  <Text style={styles.rewardText}>🛢️ {formatNumber(target.rewardOil)}</Text>
                  <Text style={styles.rewardText}>⛏️ {formatNumber(target.rewardOre)}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </MilitaryPanel>

      {/* TEMP: PvP bölümü geçici olarak gizlendi */}

      {/* Savaş Günlüğü — profil ekranında gösteriliyor */}

      {/* Savaş Raporu Modal */}
      {reportTarget && (
        <BattleResultModal report={reportTarget} onClose={() => setReportTarget(null)} />
      )}

      {/* Saldırı Paneli Modal */}
      <Modal visible={!!selectedTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.attackPanel}>
            {selectedTarget && (
              <>
                {/* Hedef Bilgisi */}
                <View style={styles.attackHeader}>
                  <Text style={styles.attackTitle}>⚔️ SALDIRI</Text>
                  <Pressable onPress={closeAttackPanel} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </Pressable>
                </View>

                <View style={styles.attackTargetInfo}>
                  <Text style={styles.attackTargetName}>{selectedTarget.name}</Text>
                  <Text style={styles.attackTargetSub}>
                    {selectedTarget.player} · 🛡️ {selectedTarget.defenseRating} · ⏱️ {formatDuration(selectedTarget.travelSeconds)}
                  </Text>
                </View>

                {/* Birlik Yoksa Uyarı */}
                {birlikler.length === 0 ? (
                  <View style={styles.noUnitsBox}>
                    <Text style={styles.noUnitsIcon}>⚠️</Text>
                    <Text style={styles.noUnitsTitle}>Birlik Yok</Text>
                    <Text style={styles.noUnitsDesc}>
                      Saldırı için önce Komuta Merkezi'nde birlik oluşturmalısın.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Birlik Seçimi */}
                    <View style={styles.unitSelectHeader}>
                      <Text style={styles.unitSelectLabel}>Birlik Seç ({selectedBirlikler.length}/{birlikler.length})</Text>
                      <Pressable onPress={() => {
                        if (selectedBirlikIds.size === birlikler.length) {
                          setSelectedBirlikIds(new Set());
                        } else {
                          setSelectedBirlikIds(new Set(birlikler.map(b => b.id)));
                        }
                      }}>
                        <Text style={styles.selectAllBtn}>
                          {selectedBirlikIds.size === birlikler.length ? 'Temizle' : 'Tümünü Seç'}
                        </Text>
                      </Pressable>
                    </View>

                    <ScrollView style={styles.unitList} nestedScrollEnabled>
                      {birlikler.map(bl => {
                        const blTotal = bl.slots.reduce((a, s) => a + s.count, 0);
                        const blPower = bl.slots.reduce((sum, slot) => {
                          const def = UNIT_MAP[slot.unitId];
                          return sum + (def ? slot.count * def.attackPower : 0);
                        }, 0);
                        const isSel = selectedBirlikIds.has(bl.id);
                        return (
                          <Pressable
                            key={bl.id}
                            style={[styles.birlikCard, isSel && styles.birlikCardSel]}
                            onPress={() => setSelectedBirlikIds(prev => {
                              const next = new Set(prev);
                              if (isSel) next.delete(bl.id); else next.add(bl.id);
                              return next;
                            })}
                          >
                            <View style={styles.birlikCardTop}>
                              <Text style={[styles.birlikName, isSel && styles.birlikNameSel]}>{bl.name}</Text>
                              <Text style={[styles.birlikCheck, isSel && styles.birlikCheckSel]}>
                                {isSel ? '✓' : '○'}
                              </Text>
                            </View>
                            <View style={styles.birlikSlotRow}>
                              {bl.slots.map(slot => (
                                <Text key={slot.unitId} style={styles.birlikSlotChip}>
                                  {slot.icon} {slot.count}
                                </Text>
                              ))}
                            </View>
                            <View style={styles.birlikStatsRow}>
                              <Text style={styles.birlikStat}>🪖 {blTotal} birim</Text>
                              <Text style={styles.birlikStat}>⚔️ {blPower} güç</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {/* Saldırı Özeti */}
                    <View style={styles.attackSummary}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Birlik: {selectedBirlikler.length}</Text>
                        <Text style={styles.summaryLabel}>Sevk: {birlikTotal} birim</Text>
                        <Text style={styles.summaryPower}>⚔️ {birlikPower}</Text>
                      </View>
                      {birlikTotal > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Kazanma Şansı</Text>
                          <Text style={[styles.summaryChance, { color: winChanceColor(winChance(birlikPower, selectedTarget.defenseRating)) }]}>
                            %{winChance(birlikPower, selectedTarget.defenseRating)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Saldır Butonu */}
                    <ActionButton
                      label={activeMarch ? 'Sefer Devam Ediyor...' : birlikTotal < 1 ? 'Birlik Seç' : `⚔️ SALDIR (${birlikTotal} birim)`}
                      onPress={handleAttack}
                      disabled={!!activeMarch || birlikTotal < 1}
                    />
                  </>
                )}

                <ActionButton label="İptal" onPress={closeAttackPanel} variant="secondary" />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* PvP bölümü kaldırıldı — saldırılar Sıralama ekranından yapılıyor */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 10 },

  armyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  armyTotal: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  armyPower: { color: colors.sand, fontSize: 13, fontWeight: '700' },

  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  breakdownChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4,
  },
  branchImg: { width: 24, height: 24, borderRadius: 4 },
  breakdownIcon: { fontSize: 12 },
  breakdownLabel: { color: colors.textSecondary, fontSize: 11 },
  breakdownCount: { color: colors.sand, fontSize: 11, fontWeight: '700' },

  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 4 },

  targetCard: {
    borderWidth: 1, borderColor: colors.panelBorder, borderRadius: 3,
    padding: 10, marginBottom: 8, backgroundColor: colors.surface,
  },
  targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  targetName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  diffText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  targetPlayer: { color: colors.textSecondary, fontSize: 11, marginBottom: 6 },
  targetStats: { flexDirection: 'row', gap: 12, marginBottom: 4, alignItems: 'center' },
  targetStat: { color: colors.textSecondary, fontSize: 11 },
  winChance: { fontSize: 11, fontWeight: '700', marginLeft: 'auto' },
  targetRewards: { flexDirection: 'row', gap: 10 },
  rewardText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },

  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.panelBorder,
  },
  reportWon: { color: colors.success, fontSize: 16 },
  reportLost: { color: colors.danger, fontSize: 16 },
  reportInfo: { flex: 1 },
  reportName: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  reportTime: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  reportGain: { color: colors.success, fontSize: 11, fontWeight: '700' },
  reportLoss: { color: colors.danger, fontSize: 11, fontWeight: '600' },

  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  modalBox: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.sand,
    borderRadius: 6, padding: 20, width: '100%', gap: 10,
  },
  modalTitle: { color: colors.sand, fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: 2 },
  modalTarget: { color: colors.textPrimary, fontSize: 15, textAlign: 'center' },
  modalStats: { gap: 6, borderTopWidth: 1, borderTopColor: colors.panelBorder, paddingTop: 8 },
  modalStatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalStatLabel: { color: colors.textSecondary, fontSize: 13 },
  modalStatVal: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  powerBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  powerFill: { height: '100%' },
  powerLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 4 },
  powerLabelAtk: { color: colors.military, fontSize: 13, fontWeight: '700' },
  powerLabelDef: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  powerChance: { fontSize: 15, fontWeight: '900' },

  // Saldırı Paneli
  attackPanel: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.sand,
    borderRadius: 6, padding: 16, width: '100%', maxHeight: '85%', gap: 10,
  },
  attackHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  attackTitle: { color: colors.sand, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { padding: 4 },
  closeBtnText: { color: colors.textSecondary, fontSize: 18 },

  attackTargetInfo: { gap: 2, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.panelBorder },
  attackTargetName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  attackTargetSub: { color: colors.textSecondary, fontSize: 12 },

  // Birlik Yok
  noUnitsBox: {
    alignItems: 'center', paddingVertical: 20, gap: 6,
  },
  noUnitsIcon: { fontSize: 32 },
  noUnitsTitle: { color: colors.sand, fontSize: 16, fontWeight: '700' },
  noUnitsDesc: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Birlik Seçimi
  unitSelectHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  unitSelectLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  selectAllBtn: { color: colors.sand, fontSize: 12, fontWeight: '700' },

  unitList: { maxHeight: 300 },
  // Birlik kartları
  birlikCard: {
    padding: 12, marginBottom: 8,
    backgroundColor: colors.surface, borderRadius: 6,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  birlikCardSel: {
    borderColor: colors.sand, backgroundColor: 'rgba(196,164,85,0.08)',
  },
  birlikCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  birlikName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  birlikNameSel: { color: colors.sand },
  birlikCheck: { color: colors.textMuted, fontSize: 18 },
  birlikCheckSel: { color: colors.sand },
  birlikSlotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  birlikSlotChip: {
    color: colors.textSecondary, fontSize: 11,
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 3, overflow: 'hidden',
  },
  birlikStatsRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  birlikStat: { color: colors.textMuted, fontSize: 11 },

  // Saldırı Özeti
  attackSummary: {
    backgroundColor: colors.surfaceAlt, borderRadius: 3, padding: 8, gap: 4,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.textSecondary, fontSize: 12 },
  summaryPower: { color: colors.sand, fontSize: 13, fontWeight: '700' },
  summaryChance: { fontSize: 14, fontWeight: '900' },
});
