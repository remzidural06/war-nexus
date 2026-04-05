import React, { useState } from 'react';
import { Image, Modal, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { t } from '../../i18n';
import { CountdownTimer } from '../CountdownTimer';
import { styles } from '../../screens/BaseScreen.styles';
import { BUILDING_BRANCHES } from '../../screens/BaseScreen.constants';
import { UNIT_MAP } from '../../data/units';
import { colors } from '../../theme/colors';
import { getLocale } from '../../i18n';
import type { BuildingState, March, Birlik } from '../../state/types';

const BRANCH_ICONS: Record<string, any> = {
  barracks: require('../../assets/base/branch_icons/infantry.png'),
  tankFactory: require('../../assets/base/branch_icons/armor.png'),
  airport: require('../../assets/base/branch_icons/air.png'),
  shipyard: require('../../assets/base/branch_icons/naval.png'),
  defenseTower: require('../../assets/base/branch_icons/airDefense.png'),
};

const UNIT_IMAGES: Record<string, any> = {
  rifleman: require('../../assets/base/units/rifleman.jpg'),
  machineGunner: require('../../assets/base/units/machineGunner.jpg'),
  antiTankOp: require('../../assets/base/units/antiTankOp.jpg'),
  sniper: require('../../assets/base/units/sniper.jpg'),
  manpadsOp: require('../../assets/base/units/manpadsOp.jpg'),
  combatEngineer: require('../../assets/base/units/combatEngineer.jpg'),
  paradropper: require('../../assets/base/units/paradropper.jpg'),
  frogman: require('../../assets/base/units/frogman.jpg'),
  droneOp: require('../../assets/base/units/droneOp.jpg'),
  specOps: require('../../assets/base/units/specOps.jpg'),
  kirpi: require('../../assets/base/units/kirpi.jpg'),
  cobra2: require('../../assets/base/units/cobra2.jpg'),
  kaplanIfv: require('../../assets/base/units/kaplanIfv.jpg'),
  bradley: require('../../assets/base/units/bradley.jpg'),
  puma: require('../../assets/base/units/puma.jpg'),
  leopard2a7: require('../../assets/base/units/leopard2a7.jpg'),
  m1a2sep3: require('../../assets/base/units/m1a2sep3.jpg'),
  t90m: require('../../assets/base/units/t90m.jpg'),
  k2panther: require('../../assets/base/units/k2panther.jpg'),
  altay: require('../../assets/base/units/altay.jpg'),
  t14armata: require('../../assets/base/units/t14armata.jpg'),
  merkava4: require('../../assets/base/units/merkava4.jpg'),
  firtina: require('../../assets/base/units/firtina.jpg'),
  kasirga: require('../../assets/base/units/kasirga.jpg'),
  himars: require('../../assets/base/units/himars.jpg'),
  tb2: require('../../assets/base/units/tb2.jpg'),
  mq9reaper: require('../../assets/base/units/mq9reaper.jpg'),
  akinci: require('../../assets/base/units/akinci.jpg'),
  ah1z: require('../../assets/base/units/ah1z.jpg'),
  tb3: require('../../assets/base/units/tb3.jpg'),
  harop: require('../../assets/base/units/harop.jpg'),
  switchblade600: require('../../assets/base/units/switchblade600.jpg'),
  xq58valkyrie: require('../../assets/base/units/xq58valkyrie.jpg'),
  uh60m: require('../../assets/base/units/uh60m.jpg'),
  ah64e: require('../../assets/base/units/ah64e.jpg'),
  t129atak: require('../../assets/base/units/t129atak.jpg'),
  ka52m: require('../../assets/base/units/ka52m.jpg'),
  mi28nm: require('../../assets/base/units/mi28nm.jpg'),
  f16v: require('../../assets/base/units/f16v.jpg'),
  fa18ef: require('../../assets/base/units/fa18ef.jpg'),
  rafale: require('../../assets/base/units/rafale.jpg'),
  typhoon: require('../../assets/base/units/typhoon.jpg'),
  su35s: require('../../assets/base/units/su35s.jpg'),
  gripenE: require('../../assets/base/units/gripenE.jpg'),
  j16: require('../../assets/base/units/j16.jpg'),
  f35a: require('../../assets/base/units/f35a.jpg'),
  f22raptor: require('../../assets/base/units/f22raptor.jpg'),
  su57felon: require('../../assets/base/units/su57felon.jpg'),
  j20: require('../../assets/base/units/j20.jpg'),
  kaan: require('../../assets/base/units/kaan.jpg'),
  kizilelmafighter: require('../../assets/base/units/kizilelmafighter.jpg'),
  b2spirit: require('../../assets/base/units/b2spirit.jpg'),
  b21raider: require('../../assets/base/units/b21raider.jpg'),
  heybeliada: require('../../assets/base/units/heybeliada.jpg'),
  milgem: require('../../assets/base/units/milgem.jpg'),
  tf2000: require('../../assets/base/units/tf2000.jpg'),
  f125: require('../../assets/base/units/f125.jpg'),
  constellation: require('../../assets/base/units/constellation.jpg'),
  type212a: require('../../assets/base/units/type212a.jpg'),
  arleighburke: require('../../assets/base/units/arleighburke.jpg'),
  type055: require('../../assets/base/units/type055.jpg'),
  qecarrier: require('../../assets/base/units/qecarrier.jpg'),
  fordcarrier: require('../../assets/base/units/fordcarrier.jpg'),
  virginiaclass: require('../../assets/base/units/virginiaclass.jpg'),
  zumwalt: require('../../assets/base/units/zumwalt.jpg'),
  stinger: require('../../assets/base/units/stinger.jpg'),
  iglaS: require('../../assets/base/units/iglaS.jpg'),
  hisarA: require('../../assets/base/units/hisarA.jpg'),
  hisarO: require('../../assets/base/units/hisarO.jpg'),
  ironDome: require('../../assets/base/units/ironDome.jpg'),
  patriotPac3: require('../../assets/base/units/patriotPac3.jpg'),
  siper: require('../../assets/base/units/siper.jpg'),
  s500: require('../../assets/base/units/s500.jpg'),
  thaad: require('../../assets/base/units/thaad.jpg'),
};

interface HarekatTabProps {
  buildings: BuildingState[];
  activeMarch: March | null;
  birlikler: Birlik[];
  removeBirlik: (id: string) => void;
  getTotalTrainedUnits: () => number;
  getTotalAttackPower: (committed: number) => number;
  onCreateBirlik: () => void;
}

export function HarekatTab({
  buildings,
  activeMarch,
  birlikler,
  removeBirlik,
  getTotalTrainedUnits,
  getTotalAttackPower,
  onCreateBirlik,
}: HarekatTabProps) {
  const [selectedBirlikIds, setSelectedBirlikIds] = useState<Set<string>>(new Set());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [detailBirlik, setDetailBirlik] = useState<Birlik | null>(null);
  const [detailBranch, setDetailBranch] = useState<string | null>(null);

  const totalUnits = getTotalTrainedUnits();
  const selectedBirlikler = birlikler.filter(b => selectedBirlikIds.has(b.id));
  const birlikTotal = selectedBirlikler.reduce((sum, bl) => sum + bl.slots.reduce((a, s) => a + s.count, 0), 0);
  const safeCommitted = selectedBirlikler.length > 0 ? birlikTotal : 0;
  const atkPower = getTotalAttackPower(safeCommitted);

  const unitBreakdown = BUILDING_BRANCHES
    .map(({ id, i18n, icon }) => {
      const b = buildings.find(bl => bl.id === id);
      const trained = b?.trainedUnits ?? {};
      const count = Object.values(trained).reduce((a, v) => a + v, 0);
      const isEn = getLocale() === 'en';
      const units = Object.entries(trained)
        .filter(([, c]) => c > 0)
        .map(([uid, cnt]) => {
          const def = UNIT_MAP[uid];
          const unitLabel = isEn ? (def?.labelEn ?? def?.label ?? uid) : (def?.label ?? uid);
          return { uid, count: cnt, label: unitLabel, icon: def?.icon ?? '❓' };
        })
        .sort((a, b) => b.count - a.count);
      return { id, label: t(i18n), icon, count, units };
    });

  return (
    <View style={styles.harekatContent}>
      {activeMarch && (
        <View style={styles.hqMarchBox}>
          <Text style={styles.hqMarchTitle}>🗺️ Aktif Sefer</Text>
          <Text style={styles.hqMarchTarget}>{activeMarch.targetName}</Text>
          <CountdownTimer seconds={activeMarch.secondsRemaining} total={activeMarch.totalSeconds} />
          <Text style={styles.hqMarchSub}>{t('base.marchUnits', { count: String(activeMarch.committedUnits), power: String(activeMarch.attackPower) })}</Text>
        </View>
      )}

      <View style={styles.hqArmyBox}>
        <View style={styles.hqArmyRow}>
          <Text style={styles.hqArmyTotal}>{t('base.armyStatus', { count: String(totalUnits) })}</Text>
          {atkPower > 0 && <Text style={styles.hqArmyPower}>⚔️ {atkPower}</Text>}
        </View>
        {unitBreakdown.length > 0 && (() => {
          const getCategory = (bid: string) => unitBreakdown.find(u => u.id === bid);
          const infantry = getCategory('barracks');
          const armor = getCategory('tankFactory');
          const air = getCategory('airport');
          const naval = getCategory('shipyard');
          const airDef = getCategory('defenseTower');

          const renderBox = (cat: typeof infantry, isWide = false) => {
            if (!cat) return <View style={isWide ? hs.wideBoxEmpty : hs.boxEmpty} />;
            return (
              <View style={isWide ? hs.wideBox : hs.box}>
                <Pressable
                  style={isWide ? hs.wideBoxInner : hs.boxInner}
                  onPress={() => setExpandedCategory(cat.id)}
                >
                  {BRANCH_ICONS[cat.id] ? (
                    <Image source={BRANCH_ICONS[cat.id]} style={isWide ? hs.branchIconWide : hs.branchIcon} />
                  ) : (
                    <Text style={hs.boxIcon}>{cat.icon}</Text>
                  )}
                  <Text style={hs.boxLabel} numberOfLines={1} adjustsFontSizeToFit>{cat.label}</Text>
                  <Text style={hs.boxCount}>{cat.count}</Text>
                </Pressable>
              </View>
            );
          };

          return (
            <View style={hs.gridContainer}>
              <View style={hs.gridRow}>
                {renderBox(infantry)}
                {renderBox(armor)}
                {renderBox(air)}
                {renderBox(naval)}
                {renderBox(airDef)}
              </View>
            </View>
          );
        })()}
        {totalUnits === 0 && (
          <Text style={styles.emptyText}>{t('base.noTrainedUnits')}</Text>
        )}
      </View>

      {/* Birim Detay Modal */}
      <Modal visible={expandedCategory !== null} transparent animationType="slide">
        <Pressable style={hs.modalOverlay} onPress={() => setExpandedCategory(null)}>
          <Pressable style={hs.modalContent} onPress={() => {}}>
            {(() => {
              const cat = unitBreakdown.find(u => u.id === expandedCategory);
              if (!cat) return null;
              return (
                <>
                  <View style={hs.modalHeader}>
                    <Text style={hs.modalTitle}>{cat.icon} {cat.label} ({cat.count})</Text>
                    <Pressable onPress={() => setExpandedCategory(null)}>
                      <Text style={hs.modalClose}>✕</Text>
                    </Pressable>
                  </View>
                  <ScrollView style={hs.modalScroll}>
                    {cat.units.map(unit => (
                      <View key={unit.uid} style={hs.unitRow}>
                        {UNIT_IMAGES[unit.uid] ? (
                          <Image source={UNIT_IMAGES[unit.uid]} style={hs.unitImage} />
                        ) : (
                          <Text style={hs.unitIcon}>{unit.icon}</Text>
                        )}
                        <Text style={hs.unitName} numberOfLines={1}>{unit.label}</Text>
                        <Text style={hs.unitCount}>x{unit.count}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Birlik Branch Detay Modal */}
      <Modal visible={detailBirlik !== null && detailBranch !== null} transparent animationType="slide">
        <Pressable style={hs.modalOverlay} onPress={() => { setDetailBirlik(null); setDetailBranch(null); }}>
          <Pressable style={hs.modalContent} onPress={() => {}}>
            {detailBirlik && detailBranch && (() => {
              const isEn = getLocale() === 'en';
              const br = BUILDING_BRANCHES.find(b => b.id === detailBranch);
              const branchLabel = br ? t(br.i18n) : detailBranch;
              const branchSlots = detailBirlik.slots.filter(s => (s.buildingId || 'barracks') === detailBranch);
              const branchTotal = branchSlots.reduce((a, s) => a + s.count, 0);
              return (
                <>
                  <View style={hs.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {BRANCH_ICONS[detailBranch] && <Image source={BRANCH_ICONS[detailBranch]} style={{ width: 28, height: 28, borderRadius: 4 }} />}
                      <Text style={hs.modalTitle}>{branchLabel} ({branchTotal})</Text>
                    </View>
                    <Pressable onPress={() => { setDetailBirlik(null); setDetailBranch(null); }}>
                      <Text style={hs.modalClose}>✕</Text>
                    </Pressable>
                  </View>
                  <ScrollView style={hs.modalScroll}>
                    {branchSlots.map(s => {
                      const def = UNIT_MAP[s.unitId];
                      const unitLabel = isEn ? (def?.labelEn ?? def?.label ?? s.unitId) : (def?.label ?? s.unitId);
                      return (
                        <View key={s.unitId} style={hs.unitRow}>
                          {UNIT_IMAGES[s.unitId] ? (
                            <Image source={UNIT_IMAGES[s.unitId]} style={hs.unitImage} />
                          ) : (
                            <Text style={hs.unitIcon}>{s.icon}</Text>
                          )}
                          <Text style={hs.unitName} numberOfLines={1}>{unitLabel}</Text>
                          <Text style={hs.unitCount}>x{s.count}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.birlikSection}>
        <View style={styles.birlikHeader}>
          <Text style={styles.hqTargetSectionLabel}>{t('base.mySquads', { count: String(birlikler.length) })}</Text>
        </View>
        {birlikler.length < 5 && totalUnits > 0 && !activeMarch && (
          <View style={hs.createBtnRow}>
            <Pressable style={hs.createBtn} onPress={onCreateBirlik}>
              <Text style={hs.createBtnText}>{t('base.createSquad')}</Text>
            </Pressable>
          </View>
        )}
        {birlikler.length === 0 && (
          <Text style={styles.emptyText}>{t('base.noSquads')}</Text>
        )}
        {birlikler.map(bl => {
          const blTotal = bl.slots.reduce((a, s) => a + s.count, 0);
          const isSel = selectedBirlikIds.has(bl.id);
          return (
            <View key={bl.id} style={[styles.birlikCard, isSel && styles.birlikCardSel]}>
              <View style={styles.birlikCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.birlikName}>{bl.name}</Text>
                  <View style={styles.birlikSlotRow}>
                    {(() => {
                      // Slot'lari branch bazli grupla
                      const branchTotals: Record<string, number> = {};
                      for (const s of bl.slots) {
                        const bid = s.buildingId || 'barracks';
                        branchTotals[bid] = (branchTotals[bid] ?? 0) + s.count;
                      }
                      return Object.entries(branchTotals).map(([bid, total]) => (
                        <Pressable key={bid} style={hs.slotChip} onPress={() => { setDetailBirlik(bl); setDetailBranch(bid); }}>
                          {BRANCH_ICONS[bid] ? (
                            <Image source={BRANCH_ICONS[bid]} style={hs.slotImg} />
                          ) : (
                            <Text style={{ fontSize: 12 }}>{BUILDING_BRANCHES.find(b => b.id === bid)?.icon ?? '?'}</Text>
                          )}
                          <Text style={hs.slotCount}>{total}</Text>
                        </Pressable>
                      ));
                    })()}
                    <Text style={styles.birlikTotal}>{t('base.squadTotal', { count: String(blTotal) })}</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.birlikSelBtn, isSel && styles.birlikSelBtnActive]}
                  onPress={() => setSelectedBirlikIds(prev => {
                    const next = new Set(prev);
                    if (isSel) next.delete(bl.id); else next.add(bl.id);
                    return next;
                  })}
                >
                  <Text style={[styles.birlikSelBtnText, isSel && styles.birlikSelBtnTextActive]}>
                    {isSel ? t('base.squadSelected') : t('base.squadSelect')}
                  </Text>
                </Pressable>
                {!activeMarch && (
                  <Pressable
                    style={styles.birlikDelBtn}
                    onPress={() => {
                      removeBirlik(bl.id);
                      setSelectedBirlikIds(prev => { const next = new Set(prev); next.delete(bl.id); return next; });
                    }}
                  >
                    <Text style={styles.birlikDelBtnText}>🗑️</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const hs = StyleSheet.create({
  gridContainer: {
    gap: 8,
    marginTop: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  box: {
    flex: 1,
  },
  boxEmpty: {
    flex: 1,
  },
  boxInner: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: 2,
  },
  wideBox: {
    width: '100%',
  },
  wideBoxEmpty: {
    width: '100%',
  },
  wideBoxInner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  branchIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  branchIconWide: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  boxIcon: {
    fontSize: 18,
  },
  boxLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  boxCount: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    width: '100%',
    maxHeight: '70%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
    paddingBottom: 10,
  },
  modalTitle: {
    color: colors.sand,
    fontSize: 16,
    fontWeight: '800',
  },
  modalClose: {
    color: colors.textMuted,
    fontSize: 20,
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
  },
  // Birlik slot
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  slotImg: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  slotCount: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  // Birlik Olustur
  createBtnRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  createBtn: {
    backgroundColor: colors.military,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    width: '50%',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  unitList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 6,
    marginBottom: 6,
    padding: 6,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.panelBorder,
  },
  unitImage: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
  },
  unitIcon: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  unitName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  unitCount: {
    color: colors.sand,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'right',
  },
});
