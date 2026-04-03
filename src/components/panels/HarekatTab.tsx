import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { t } from '../../i18n';
import { UNIT_MAP } from '../../data/units';
import { CountdownTimer } from '../CountdownTimer';
import { styles } from '../../screens/BaseScreen.styles';
import { BUILDING_BRANCHES } from '../../screens/BaseScreen.constants';
import type { BuildingState, March, Birlik } from '../../state/types';

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

  const totalUnits = getTotalTrainedUnits();
  const selectedBirlikler = birlikler.filter(b => selectedBirlikIds.has(b.id));
  const birlikTotal = selectedBirlikler.reduce((sum, bl) => sum + bl.slots.reduce((a, s) => a + s.count, 0), 0);
  const safeCommitted = selectedBirlikler.length > 0 ? birlikTotal : 0;
  const atkPower = getTotalAttackPower(safeCommitted);

  const unitBreakdown = BUILDING_BRANCHES
    .map(({ id, label, icon }) => {
      const b = buildings.find(bl => bl.id === id);
      const count = b?.trainedUnits
        ? Object.values(b.trainedUnits).reduce((a, v) => a + v, 0)
        : 0;
      return { id, label, icon, count };
    })
    .filter(u => u.count > 0);

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
        {unitBreakdown.length > 0 && (
          <View style={styles.hqBreakdownRow}>
            {unitBreakdown.map(u => (
              <View key={u.label} style={styles.hqChip}>
                <Text style={styles.hqChipIcon}>{u.icon}</Text>
                <Text style={styles.hqChipLabel}>{u.label}</Text>
                <Text style={styles.hqChipCount}>{u.count}</Text>
              </View>
            ))}
          </View>
        )}
        {totalUnits === 0 && (
          <Text style={styles.emptyText}>{t('base.noTrainedUnits')}</Text>
        )}
      </View>

      <View style={styles.birlikSection}>
        <View style={styles.birlikHeader}>
          <Text style={styles.hqTargetSectionLabel}>{t('base.mySquads', { count: String(birlikler.length) })}</Text>
          {birlikler.length < 5 && totalUnits > 0 && (
            <Pressable style={styles.birlikCreateBtn} onPress={onCreateBirlik}>
              <Text style={styles.birlikCreateBtnText}>{t('base.createSquad')}</Text>
            </Pressable>
          )}
        </View>
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
                    {bl.slots.map(s => (
                      <Text key={s.unitId} style={styles.birlikSlotChip}>
                        {s.icon}{s.count}
                      </Text>
                    ))}
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
                <Pressable
                  style={styles.birlikDelBtn}
                  onPress={() => {
                    removeBirlik(bl.id);
                    setSelectedBirlikIds(prev => { const next = new Set(prev); next.delete(bl.id); return next; });
                  }}
                >
                  <Text style={styles.birlikDelBtnText}>🗑️</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
