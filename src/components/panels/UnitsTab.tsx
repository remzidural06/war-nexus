import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { t } from '../../i18n';
import { formatNumber } from '../../utils/formatters';
import { ActionButton } from '../ActionButton';
import { CountdownTimer } from '../CountdownTimer';
import { UnitImage } from '../UnitImage';
import { styles } from '../../screens/BaseScreen.styles';
import type { BuildingId, BuildingState, UnitDefinition } from '../../state/types';

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.stepBtn} onPress={onPress}>
      <Text style={styles.stepBtnText}>{label}</Text>
    </Pressable>
  );
}

interface UnitsTabProps {
  selectedBuilding: BuildingState;
  unlockedUnits: UnitDefinition[];
  getTrainedCount: (buildingId: BuildingId, unitId: string) => number;
  getTrainingCost: (unitId: string, qty: number) => { cash: number; oil: number; ore: number };
  getMaxTrainable: (buildingId: BuildingId, unitId: string) => number;
  getBuildingUnitCount: (buildingId: BuildingId) => number;
  getUnitCap: () => number;
  canStartTraining: (buildingId: BuildingId, unitId: string, qty: number) => boolean;
  startTraining: (buildingId: BuildingId, unitId: string, qty: number) => void;
  speedUpWithGold: (type: 'building' | 'research' | 'training', id: string) => void;
  calcGoldCost: (seconds: number) => number;
}

export function UnitsTab({
  selectedBuilding,
  unlockedUnits,
  getTrainedCount,
  getTrainingCost,
  getMaxTrainable,
  getBuildingUnitCount,
  getUnitCap,
  canStartTraining,
  startTraining,
  speedUpWithGold,
  calcGoldCost,
}: UnitsTabProps) {
  const [selectedUnit, setSelectedUnit] = useState<UnitDefinition | null>(null);
  const [trainQty, setTrainQty] = useState(1);

  const trainCost = useMemo(
    () => (selectedUnit ? getTrainingCost(selectedUnit.id, trainQty) : null),
    [selectedUnit, trainQty, getTrainingCost],
  );

  const buildingUnits = getBuildingUnitCount(selectedBuilding.id);
  const cap = getUnitCap();
  const isFull = buildingUnits >= cap;

  const BUILDING_LABELS_I18N: Record<string, string> = {
    barracks: 'common.land', tankFactory: 'common.land', airport: 'common.air',
    shipyard: 'common.sea', defenseTower: 'common.defense', hq: 'common.defense',
  };
  const label = t(BUILDING_LABELS_I18N[selectedBuilding.id] ?? 'common.units');

  return (
    <View>
      {selectedBuilding.trainingQueue.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <CountdownTimer
            seconds={selectedBuilding.trainingQueue[0].secondsRemaining}
            total={selectedBuilding.trainingQueue[0].totalSeconds}
            label={t('base.training')}
            goldCost={calcGoldCost(selectedBuilding.trainingQueue.reduce((s, q) => s + (q.secondsRemaining ?? 0), 0))}
            onSpeedUp={() => speedUpWithGold('training', selectedBuilding.id)}
          />
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isFull ? '#4a1c1c' : '#1a2a1a', borderRadius: 8, padding: 8, marginBottom: 8 }}>
        <Text style={{ color: isFull ? '#ff6b6b' : '#8bc34a', fontWeight: 'bold', fontSize: 13 }}>
          {t('base.capacityLabel', { label })}
        </Text>
        <Text style={{ color: isFull ? '#ff6b6b' : '#ccc', fontWeight: 'bold', fontSize: 13 }}>
          {buildingUnits} / {cap}
        </Text>
      </View>

      {unlockedUnits.length === 0 ? (
        <Text style={styles.emptyText}>{t('base.noUnits')}</Text>
      ) : (
        unlockedUnits.map(unit => {
          const isSel = selectedUnit?.id === unit.id;
          const trained = getTrainedCount(selectedBuilding.id, unit.id);
          return (
            <Pressable
              key={unit.id}
              onPress={() => {
                setSelectedUnit(isSel ? null : unit);
                setTrainQty(1);
              }}
            >
              <View style={[styles.unitCard, isSel && styles.unitCardSelected]}>
                {isSel && unit.imageUri && (
                  <UnitImage unitId={unit.id} uri={unit.imageUri} icon={unit.icon} style={styles.unitCardBanner} banner />
                )}
                <View style={styles.unitCardRow}>
                  {!isSel ? (
                    unit.imageUri ? (
                      <UnitImage unitId={unit.id} uri={unit.imageUri} icon={unit.icon} style={styles.unitCardThumb} />
                    ) : (
                      <Text style={styles.unitCardIcon}>{unit.icon}</Text>
                    )
                  ) : null}
                  <View style={styles.unitCardInfo}>
                    <Text style={styles.unitCardName}>{t(`units.${unit.id}.name`) !== `units.${unit.id}.name` ? t(`units.${unit.id}.name`) : unit.label}</Text>
                    <Text style={styles.unitCardStat}>ATK {unit.attackPower} · DEF {unit.defensePower}</Text>
                    <Text style={styles.unitCardTrained}>{t('base.trained', { count: String(trained) })}</Text>
                  </View>
                  <View>
                    <Text style={styles.costSmall}>💵{unit.costCash}</Text>
                    <Text style={styles.costSmall}>🛢️{unit.costOil}</Text>
                    <Text style={styles.costSmall}>⛏️{unit.costOre}</Text>
                  </View>
                </View>
                {isSel && (() => {
                  const maxT = getMaxTrainable(selectedBuilding.id, unit.id);
                  const clamp = (v: number) => Math.max(1, Math.min(v, Math.max(1, maxT)));
                  return (
                    <View style={styles.trainControls}>
                      <View style={styles.stepperRow}>
                        <StepBtn label="−100" onPress={() => setTrainQty(q => clamp(q - 100))} />
                        <StepBtn label="−10" onPress={() => setTrainQty(q => clamp(q - 10))} />
                        <StepBtn label="−" onPress={() => setTrainQty(q => clamp(q - 1))} />
                        <TextInput
                          style={styles.stepperInput}
                          value={String(trainQty)}
                          onChangeText={val => {
                            const n = parseInt(val.replace(/[^0-9]/g, ''), 10);
                            setTrainQty(isNaN(n) ? 1 : clamp(n));
                          }}
                          keyboardType="number-pad"
                          selectTextOnFocus
                        />
                        <StepBtn label="+" onPress={() => setTrainQty(q => clamp(q + 1))} />
                        <StepBtn label="+10" onPress={() => setTrainQty(q => clamp(q + 10))} />
                        <StepBtn label="+100" onPress={() => setTrainQty(q => clamp(q + 100))} />
                      </View>
                      {trainCost && (
                        <Text style={styles.trainCostText}>
                          💵{formatNumber(trainCost.cash)} 🛢️{formatNumber(trainCost.oil)} ⛏️{formatNumber(trainCost.ore)}
                        </Text>
                      )}
                      <ActionButton
                        label={getBuildingUnitCount(selectedBuilding.id) + trainQty > getUnitCap() ? t('base.capacityFull', { current: String(getBuildingUnitCount(selectedBuilding.id)), cap: String(getUnitCap()) }) : t('base.trainBtn', { qty: String(trainQty) })}
                        onPress={() => {
                          startTraining(selectedBuilding.id, unit.id, trainQty);
                          setSelectedUnit(null);
                        }}
                        disabled={!canStartTraining(selectedBuilding.id, unit.id, trainQty)}
                      />
                    </View>
                  );
                })()}
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
