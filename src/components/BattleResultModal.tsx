import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { UnitImage } from './UnitImage';
import { UNIT_MAP } from '../data/units';
import type { BattleReport } from '../state/types';
import { t } from '../i18n';

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function fmtSign(n: number) {
  return n >= 0 ? `+${fmt(n)}` : `-${fmt(Math.abs(n))}`;
}

function pctBar(a: number, b: number) {
  const total = a + b;
  if (total === 0) return 50;
  return Math.round((a / total) * 100);
}

export function BattleResultModal({
  report,
  onClose,
}: {
  report: BattleReport;
  onClose: () => void;
}) {
  const isDefense = report.targetId === 'defense';
  const atkPct = pctBar(report.attackPower, report.defensePower);
  const winChance = `${atkPct}%`;

  const totalAtkUnits = report.attackerResults?.reduce((s, a) => s + a.deployed, 0) ?? 0;
  const totalAtkLoss = report.attackerResults?.reduce((s, a) => s + a.losses, 0) ?? report.unitsLost;
  const totalDefUnits = report.defenderResults?.reduce((s, d) => s + d.count, 0) ?? 0;
  const totalDefLoss = report.defenderResults?.reduce((s, d) => s + d.destroyed, 0) ?? 0;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={s.overlay}>
        <View style={s.modal}>
          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

            {/* ── Başlık ── */}
            <View style={[s.headerBar, report.won ? s.headerWon : s.headerLost]}>
              <Text style={s.headerIcon}>{report.won ? '🏆' : '💀'}</Text>
              <View>
                <Text style={s.headerTitle}>{report.won ? t('battle.victory') : t('battle.defeat')}</Text>
                <Text style={s.headerSub}>
                  {isDefense ? t('battle.headerDefense') : t('battle.headerAttack')} — {report.targetName}
                </Text>
              </View>
            </View>

            {/* ── Güç Karşılaştırması ── */}
            <View style={s.powerSection}>
              <View style={s.powerHeader}>
                <Text style={s.powerAtkLabel}>{t('battle.headerAttack')}</Text>
                <Text style={s.powerVs}>{winChance}</Text>
                <Text style={s.powerDefLabel}>{t('battle.headerDefense')}</Text>
              </View>
              <View style={s.powerBarBg}>
                <View style={[s.powerBarAtk, { flex: atkPct || 1 }]} />
                <View style={[s.powerBarDef, { flex: (100 - atkPct) || 1 }]} />
              </View>
              <View style={s.powerValues}>
                <Text style={s.powerAtkVal}>{fmt(report.attackPower)}</Text>
                <Text style={s.powerDefVal}>{fmt(report.defensePower)}</Text>
              </View>
            </View>

            {/* ── Kaynak & Güç Değişimi ── */}
            <View style={s.lootSection}>
              <Text style={s.lootTitle}>{report.won ? t('battle.lootWon') : t('battle.lootLost')}</Text>
              <View style={s.lootGrid}>
                <View style={s.lootItem}>
                  <Text style={s.lootIcon}>💵</Text>
                  <Text style={s.lootLabel}>{t('battle.lootCash')}</Text>
                  <Text style={[s.lootValue, report.rewardCash >= 0 ? s.gain : s.loss]}>
                    {fmtSign(report.rewardCash)}
                  </Text>
                </View>
                <View style={s.lootItem}>
                  <Text style={s.lootIcon}>🛢️</Text>
                  <Text style={s.lootLabel}>{t('battle.lootOil')}</Text>
                  <Text style={[s.lootValue, report.rewardOil >= 0 ? s.gain : s.loss]}>
                    {fmtSign(report.rewardOil)}
                  </Text>
                </View>
                <View style={s.lootItem}>
                  <Text style={s.lootIcon}>⛏️</Text>
                  <Text style={s.lootLabel}>{t('battle.lootOre')}</Text>
                  <Text style={[s.lootValue, report.rewardOre >= 0 ? s.gain : s.loss]}>
                    {fmtSign(report.rewardOre)}
                  </Text>
                </View>
                {report.powerChange !== undefined && report.powerChange !== 0 && (
                  <View style={s.lootItem}>
                    <Text style={s.lootIcon}>⚡</Text>
                    <Text style={s.lootLabel}>{t('battle.lootPower')}</Text>
                    <Text style={[s.lootValue, report.powerChange >= 0 ? s.gain : s.loss]}>
                      {fmtSign(report.powerChange)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Saldıran Birimler ── */}
            {report.attackerResults && report.attackerResults.length > 0 && (
              <View style={s.unitSection}>
                <View style={s.unitSectionHeader}>
                  <Text style={s.unitSectionTitle}>
                    {isDefense ? t('battle.attackerUnitsDefense') : t('battle.attackerUnitsAttack')}
                  </Text>
                  <Text style={s.unitSectionSummary}>
                    {totalAtkLoss > 0
                      ? t('battle.unitsSummary', { total: totalAtkUnits, losses: totalAtkLoss })
                      : t('battle.unitsSummaryNoLoss', { total: totalAtkUnits })}
                  </Text>
                </View>
                {report.attackerResults.map((ar, i) => {
                  const unit = UNIT_MAP[ar.unitId];
                  const survived = ar.deployed - ar.losses;
                  return (
                    <View key={`a-${i}`} style={s.unitCard}>
                      <View style={s.unitCardLeft}>
                        {unit?.imageUri
                          ? <UnitImage unitId={ar.unitId} uri={unit.imageUri} icon={unit.icon} style={s.unitImg} />
                          : <View style={s.unitImgPlaceholder}><Text style={s.unitImgIcon}>{unit?.icon ?? '❓'}</Text></View>
                        }
                        <View style={s.unitCardInfo}>
                          <Text style={s.unitCardName} numberOfLines={1}>{unit?.label ?? ar.unitId}</Text>
                          <Text style={s.unitCardBranch}>{unit?.branch ?? ''}</Text>
                        </View>
                      </View>
                      <View style={s.unitCardRight}>
                        <Text style={s.unitCardDeployed}>{ar.deployed}</Text>
                        {ar.losses > 0 && <Text style={s.unitCardLoss}>☠️ -{ar.losses}</Text>}
                        <Text style={[s.unitCardSurvived, survived === 0 && s.unitCardAllLost]}>
                          {survived > 0 ? `✅ ${survived}` : '❌ 0'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Savunan Birimler ── */}
            {report.defenderResults && report.defenderResults.length > 0 && (
              <View style={s.unitSection}>
                <View style={s.unitSectionHeader}>
                  <Text style={s.unitSectionTitle}>
                    {isDefense ? t('battle.defenderUnitsDefense') : t('battle.defenderUnitsAttack')}
                  </Text>
                  <Text style={s.unitSectionSummary}>
                    {totalDefLoss > 0
                      ? t('battle.unitsSummary', { total: totalDefUnits, losses: totalDefLoss })
                      : t('battle.unitsSummaryNoLoss', { total: totalDefUnits })}
                  </Text>
                </View>
                {report.defenderResults.map((dr, i) => {
                  const unit = UNIT_MAP[dr.unitId];
                  const survived = dr.count - dr.destroyed;
                  return (
                    <View key={`d-${i}`} style={s.unitCard}>
                      <View style={s.unitCardLeft}>
                        {unit?.imageUri
                          ? <UnitImage unitId={dr.unitId} uri={unit.imageUri} icon={unit.icon} style={s.unitImg} />
                          : <View style={s.unitImgPlaceholder}><Text style={s.unitImgIcon}>{unit?.icon ?? '❓'}</Text></View>
                        }
                        <View style={s.unitCardInfo}>
                          <Text style={s.unitCardName} numberOfLines={1}>{unit?.label ?? dr.unitId}</Text>
                          <Text style={s.unitCardBranch}>{unit?.branch ?? ''}</Text>
                        </View>
                      </View>
                      <View style={s.unitCardRight}>
                        <Text style={s.unitCardDeployed}>{dr.count}</Text>
                        {dr.destroyed > 0 && <Text style={s.unitCardLoss}>☠️ -{dr.destroyed}</Text>}
                        <Text style={[s.unitCardSurvived, survived === 0 && s.unitCardAllLost]}>
                          {survived > 0 ? `✅ ${survived}` : '❌ 0'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Birim yoksa bilgi */}
            {(!report.attackerResults || report.attackerResults.length === 0) &&
             (!report.defenderResults || report.defenderResults.length === 0) && (
              <Text style={s.noUnitsText}>{t('battle.noDetail')}</Text>
            )}

            <View style={{ height: 10 }} />
          </ScrollView>

          {/* Kapat */}
          <Pressable style={[s.closeBtn, report.won ? s.closeBtnWon : s.closeBtnLost]} onPress={onClose}>
            <Text style={s.closeBtnText}>{t('battle.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  modal: {
    width: '100%', maxWidth: 420, maxHeight: '88%',
    backgroundColor: colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.panelBorder, overflow: 'hidden',
  },
  scroll: { padding: 16 },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, marginBottom: 12,
  },
  headerWon: { backgroundColor: '#1B5E2033' },
  headerLost: { backgroundColor: '#B71C1C33' },
  headerIcon: { fontSize: 28 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

  // Power section
  powerSection: {
    backgroundColor: colors.surface, borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: colors.panelBorder, marginBottom: 12,
  },
  powerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  powerAtkLabel: { color: colors.military, fontSize: 11, fontWeight: '700' },
  powerDefLabel: { color: '#C62828', fontSize: 11, fontWeight: '700' },
  powerVs: { color: colors.sand, fontSize: 13, fontWeight: '900' },
  powerBarBg: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  powerBarAtk: { backgroundColor: colors.military, height: '100%' },
  powerBarDef: { backgroundColor: '#C62828', height: '100%' },
  powerValues: { flexDirection: 'row', justifyContent: 'space-between' },
  powerAtkVal: { color: colors.military, fontSize: 14, fontWeight: '900' },
  powerDefVal: { color: '#C62828', fontSize: 14, fontWeight: '900' },

  // Loot section
  lootSection: {
    backgroundColor: colors.surface, borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: colors.panelBorder, marginBottom: 12,
  },
  lootTitle: { color: colors.sand, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  lootGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lootItem: {
    flex: 1, minWidth: '20%' as any, alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: 6, padding: 8,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  lootIcon: { fontSize: 16, marginBottom: 2 },
  lootLabel: { color: colors.textMuted, fontSize: 9, marginBottom: 2 },
  lootValue: { fontSize: 13, fontWeight: '800' },
  gain: { color: '#4CAF50' },
  loss: { color: '#FF5252' },

  // Unit sections
  unitSection: {
    backgroundColor: colors.surface, borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: colors.panelBorder, marginBottom: 10,
  },
  unitSectionHeader: { marginBottom: 8 },
  unitSectionTitle: { color: colors.sand, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  unitSectionSummary: { color: colors.textMuted, fontSize: 10, marginTop: 2 },

  unitCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder,
  },
  unitCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  unitImg: { width: 40, height: 28, borderRadius: 4 },
  unitImgPlaceholder: {
    width: 40, height: 28, borderRadius: 4, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  unitImgIcon: { fontSize: 14 },
  unitCardInfo: { flex: 1 },
  unitCardName: { color: colors.textPrimary, fontSize: 11, fontWeight: '600' },
  unitCardBranch: { color: colors.textMuted, fontSize: 9 },

  unitCardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unitCardDeployed: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  unitCardLoss: { color: '#FF5252', fontSize: 10, fontWeight: '700' },
  unitCardSurvived: { color: '#4CAF50', fontSize: 10, fontWeight: '600', minWidth: 30, textAlign: 'right' },
  unitCardAllLost: { color: '#FF5252' },

  noUnitsText: { color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 12 },

  // Close button
  closeBtn: { paddingVertical: 14, alignItems: 'center' },
  closeBtnWon: { backgroundColor: colors.military },
  closeBtnLost: { backgroundColor: '#8A2A2A' },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});
