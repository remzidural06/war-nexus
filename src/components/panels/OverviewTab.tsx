import React from 'react';
import { View, Text } from 'react-native';
import { t } from '../../i18n';
import { formatNumber, formatDuration } from '../../utils/formatters';
import { getUnitsForBuilding, UNIT_MAP, getUnitLabel } from '../../data/units';
import { ActionButton } from '../ActionButton';
import { CountdownTimer } from '../CountdownTimer';
import { UnitImage } from '../UnitImage';
import { styles } from '../../screens/BaseScreen.styles';
import type { BuildingId, BuildingState, BuildingDefinition } from '../../state/types';

function CostChip({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.costChip}>
      <Text style={styles.costChipIcon}>{icon}</Text>
      <Text style={styles.costChipVal}>{value}</Text>
    </View>
  );
}

interface OverviewTabProps {
  selectedBuilding: BuildingState;
  buildingDef: BuildingDefinition;
  buildings: BuildingState[];
  getUpgradeCost: (id: BuildingId) => { cash: number; oil: number; ore: number };
  getUpgradeTime: (id: BuildingId) => number;
  canUpgradeBuilding: (id: BuildingId) => boolean;
  upgradeBuilding: (id: BuildingId) => void;
  speedUpWithGold: (type: 'building' | 'research' | 'training', id: string) => void;
  calcGoldCost: (seconds: number) => number;
}

