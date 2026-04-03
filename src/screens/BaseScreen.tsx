import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useDesertGame } from '../state/DesertGameContext';
import { t } from '../i18n';
import { BUILDING_DEFINITIONS } from '../data/buildings';
import { UNIT_MAP } from '../data/units';
import type { BuildingId, BuildingState, MapTarget, BattleReport, Birlik } from '../state/types';
import { BattleResultModal } from '../components/BattleResultModal';
import { DraggableHotspot } from '../components/DraggableHotspot';
import { OverviewTab } from '../components/panels/OverviewTab';
import { UnitsTab } from '../components/panels/UnitsTab';
import { ResearchTab } from '../components/panels/ResearchTab';
import { HarekatTab } from '../components/panels/HarekatTab';
import { BirlikModal } from '../components/panels/BirlikModal';
import { useBaseEditorState } from '../hooks/useBaseEditorState';
import { styles } from './BaseScreen.styles';
import {
  CANVAS_W, CANVAS_H, BUILDING_BRANCHES,
  DIFFICULTY_COLORS_HQ, DIFFICULTY_LABELS_HQ_KEYS,
  HOTSPOT, PANEL_H,
  hqWinChance, hqWinColor,
  type HotspotPos,
} from './BaseScreen.constants';

const _baseScene = require('../assets/base/terrain/base_scene.jpg');

// ─── Main Screen ──────────────────────────────────────────────
type PanelTab = 'overview' | 'units' | 'research' | 'harekat' | 'market';

