import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { t } from '../../i18n';
import { formatNumber, formatDuration } from '../../utils/formatters';
import { ActionButton } from '../ActionButton';
import { CountdownTimer } from '../CountdownTimer';
import { styles } from '../../screens/BaseScreen.styles';
import type { BuildingId, BuildingState, ResearchNode } from '../../state/types';

function CostChip({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.costChip}>
      <Text style={styles.costChipIcon}>{icon}</Text>
      <Text style={styles.costChipVal}>{value}</Text>
    </View>
  );
}

interface ResearchTabProps {
  selectedBuilding: BuildingState;
  availableResearch: ResearchNode[];
  canStartResearch: (buildingId: BuildingId, nodeId: string) => boolean;
  startResearch: (buildingId: BuildingId, nodeId: string) => void;
  speedUpWithGold: (type: 'building' | 'research' | 'training', id: string) => void;
  calcGoldCost: (seconds: number) => number;
}

export function ResearchTab({
  selectedBuilding,
  availableResearch,
  canStartResearch,
  startResearch,
  speedUpWithGold,
  calcGoldCost,
}: ResearchTabProps) {
  const [branchTab, setBranchTab] = useState('land');
  const [selectedResearch, setSelectedResearch] = useState<ResearchNode | null>(null);

  const branchTabs = [
    { key: 'land', label: t('common.land') },
    { key: 'air', label: t('common.air') },
    { key: 'naval', label: t('common.sea') },
    { key: 'defense', label: t('common.defense') },
  ];
  const filteredResearch = availableResearch.filter(n => n.branch === branchTab);

  return (
    <View>
      <View style={styles.researchBranchRow}>
        {branchTabs.map(bt => (
          <Pressable
            key={bt.key}
            onPress={() => { setBranchTab(bt.key); setSelectedResearch(null); }}
            style={[
              styles.researchBranchBtn,
              branchTab === bt.key && styles.researchBranchBtnActive,
            ]}
          >
            <Text style={[
              styles.researchBranchLabel,
              branchTab === bt.key && styles.researchBranchLabelActive,
            ]}>
              {bt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedBuilding.researchSecondsRemaining > 0 && (
        <View style={{ marginBottom: 8 }}>
          <CountdownTimer
            seconds={selectedBuilding.researchSecondsRemaining}
            total={selectedBuilding.researchSecondsRemaining + 10}
            label={t('base.researchInProgress')}
            goldCost={calcGoldCost(selectedBuilding.researchSecondsRemaining)}
            onSpeedUp={() => speedUpWithGold('research', selectedBuilding.activeResearchNodeId ?? '')}
          />
        </View>
      )}

      {filteredResearch.length === 0 ? (
        <Text style={styles.emptyText}>
          {selectedBuilding.researchSecondsRemaining > 0
            ? t('base.noResearchBusy')
            : t('base.noResearchEmpty')}
        </Text>
      ) : (
        filteredResearch.map(node => {
          const isSel = selectedResearch?.id === node.id;
          return (
            <Pressable key={node.id} onPress={() => setSelectedResearch(isSel ? null : node)}>
              <View style={[styles.researchCard, isSel && styles.researchCardSelected]}>
                <Text style={styles.researchName}>{node.label}</Text>
                <Text style={styles.researchDesc}>{node.description}</Text>
                <View style={styles.costRow}>
                  {node.costCash > 0 && <CostChip icon="💵" value={formatNumber(node.costCash)} />}
                  {node.costOil > 0 && <CostChip icon="🛢️" value={formatNumber(node.costOil)} />}
                  {node.costOre > 0 && <CostChip icon="⛏️" value={formatNumber(node.costOre)} />}
                  <CostChip icon="⏱️" value={formatDuration(node.researchSeconds)} />
                  <CostChip icon="⚡" value={t('base.unlockPower', { n: String(node.tier * 50) })} />
                </View>
                {isSel && (
                  <ActionButton
                    label={t('base.researchBtn')}
                    onPress={() => {
                      startResearch(selectedBuilding.id, node.id);
                      setSelectedResearch(null);
                    }}
                    disabled={!canStartResearch(selectedBuilding.id, node.id)}
                    style={{ marginTop: 6 }}
                  />
                )}
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