export function OverviewTab({
  selectedBuilding,
  buildingDef,
  buildings,
  getUpgradeCost,
  getUpgradeTime,
  canUpgradeBuilding,
  upgradeBuilding,
  speedUpWithGold,
  calcGoldCost,
}: OverviewTabProps) {
  const cost = getUpgradeCost(selectedBuilding.id);
  const time = getUpgradeTime(selectedBuilding.id);
  const otherUpgrading = buildings.find(b => b.isUpgrading && b.id !== selectedBuilding.id);

  return (
    <View style={styles.overviewContent}>
      <View style={styles.costRow}>
        {cost.cash > 0 && <CostChip icon="💵" value={formatNumber(cost.cash)} />}
        {cost.oil > 0 && <CostChip icon="🛢️" value={formatNumber(cost.oil)} />}
        {cost.ore > 0 && <CostChip icon="⛏️" value={formatNumber(cost.ore)} />}
        <CostChip icon="⏱️" value={formatDuration(time)} />
        <CostChip icon="⚡" value={t('base.unlockPower', { n: String((selectedBuilding.level + 1) * 100) })} />
      </View>

      {buildingDef.baseProdPerHour && (
        <View style={styles.prodInfoRow}>
          <Text style={styles.prodLabel}>
            {buildingDef.produceResource === 'cash' ? '💵' : buildingDef.produceResource === 'oil' ? '🛢️' : '⛏️'}
            {' '}{t('base.income')}
          </Text>
          <Text style={styles.prodCurrent}>
            {formatNumber(buildingDef.baseProdPerHour * selectedBuilding.level)}{t('base.incomePerHour')}
          </Text>
          {selectedBuilding.level < buildingDef.maxLevel && (
            <Text style={styles.prodNext}>
              → {formatNumber(buildingDef.baseProdPerHour * (selectedBuilding.level + 1))}/sa Lv.{selectedBuilding.level + 1}
            </Text>
          )}
        </View>
      )}

      {otherUpgrading && !selectedBuilding.isUpgrading && (
        <View style={styles.blockRow}>
          <Text style={styles.blockText}>
            🔒 {t('base.blockingMsg', { name: t(`buildings.${otherUpgrading.id}.name`) })}
          </Text>
        </View>
      )}

      {selectedBuilding.isUpgrading ? (
        <CountdownTimer
          seconds={selectedBuilding.upgradeSecondsRemaining}
          total={getUpgradeTime(selectedBuilding.id)}
          label={t('base.upgrading')}
          goldCost={calcGoldCost(selectedBuilding.upgradeSecondsRemaining)}
          onSpeedUp={() => speedUpWithGold('building', selectedBuilding.id)}
        />
      ) : (
        <ActionButton
          label={
            selectedBuilding.level >= buildingDef.maxLevel
              ? t('base.maxLevel')
              : t('base.upgrade')
          }
          onPress={() => upgradeBuilding(selectedBuilding.id)}
          disabled={!canUpgradeBuilding(selectedBuilding.id)}
        />
      )}

      {/* Next level unlocks */}
      {selectedBuilding.level < buildingDef.maxLevel && (() => {
        const currentLv = selectedBuilding.level;
        const currentUnits = getUnitsForBuilding(selectedBuilding.id, currentLv);
        let milestoneUnits: typeof currentUnits = [];
        let milestoneLv = currentLv + 1;
        for (let lv = currentLv + 1; lv <= buildingDef.maxLevel; lv++) {
          const lvUnits = getUnitsForBuilding(selectedBuilding.id, lv);
          const added = lvUnits.filter(u => !currentUnits.find(c => c.id === u.id));
          if (added.length > 0) { milestoneUnits = added; milestoneLv = lv; break; }
        }
        const isNext = milestoneLv === currentLv + 1;
        const prodIncrease = buildingDef.baseProdPerHour ?? null;
        const resourceIcon = buildingDef.produceResource === 'cash' ? '💵' : buildingDef.produceResource === 'oil' ? '🛢️' : '⛏️';

        return (
          <View style={styles.nextLevelBox}>
            {prodIncrease !== null && (
              <View style={styles.nextLevelRow}>
                <Text style={styles.nextLevelIcon}>{resourceIcon}</Text>
                <Text style={styles.nextLevelText}>+{formatNumber(prodIncrease)}/sa üretim artışı</Text>
              </View>
            )}
            {buildingDef.lossReductionPerLevel && (
              <View style={styles.nextLevelRow}>
                <Text style={styles.nextLevelIcon}>🛡️</Text>
                <Text style={styles.nextLevelText}>
                  Savaş kayıpları %{Math.round(buildingDef.lossReductionPerLevel * 100)} azalır
                </Text>
              </View>
            )}
            {buildingDef.interestRatePerLevel && (
              <View style={styles.nextLevelRow}>
                <Text style={styles.nextLevelIcon}>📈</Text>
                <Text style={styles.nextLevelText}>
                  Faiz geliri artar (her seviye +%{Math.round(buildingDef.interestRatePerLevel * 100 * 3600)}/sa)
                </Text>
              </View>
            )}
            {milestoneUnits.length > 0 && (
              <>
                <Text style={[styles.nextLevelTitle, !isNext && styles.nextLevelTitleFar]}>
                  Lv.{milestoneLv}'de açılacaklar:
                </Text>
                {milestoneUnits.map(u => (
                  <View key={u.id} style={styles.nextLevelRow}>
                    {u.imageUri
                      ? <UnitImage unitId={u.id} uri={u.imageUri} icon={u.icon} style={styles.nextLevelThumb} />
                      : <Text style={styles.nextLevelIcon}>{u.icon}</Text>
                    }
                    <Text style={styles.nextLevelText}>{getUnitLabel(u, u.id)}</Text>
                    {isNext
                      ? <Text style={styles.nextLevelBadge}>Yeni</Text>
                      : <Text style={styles.nextLevelBadgeFar}>Lv.{milestoneLv}</Text>
                    }
                  </View>
                ))}
              </>
            )}
            {prodIncrease === null && !buildingDef.lossReductionPerLevel && !buildingDef.interestRatePerLevel && milestoneUnits.length === 0 && (
              <View style={styles.nextLevelRow}>
                <Text style={styles.nextLevelIcon}>⚡</Text>
                <Text style={styles.nextLevelText}>Bina kapasitesi ve eğitim hızı artar</Text>
              </View>
            )}
          </View>
        );
      })()}

      {/* Trained units */}
      {Object.entries(selectedBuilding.trainedUnits).some(([, c]) => c > 0) && (
        <View style={styles.trainedSection}>
          <Text style={styles.sectionLabel}>MEVCUT BİRİMLER</Text>
          {Object.entries(selectedBuilding.trainedUnits)
            .filter(([, c]) => c > 0)
            .map(([uid, cnt]) => {
              const unitDef = UNIT_MAP[uid];
              return (
                <View key={uid} style={styles.trainedRow}>
                  {unitDef?.imageUri ? (
                    <UnitImage unitId={uid} uri={unitDef.imageUri} icon={unitDef.icon} style={styles.trainedThumb} />
                  ) : (
                    <Text style={styles.trainedIcon}>{unitDef?.icon ?? '🪖'}</Text>
                  )}
                  <Text style={styles.trainedId}>{getUnitLabel(unitDef, uid)}</Text>
                  <Text style={styles.trainedCount}>×{cnt}</Text>
                </View>
              );
            })}
        </View>
      )}
    </View>
  );
}