export function BaseScreen() {
  const {
    buildings,
    getUpgradeCost,
    getUpgradeTime,
    canUpgradeBuilding,
    upgradeBuilding,
    canStartResearch,
    startResearch,
    getAvailableResearch,
    getUnlockedUnitsForBuilding,
    getTrainedCount,
    canStartTraining,
    startTraining,
    getTrainingCost,
    getMaxTrainable,
    getUnitCap,
    getBuildingUnitCount,
    targets,
    activeMarch,
    battleReports,
    getTotalTrainedUnits,
    getTotalAttackPower,
    canAttack,
    attackTarget,
    adjustTrainedUnits,
    birlikler,
    addBirlik,
    removeBirlik,
    speedUpWithGold,
    calcGoldCost,
    calcUpgradeGoldCost,
    buyResourceWithGold,
    gold,
    getResource,
  } = useDesertGame();

  // ── Oyun paneli state ───────────────────────────────────────
  const [selectedId, setSelectedId] = useState<BuildingId | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('overview');
  const [hqCommitted, setHqCommitted] = useState(1);
  const [hqTarget, setHqTarget] = useState<MapTarget | null>(null);
  // Birlik state (birlikler context'ten geliyor)
  const [showBirlikForm, setShowBirlikForm] = useState(false);
  const [viewReport, setViewReport] = useState<BattleReport | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // ── Editör state (hook) ──────────────────────────────────────
  const {
    editMode, toggleEditMode, positions, editTarget, setEditTarget,
    copyMsg, editPos, handleDragEnd, updatePos, updateSize, updateRot,
    updateLabelOffset, exportPositions,
  } = useBaseEditorState();

  // ── Oyun paneli ───────────────────────────────────────────────
  const selectedBuilding = useMemo(
    () => buildings.find(b => b.id === selectedId) ?? null,
    [buildings, selectedId],
  );
  const buildingDef = selectedId ? BUILDING_DEFINITIONS[selectedId] : null;

  // Birlik oluşturma için mevcut saldırı birimleri (defenseTower hariç)
  const unitAvailForBirlik = useMemo(() => {
    const result: { unitId: string; buildingId: string; label: string; icon: string; imageUri?: string; avail: number }[] = [];
    BUILDING_BRANCHES.filter(br => br.id !== 'defenseTower').forEach(br => {
      const b = buildings.find(bl => bl.id === br.id);
      if (!b?.trainedUnits) return;
      Object.entries(b.trainedUnits).forEach(([uid, cnt]) => {
        if (cnt <= 0) return;
        const def = UNIT_MAP[uid];
        result.push({
          unitId: uid,
          buildingId: br.id,
          label: def?.label ?? uid,
          icon: def?.icon ?? br.icon,
          imageUri: def?.imageUri,
          avail: cnt,
        });
      });
    });
    return result;
  }, [buildings]);

  const openPanel = useCallback((id: BuildingId) => {
    setSelectedId(id);
    setPanelTab('overview');


    Animated.spring(panelAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [panelAnim]);

  const closePanel = useCallback(() => {
    Animated.timing(panelAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setSelectedId(null);
    });
  }, [panelAnim]);

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_H + 20, 0],
  });

  const unlockedUnits = useMemo(
    () => (selectedId ? getUnlockedUnitsForBuilding(selectedId) : []),
    [selectedId, getUnlockedUnitsForBuilding],
  );
  const availableResearch = useMemo(
    () => (selectedId ? getAvailableResearch(selectedId) : []),
    [selectedId, getAvailableResearch],
  );
  const hasMilUnits = buildingDef?.researchBranch !== undefined;

  return (
    <View style={styles.root}>
      {/* ── Editör toggle butonu ────────────────────────────── */}
      <Pressable
        style={[styles.editToggle, editMode && styles.editToggleActive]}
        onPress={() => {
          toggleEditMode();
          if (selectedId) closePanel();
        }}
      >
        <Text style={styles.editToggleText}>{editMode ? '✓ Editör' : t('base.editorInactive')}</Text>
      </Pressable>

      {/* ── Terrain canvas ──────────────────────────────────── */}
      <ScrollView
        style={styles.canvasScroll}
        contentContainerStyle={{ width: CANVAS_W, height: CANVAS_H }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={editMode}
      >
        <View style={styles.terrain}>
          <Image
            source={typeof _baseScene === 'string' ? { uri: _baseScene } : _baseScene}
            style={styles.terrainBg}
            resizeMode="cover"
          />

          {positions.map(hs => {
            const b = buildings.find(bd => bd.id === hs.id);
            return (
              <DraggableHotspot
                key={hs.id}
                hs={hs}
                editMode={editMode}
                isEditTarget={hs.id === editTarget}
                selected={hs.id === selectedId}
                building={b}
                onSelect={id => setEditTarget(id)}
                onDragEnd={handleDragEnd}
                onGamePress={id => (id === selectedId ? closePanel() : openPanel(id))}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* ── Editör paneli ────────────────────────────────────── */}
      {editMode && (
        <View style={styles.editorPanel}>
          {/* Bina seçici */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.buildingPicker}
          >
            {positions.map(p => (
              <Pressable
                key={p.id}
                style={[styles.pickerItem, editTarget === p.id && styles.pickerItemActive]}
                onPress={() => setEditTarget(p.id)}
              >
                <Text style={[styles.pickerText, editTarget === p.id && styles.pickerTextActive]}>
                  {getBuildingLabel(p.id)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {editPos ? (
            <>
              {/* Boyut bilgisi */}
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>
                  En: <Text style={styles.coordVal}>{editPos.w}</Text>
                </Text>
                <Text style={styles.coordLabel}>
                  Boy: <Text style={styles.coordVal}>{editPos.h}</Text>
                </Text>
                <Text style={styles.coordLabel}>
                  Açı: <Text style={styles.coordVal}>{editPos.rotation}°</Text>
                </Text>
                <Text style={styles.coordLabel}>
                  Yazı: <Text style={styles.coordVal}>{editPos.labelX ?? 0},{editPos.labelY ?? 0}</Text>
                </Text>
              </View>

              {/* Genişlik */}
              <View style={styles.controlRow}>
                <Text style={styles.axisLabel}>↔ En</Text>
                {[-10, -5, 5, 10].map(d => (
                  <Pressable
                    key={d}
                    style={styles.ctrlBtn}
                    onPress={() => updateSize(editPos.id, d, 0)}
                  >
                    <Text style={styles.ctrlBtnText}>{d > 0 ? `+${d}` : d}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Yükseklik */}
              <View style={styles.controlRow}>
                <Text style={styles.axisLabel}>↕ Boy</Text>
                {[-10, -5, 5, 10].map(d => (
                  <Pressable
                    key={d}
                    style={styles.ctrlBtn}
                    onPress={() => updateSize(editPos.id, 0, d)}
                  >
                    <Text style={styles.ctrlBtnText}>{d > 0 ? `+${d}` : d}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Açı */}
              <View style={styles.controlRow}>
                <Text style={styles.axisLabel}>↺ Açı ↻</Text>
                {[-45, -15, -5, 5, 15, 45].map(d => (
                  <Pressable
                    key={d}
                    style={styles.ctrlBtn}
                    onPress={() => updateRot(editPos.id, d)}
                  >
                    <Text style={styles.ctrlBtnText}>{d > 0 ? `+${d}°` : `${d}°`}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Yazı X */}
              <View style={styles.controlRow}>
                <Text style={styles.axisLabel}>✎ Yazı ↔</Text>
                {[-20, -5, 5, 20].map(d => (
                  <Pressable
                    key={d}
                    style={styles.ctrlBtn}
                    onPress={() => updateLabelOffset(editPos.id, d, 0)}
                  >
                    <Text style={styles.ctrlBtnText}>{d > 0 ? `+${d}` : d}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Yazı Y */}
              <View style={styles.controlRow}>
                <Text style={styles.axisLabel}>✎ Yazı ↕</Text>
                {[-20, -5, 5, 20].map(d => (
                  <Pressable
                    key={d}
                    style={styles.ctrlBtn}
                    onPress={() => updateLabelOffset(editPos.id, 0, d)}
                  >
                    <Text style={styles.ctrlBtnText}>{d > 0 ? `+${d}` : d}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.editorHint}>Bir binaya dokun veya yukarıdan seç</Text>
          )}

          <Pressable style={styles.exportBtn} onPress={exportPositions}>
            <Text style={styles.exportBtnText}>
              {copyMsg || '📋 Konumları Kopyala (Clipboard)'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Oyun slide-up paneli ─────────────────────────────── */}
      {!editMode && selectedId && selectedBuilding && buildingDef && (
        <Animated.View
          style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}
        >
          <View style={styles.panelHandle}>
            <View style={styles.handleBar} />
          </View>
          <Pressable onPress={closePanel} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>

          <View style={styles.panelHeader}>
            <View style={[styles.panelTitleBlock, { paddingRight: 40 }]}>
              <Text style={styles.panelName}>{t(`buildings.${selectedId}.name`)}</Text>
              <Text style={styles.panelLevel}>
                {t('base.level', { level: String(selectedBuilding.level), max: String(buildingDef.maxLevel) })}
              </Text>
            </View>
          </View>
          {/* Timer'lar tab içine taşındı */}

          <View style={styles.tabRow}>
            {(
              [
                'overview',
                ...(hasMilUnits ? ['units'] : []),
                ...(selectedId === 'researchLab' ? ['research'] : []),
                ...(selectedId === 'hq' ? ['harekat'] : []),
                // Takas kaldırıldı — mağaza ekranına taşındı
              ] as PanelTab[]
            ).map(tab => {
              const labels: Record<PanelTab, string> = {
                overview: t('base.tabOverview'),
                units: t('base.tabUnits'),
                research: t('base.tabResearch'),
                harekat: t('base.tabHarekat'),
                market: t('base.tabMarket'),
              };
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabBtn, panelTab === tab && styles.tabBtnActive]}
                  onPress={() => setPanelTab(tab)}
                >
                  <Text style={[styles.tabBtnText, panelTab === tab && styles.tabBtnTextActive]}>
                    {labels[tab]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {panelTab === 'overview' && (
              <OverviewTab
                selectedBuilding={selectedBuilding}
                buildingDef={buildingDef}
                buildings={buildings}
                getUpgradeCost={getUpgradeCost}
                getUpgradeTime={getUpgradeTime}
                canUpgradeBuilding={canUpgradeBuilding}
                upgradeBuilding={upgradeBuilding}
                speedUpWithGold={speedUpWithGold}
                calcGoldCost={calcGoldCost}
              />
            )}

            {panelTab === 'units' && (
              <UnitsTab
                selectedBuilding={selectedBuilding}
                unlockedUnits={unlockedUnits}
                getTrainedCount={getTrainedCount}
                getTrainingCost={getTrainingCost}
                getMaxTrainable={getMaxTrainable}
                getBuildingUnitCount={getBuildingUnitCount}
                getUnitCap={getUnitCap}
                canStartTraining={canStartTraining}
                startTraining={startTraining}
                speedUpWithGold={speedUpWithGold}
                calcGoldCost={calcGoldCost}
              />
            )}

            {panelTab === 'research' && (
              <ResearchTab
                selectedBuilding={selectedBuilding}
                availableResearch={availableResearch}
                canStartResearch={canStartResearch}
                startResearch={startResearch}
                speedUpWithGold={speedUpWithGold}
                calcGoldCost={calcGoldCost}
              />
            )}
            {panelTab === 'harekat' && (
              <HarekatTab
                buildings={buildings}
                activeMarch={activeMarch}
                birlikler={birlikler}
                removeBirlik={removeBirlik}
                getTotalTrainedUnits={getTotalTrainedUnits}
                getTotalAttackPower={getTotalAttackPower}
                onCreateBirlik={() => setShowBirlikForm(true)}
              />
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      )}
      {viewReport && (
        <BattleResultModal report={viewReport} onClose={() => setViewReport(null)} />
      )}

      <BirlikModal
        visible={showBirlikForm}
        onClose={() => setShowBirlikForm(false)}
        unitAvailForBirlik={unitAvailForBirlik}
        addBirlik={addBirlik}
        birlikCount={birlikler.length}
      />
    </View>
  );
}

function CostChip({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.costChip}>
      <Text style={styles.costChipIcon}>{icon}</Text>
      <Text style={styles.costChipVal}>{value}</Text>
    </View>
  );
}

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.stepBtn} onPress={onPress}>
      <Text style={styles.stepBtnText}>{label}</Text>
    </Pressable>
  );
}

