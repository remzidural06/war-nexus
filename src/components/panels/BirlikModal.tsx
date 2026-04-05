import React, { useState } from 'react';
import { Image, View, Text, Pressable, ScrollView, TextInput, Modal } from 'react-native';
import { t } from '../../i18n';
import { ActionButton } from '../ActionButton';
import { UnitImage } from '../UnitImage';
import { styles } from '../../screens/BaseScreen.styles';
import { BUILDING_BRANCHES } from '../../screens/BaseScreen.constants';
import { getUnitLabel, UNIT_MAP } from '../../data/units';
import { colors } from '../../theme/colors';

const BRANCH_IMAGES: Record<string, any> = {
  barracks: require('../../assets/base/branch_icons/infantry.png'),
  tankFactory: require('../../assets/base/branch_icons/armor.png'),
  airport: require('../../assets/base/branch_icons/air.png'),
  shipyard: require('../../assets/base/branch_icons/naval.png'),
  defenseTower: require('../../assets/base/branch_icons/airDefense.png'),
};
import type { Birlik, BirlikSlot } from '../../state/types';

interface UnitAvailItem {
  unitId: string;
  buildingId: string;
  label: string;
  icon: string;
  imageUri?: string;
  avail: number;
}

interface BirlikModalProps {
  visible: boolean;
  onClose: () => void;
  unitAvailForBirlik: UnitAvailItem[];
  addBirlik: (birlik: Birlik) => void;
  birlikCount: number;
}

export function BirlikModal({
  visible,
  onClose,
  unitAvailForBirlik,
  addBirlik,
  birlikCount,
}: BirlikModalProps) {
  const [name, setName] = useState(t('base.defaultSquadName', { n: String(birlikCount + 1) }));
  const [slots, setSlots] = useState<Record<string, number>>({});

  const total = Object.values(slots).reduce((a, v) => a + v, 0);

  const handleSave = () => {
    if (total === 0 || !name.trim()) return;
    const birlikSlots: BirlikSlot[] = unitAvailForBirlik
      .filter(u => (slots[u.unitId] ?? 0) > 0)
      .map(u => ({ unitId: u.unitId, buildingId: u.buildingId, icon: u.icon, label: u.label, imageUri: u.imageUri, count: slots[u.unitId]! }));
    addBirlik({ id: Date.now().toString(), name: name.trim(), slots: birlikSlots });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.birlikModalOverlay}>
        <View style={styles.birlikModalPanel}>
          <View style={styles.birlikModalHeader}>
            <Text style={styles.birlikModalTitle}>{t('base.squadCreateTitle')}</Text>
            <Pressable onPress={onClose} style={styles.birlikModalClose}>
              <Text style={styles.birlikModalCloseText}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.birlikNameInput}
            value={name}
            onChangeText={setName}
            placeholder={t('base.squadNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            maxLength={20}
          />

          <View style={styles.birlikModalSelectHeader}>
            <Text style={styles.birlikModalSelectLabel}>{t('base.squadSelectHeader')}</Text>
            <Pressable onPress={() => {
              const all: Record<string, number> = {};
              unitAvailForBirlik.forEach(u => { all[u.unitId] = u.avail; });
              setSlots(all);
            }}>
              <Text style={styles.birlikModalSelectAll}>{t('base.selectAll')}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.birlikModalList}>
            {unitAvailForBirlik.length === 0 && (
              <View style={styles.birlikModalNoUnits}>
                <Text style={styles.birlikModalNoUnitsIcon}>⚠️</Text>
                <Text style={styles.birlikModalNoUnitsTitle}>Birim Yok</Text>
                <Text style={styles.birlikModalNoUnitsDesc}>{t('base.noUnitsDesc')}</Text>
              </View>
            )}
            {BUILDING_BRANCHES.filter(br => br.id !== 'defenseTower').map(br => {
              const branchUnits = unitAvailForBirlik.filter(u => u.buildingId === br.id);
              if (branchUnits.length === 0) return null;
              return (
                <View key={br.id}>
                  <View style={styles.birlikModalBranchHeader}>
                    {BRANCH_IMAGES[br.id] ? (
                      <Image source={BRANCH_IMAGES[br.id]} style={{ width: 20, height: 20, borderRadius: 3 }} />
                    ) : (
                      <Text style={styles.birlikModalBranchIcon}>{br.icon}</Text>
                    )}
                    <Text style={styles.birlikModalBranchLabel}>{t(br.i18n)}</Text>
                  </View>
                  {branchUnits.map(u => {
                    const cur = slots[u.unitId] ?? 0;
                    return (
                      <View key={u.unitId} style={styles.birlikModalUnitRow}>
                        <View style={styles.birlikModalUnitInfo}>
                          <UnitImage unitId={u.unitId} uri={u.imageUri} icon={u.icon} style={styles.birlikModalUnitImg} />
                          <View>
                            <Text style={styles.birlikModalUnitName}>{getUnitLabel(UNIT_MAP[u.unitId], u.label)}</Text>
                            <Text style={styles.birlikModalUnitAvail}>{t('base.availableLabel', { count: String(u.avail) })}</Text>
                          </View>
                        </View>
                        <View style={styles.birlikModalStepper}>
                          <Pressable style={styles.birlikModalStepBtn} onPress={() => setSlots(p => ({ ...p, [u.unitId]: Math.max(0, (p[u.unitId] ?? 0) - 100) }))}>
                            <Text style={styles.birlikModalStepBtnText}>-100</Text>
                          </Pressable>
                          <Pressable style={styles.birlikModalStepBtn} onPress={() => setSlots(p => ({ ...p, [u.unitId]: Math.max(0, (p[u.unitId] ?? 0) - 1) }))}>
                            <Text style={styles.birlikModalStepBtnText}>−</Text>
                          </Pressable>
                          <TextInput
                            style={styles.birlikModalStepInput}
                            value={String(cur)}
                            onChangeText={text => {
                              const val = parseInt(text, 10);
                              if (text === '') setSlots(p => ({ ...p, [u.unitId]: 0 }));
                              else if (!isNaN(val)) setSlots(p => ({ ...p, [u.unitId]: Math.min(u.avail, Math.max(0, val)) }));
                            }}
                            keyboardType="numeric"
                            selectTextOnFocus
                          />
                          <Pressable style={styles.birlikModalStepBtn} onPress={() => setSlots(p => ({ ...p, [u.unitId]: Math.min(u.avail, (p[u.unitId] ?? 0) + 1) }))}>
                            <Text style={styles.birlikModalStepBtnText}>+</Text>
                          </Pressable>
                          <Pressable style={styles.birlikModalStepBtn} onPress={() => setSlots(p => ({ ...p, [u.unitId]: Math.min(u.avail, (p[u.unitId] ?? 0) + 100) }))}>
                            <Text style={styles.birlikModalStepBtnText}>+100</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.birlikModalSummary}>
            <Text style={styles.birlikModalSummaryText}>
              {t('base.summaryText', { count: String(total) })}
            </Text>
          </View>

          <ActionButton
            label={t('base.saveSquad', { count: String(total) })}
            disabled={total === 0 || !name.trim()}
            onPress={handleSave}
          />
          <ActionButton label={t('common.cancel')} onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}
