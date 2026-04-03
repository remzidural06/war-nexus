import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDesertGame } from '../state/DesertGameContext';
import { t } from '../i18n';
import { ActionButton } from '../components/ActionButton';
import { CountdownTimer } from '../components/CountdownTimer';
import { colors } from '../theme/colors';
import { UnitImage } from '../components/UnitImage';
import { formatNumber } from '../utils/formatters';
import { BUILDING_DEFINITIONS } from '../data/buildings';
import { UNIT_MAP } from '../data/units';
import type { BuildingId, BuildingState, MapTarget, MarchUnit, BattleReport, Birlik, BirlikSlot } from '../state/types';
import { BattleResultModal } from '../components/BattleResultModal';
import { DraggableHotspot } from '../components/DraggableHotspot';
import { OverviewTab } from '../components/panels/OverviewTab';
import { UnitsTab } from '../components/panels/UnitsTab';
import { ResearchTab } from '../components/panels/ResearchTab';
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
  const [selectedBirlikIds, setSelectedBirlikIds] = useState<Set<string>>(new Set());
  const [showBirlikForm, setShowBirlikForm] = useState(false);
  const [viewReport, setViewReport] = useState<BattleReport | null>(null);
  const [newBirlikName, setNewBirlikName] = useState('');
  const [newBirlikSlots, setNewBirlikSlots] = useState<Record<string, number>>({});
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
            {panelTab === 'harekat' && (() => {
              const totalUnits = getTotalTrainedUnits();
              // Birlik or manual committed count
              const selectedBirlikler = birlikler.filter(b => selectedBirlikIds.has(b.id));
              const birlikTotal = selectedBirlikler.reduce((sum, bl) => sum + bl.slots.reduce((a, s) => a + s.count, 0), 0);
              const hasSelectedBirlik = selectedBirlikler.length > 0;
              const safeCommitted = hasSelectedBirlik
                ? birlikTotal
                : 0;
              const atkPower = getTotalAttackPower(safeCommitted);

              // Mevcut eğitilmiş birimler — her birim ayrı satır
              const unitAvail: { unitId: string; buildingId: string; label: string; icon: string; imageUri?: string; avail: number }[] = [];
              BUILDING_BRANCHES.filter(br => br.id !== 'defenseTower').forEach(br => {
                const b = buildings.find(bl => bl.id === br.id);
                if (!b?.trainedUnits) return;
                Object.entries(b.trainedUnits).forEach(([uid, cnt]) => {
                  if (cnt <= 0) return;
                  const def = UNIT_MAP[uid];
                  unitAvail.push({
                    unitId: uid,
                    buildingId: br.id,
                    label: def?.label ?? uid,
                    icon: def?.icon ?? br.icon,
                    imageUri: def?.imageUri,
                    avail: cnt,
                  });
                });
              });

              const unitBreakdown = BUILDING_BRANCHES
                .map(({ id, label, icon }) => {
                  const b = buildings.find(bl => bl.id === id);
                  const count = b?.trainedUnits
                    ? Object.values(b.trainedUnits).reduce((a, v) => a + v, 0)
                    : 0;
                  return { label, icon, count };
                })
                .filter(u => u.count > 0);


              return (
                <View style={styles.harekatContent}>
                  {/* Active march */}
                  {activeMarch && (
                    <View style={styles.hqMarchBox}>
                      <Text style={styles.hqMarchTitle}>🗺️ Aktif Sefer</Text>
                      <Text style={styles.hqMarchTarget}>{activeMarch.targetName}</Text>
                      <CountdownTimer seconds={activeMarch.secondsRemaining} total={activeMarch.totalSeconds} />
                      <Text style={styles.hqMarchSub}>{t('base.marchUnits', { count: String(activeMarch.committedUnits), power: String(activeMarch.attackPower) })}</Text>
                    </View>
                  )}

                  {/* Army status */}
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
                            <Text style={styles.hqChipLabel}>{t(`units.${u.id ?? u.unitId}.name`) !== `units.${u.id ?? u.unitId}.name` ? t(`units.${u.id ?? u.unitId}.name`) : u.label}</Text>
                            <Text style={styles.hqChipCount}>{u.count}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {totalUnits === 0 && (
                      <Text style={styles.emptyText}>{t('base.noTrainedUnits')}</Text>
                    )}
                  </View>

                  {/* ── BİRLİKLERİM ── */}
                  <View style={styles.birlikSection}>
                    <View style={styles.birlikHeader}>
                      <Text style={styles.hqTargetSectionLabel}>{t('base.mySquads', { count: String(birlikler.length) })}</Text>
                      {birlikler.length < 5 && totalUnits > 0 && (
                        <Pressable
                          style={styles.birlikCreateBtn}
                          onPress={() => {
                            setNewBirlikName(t('base.defaultSquadName', { n: String(birlikler.length + 1) }));
                            setNewBirlikSlots({});
                            setShowBirlikForm(true);
                          }}
                        >
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
            })()}

            {/* Takas kaldırıldı — mağaza ekranına taşındı */}

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      )}
      {viewReport && (
        <BattleResultModal report={viewReport} onClose={() => setViewReport(null)} />
      )}

      {/* ── Birlik Oluştur Modal ── */}
      <Modal visible={showBirlikForm} transparent animationType="slide">
        <View style={styles.birlikModalOverlay}>
          <View style={styles.birlikModalPanel}>
            <View style={styles.birlikModalHeader}>
              <Text style={styles.birlikModalTitle}>{t('base.squadCreateTitle')}</Text>
              <Pressable onPress={() => setShowBirlikForm(false)} style={styles.birlikModalClose}>
                <Text style={styles.birlikModalCloseText}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.birlikNameInput}
              value={newBirlikName}
              onChangeText={setNewBirlikName}
              placeholder={t('base.squadNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={20}
            />

            <View style={styles.birlikModalSelectHeader}>
              <Text style={styles.birlikModalSelectLabel}>{t('base.squadSelectHeader')}</Text>
              <Pressable onPress={() => {
                const all: Record<string, number> = {};
                unitAvailForBirlik.forEach(u => { all[u.unitId] = u.avail; });
                setNewBirlikSlots(all);
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
                      <Text style={styles.birlikModalBranchIcon}>{br.icon}</Text>
                      <Text style={styles.birlikModalBranchLabel}>{t(br.i18n)}</Text>
                    </View>
                    {branchUnits.map(u => {
                      const cur = newBirlikSlots[u.unitId] ?? 0;
                      return (
                        <View key={u.unitId} style={styles.birlikModalUnitRow}>
                          <View style={styles.birlikModalUnitInfo}>
                            <UnitImage unitId={u.unitId} uri={u.imageUri} icon={u.icon} style={styles.birlikModalUnitImg} />
                            <View>
                              <Text style={styles.birlikModalUnitName}>{t(`units.${u.unitId}.name`) !== `units.${u.unitId}.name` ? t(`units.${u.unitId}.name`) : u.label}</Text>
                              <Text style={styles.birlikModalUnitAvail}>{t('base.availableLabel', { count: String(u.avail) })}</Text>
                            </View>
                          </View>
                          <View style={styles.birlikModalStepper}>
                            <Pressable style={styles.birlikModalStepBtn} onPress={() => setNewBirlikSlots(p => ({ ...p, [u.unitId]: Math.max(0, (p[u.unitId] ?? 0) - 100) }))}>
                              <Text style={styles.birlikModalStepBtnText}>-100</Text>
                            </Pressable>
                            <Pressable style={styles.birlikModalStepBtn} onPress={() => setNewBirlikSlots(p => ({ ...p, [u.unitId]: Math.max(0, (p[u.unitId] ?? 0) - 10) }))}>
                              <Text style={styles.birlikModalStepBtnText}>-10</Text>
                            </Pressable>
                            <Pressable style={styles.birlikModalStepBtn} onPress={() => setNewBirlikSlots(p => ({ ...p, [u.unitId]: Math.max(0, (p[u.unitId] ?? 0) - 1) }))}>
                              <Text style={styles.birlikModalStepBtnText}>−</Text>
                            </Pressable>
                            <TextInput
                              style={styles.birlikModalStepInput}
                              value={String(cur)}
                              onChangeText={text => {
                                const val = parseInt(text, 10);
                                if (text === '') setNewBirlikSlots(p => ({ ...p, [u.unitId]: 0 }));
                                else if (!isNaN(val)) setNewBirlikSlots(p => ({ ...p, [u.unitId]: Math.min(u.avail, Math.max(0, val)) }));
                              }}
                              keyboardType="numeric"
                              selectTextOnFocus
                            />
                            <Pressable style={styles.birlikModalStepBtn} onPress={() => setNewBirlikSlots(p => ({ ...p, [u.unitId]: Math.min(u.avail, (p[u.unitId] ?? 0) + 1) }))}>
                              <Text style={styles.birlikModalStepBtnText}>+</Text>
                            </Pressable>
                            <Pressable style={styles.birlikModalStepBtn} onPress={() => setNewBirlikSlots(p => ({ ...p, [u.unitId]: Math.min(u.avail, (p[u.unitId] ?? 0) + 10) }))}>
                              <Text style={styles.birlikModalStepBtnText}>+10</Text>
                            </Pressable>
                            <Pressable style={styles.birlikModalStepBtn} onPress={() => setNewBirlikSlots(p => ({ ...p, [u.unitId]: Math.min(u.avail, (p[u.unitId] ?? 0) + 100) }))}>
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
                {t('base.summaryText', { count: String(Object.values(newBirlikSlots).reduce((a, v) => a + v, 0)) })}
              </Text>
            </View>

            <ActionButton
              label={t('base.saveSquad', { count: String(Object.values(newBirlikSlots).reduce((a, v) => a + v, 0)) })}
              disabled={Object.values(newBirlikSlots).reduce((a, v) => a + v, 0) === 0 || !newBirlikName.trim()}
              onPress={() => {
                const total = Object.values(newBirlikSlots).reduce((a, v) => a + v, 0);
                if (total === 0 || !newBirlikName.trim()) return;
                const slots: BirlikSlot[] = unitAvailForBirlik
                  .filter(u => (newBirlikSlots[u.unitId] ?? 0) > 0)
                  .map(u => ({ unitId: u.unitId, buildingId: u.buildingId, icon: u.icon, label: u.label, imageUri: u.imageUri, count: newBirlikSlots[u.unitId]! }));
                const newBl: Birlik = { id: Date.now().toString(), name: newBirlikName.trim(), slots };
                addBirlik(newBl);
                setShowBirlikForm(false);
              }}
            />
            <ActionButton label={t('common.cancel')} onPress={() => setShowBirlikForm(false)} variant="secondary" />
          </View>
        </View>
      </Modal>
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

