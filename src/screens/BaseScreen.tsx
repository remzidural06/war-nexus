import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Clipboard,
  Image,
  Modal,
  PanResponder,
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
import { formatNumber, formatDuration } from '../utils/formatters';
import { BUILDING_DEFINITIONS } from '../data/buildings';
import { getUnitsForBuilding, UNIT_MAP } from '../data/units';
import type { BuildingId, BuildingState, UnitDefinition, ResearchNode, MapTarget, MarchUnit, BattleReport, Birlik, BirlikSlot } from '../state/types';
import { BattleResultModal } from '../components/BattleResultModal';
import { styles } from './BaseScreen.styles';
import {
  CANVAS_W, CANVAS_H, INITIAL_POSITIONS, BUILDING_BRANCHES,
  DIFFICULTY_COLORS_HQ, DIFFICULTY_LABELS_HQ_KEYS,
  hqWinChance, hqWinColor,
  type HotspotPos,
} from './BaseScreen.constants';

const _baseScene = require('../assets/base/terrain/base_scene.jpg');

function getBuildingLabel(id: string): string {
  return t(`buildings.${id}.name`);
}

// ─── Draggable Hotspot ────────────────────────────────────────
interface DraggableHotspotProps {
  hs: HotspotPos;
  editMode: boolean;
  isEditTarget: boolean;
  selected: boolean;
  building: BuildingState | undefined;
  onSelect: (id: BuildingId) => void;
  onDragEnd: (id: BuildingId, dx: number, dy: number) => void;
  onGamePress: (id: BuildingId) => void;
}

function DraggableHotspot({
  hs,
  editMode,
  isEditTarget,
  selected,
  building,
  onSelect,
  onDragEnd,
  onGamePress,
}: DraggableHotspotProps) {
  // Refs so PanResponder (created once) always sees latest values
  const editModeRef = useRef(editMode);
  const onSelectRef = useRef(onSelect);
  const onDragEndRef = useRef(onDragEnd);
  const onGamePressRef = useRef(onGamePress);
  const hsRef = useRef(hs);

  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onDragEndRef.current = onDragEnd; }, [onDragEnd]);
  useEffect(() => { onGamePressRef.current = onGamePress; }, [onGamePress]);
  useEffect(() => { hsRef.current = hs; }, [hs]);

  const pan = useRef(new Animated.ValueXY()).current;
  const hasMoved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editModeRef.current,
      onMoveShouldSetPanResponder: (_, g) =>
        editModeRef.current && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
      onPanResponderGrant: () => {
        hasMoved.current = false;
        pan.setValue({ x: 0, y: 0 });
        onSelectRef.current(hsRef.current.id);
      },
      onPanResponderMove: (_, g) => {
        hasMoved.current = true;
        pan.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_, g) => {
        if (hasMoved.current) {
          onDragEndRef.current(hsRef.current.id, Math.round(g.dx), Math.round(g.dy));
        }
        pan.setValue({ x: 0, y: 0 });
      },
    })
  ).current;

  const busy =
    building &&
    (building.isUpgrading ||
      building.researchSecondsRemaining > 0 ||
      building.trainingQueue.length > 0);

  const labelBounce = useRef(new Animated.Value(1)).current;
  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(labelBounce, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(labelBounce, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    onGamePressRef.current(hs.id);
  }, [hs.id, labelBounce]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.hotspot,
        {
          left: hs.x - hs.w / 2,
          top: hs.y - hs.h / 2,
          width: hs.w,
          height: hs.h,
          transform: [
            { rotate: `${hs.rotation}deg` },
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
        editMode && styles.hotspotEdit,
        isEditTarget && styles.hotspotEditTarget,
      ]}
    >
      {/* Tap handler only active in game mode */}
      {!editMode && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handlePress}
        />
      )}

      {isEditTarget && <View style={styles.glowRing} />}

      {busy && <View style={styles.busyDot} />}

      {/* TEMP: bina etiketleri geçici olarak gizlendi */}
      {false && <Animated.View
        style={[
          styles.hotspotLabelBox,
          { marginLeft: -90 + (hs.labelX ?? 0), bottom: -20 + (hs.labelY ?? 0) },
          { transform: [{ rotate: `${-hs.rotation}deg` }, { scale: labelBounce }] },
        ]}
      >
        <Pressable onPress={!editMode ? handlePress : undefined}>
          <Text
            numberOfLines={1}
            style={[
              styles.hotspotLabel,
              editMode && styles.hotspotLabelEdit,
              selected && styles.hotspotLabelSelected,
            ]}
          >
            {getBuildingLabel(hs.id)}
          </Text>
        </Pressable>
      </Animated.View>}
    </Animated.View>
  );
}

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
  const [selectedUnit, setSelectedUnit] = useState<UnitDefinition | null>(null);
  const [trainQty, setTrainQty] = useState(1);
  const [selectedResearch, setSelectedResearch] = useState<ResearchNode | null>(null);
  const [researchBranchTab, setResearchBranchTab] = useState<string>('land');
  const [hqCommitted, setHqCommitted] = useState(1);
  const [hqTarget, setHqTarget] = useState<MapTarget | null>(null);
  // Birlik state (birlikler context'ten geliyor)
  const [selectedBirlikIds, setSelectedBirlikIds] = useState<Set<string>>(new Set());
  const [showBirlikForm, setShowBirlikForm] = useState(false);
  const [viewReport, setViewReport] = useState<BattleReport | null>(null);
  const [newBirlikName, setNewBirlikName] = useState('');
  const [newBirlikSlots, setNewBirlikSlots] = useState<Record<string, number>>({});
  const panelAnim = useRef(new Animated.Value(0)).current;

  // ── Editör state ─────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [positions, setPositions] = useState<HotspotPos[]>(INITIAL_POSITIONS);
  const [editTarget, setEditTarget] = useState<BuildingId | null>(null);
  const [copyMsg, setCopyMsg] = useState('');

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
    setSelectedUnit(null);
    setTrainQty(1);
    setSelectedResearch(null);
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
  const trainCost = useMemo(
    () => (selectedUnit ? getTrainingCost(selectedUnit.id, trainQty) : null),
    [selectedUnit, trainQty, getTrainingCost],
  );
  const hasMilUnits = buildingDef?.researchBranch !== undefined;

  // ── Editör fonksiyonları ─────────────────────────────────────
  const handleDragEnd = useCallback((id: BuildingId, dx: number, dy: number) => {
    setPositions(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              x: Math.max(HOTSPOT / 2, Math.min(CANVAS_W - HOTSPOT / 2, p.x + dx)),
              y: Math.max(HOTSPOT / 2, Math.min(CANVAS_H - HOTSPOT / 2, p.y + dy)),
            }
          : p,
      ),
    );
  }, []);

  const updatePos = useCallback((id: BuildingId, dx: number, dy: number) => {
    setPositions(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              x: Math.max(HOTSPOT / 2, Math.min(CANVAS_W - HOTSPOT / 2, p.x + dx)),
              y: Math.max(HOTSPOT / 2, Math.min(CANVAS_H - HOTSPOT / 2, p.y + dy)),
            }
          : p,
      ),
    );
  }, []);

  const updateSize = useCallback((id: BuildingId, dw: number, dh: number) => {
    setPositions(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              w: Math.max(20, p.w + dw),
              h: Math.max(20, p.h + dh),
            }
          : p,
      ),
    );
  }, []);

  const updateRot = useCallback((id: BuildingId, delta: number) => {
    setPositions(prev =>
      prev.map(p =>
        p.id === id ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p,
      ),
    );
  }, []);

  const updateLabelOffset = useCallback((id: BuildingId, dx: number, dy: number) => {
    setPositions(prev =>
      prev.map(p =>
        p.id === id ? { ...p, labelX: (p.labelX ?? 0) + dx, labelY: (p.labelY ?? 0) + dy } : p,
      ),
    );
  }, []);

  const exportPositions = useCallback(() => {
    const lines = positions
      .map(p => {
        const lx = p.labelX ?? 0;
        const ly = p.labelY ?? 0;
        const labelPart = (lx !== 0 || ly !== 0) ? `, labelX: ${lx}, labelY: ${ly}` : '';
        return `  { id: '${p.id}', x: ${p.x}, y: ${p.y}, w: ${p.w}, h: ${p.h}, rotation: ${p.rotation}${labelPart} },`;
      })
      .join('\n');
    const output = `const INITIAL_POSITIONS: HotspotPos[] = [\n${lines}\n];`;
    console.log(output);
    Clipboard.setString(output);
    setCopyMsg('Kopyalandı!');
    setTimeout(() => setCopyMsg(''), 2000);
  }, [positions]);

  const editPos = positions.find(p => p.id === editTarget);

  return (
    <View style={styles.root}>
      {/* ── Editör toggle butonu ────────────────────────────── */}
      <Pressable
        style={[styles.editToggle, editMode && styles.editToggleActive]}
        onPress={() => {
          setEditMode(e => !e);
          setEditTarget(null);
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
                  onPress={() => {
                    setPanelTab(tab);
                    setSelectedUnit(null);
                    setSelectedResearch(null);
                  }}
                >
                  <Text style={[styles.tabBtnText, panelTab === tab && styles.tabBtnTextActive]}>
                    {labels[tab]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {panelTab === 'overview' &&
              (() => {
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
                    {/* Üretim bilgisi (economy binalar) */}
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
                    {/* Sonraki seviyede açılacaklar */}
                    {selectedBuilding.level < buildingDef.maxLevel && (() => {
                      const currentLv = selectedBuilding.level;
                      const currentUnits = getUnitsForBuilding(selectedBuilding.id, currentLv);

                      // Bir sonraki anlamlı kilit seviyesini bul
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
                          {/* Üretim / savunma / faiz bonusları — her seviyede */}
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
                          {/* Birim kilitleri */}
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
                                  <Text style={styles.nextLevelText}>{t(`units.${u.id}.name`) !== `units.${u.id}.name` ? t(`units.${u.id}.name`) : u.label}</Text>
                                  {isNext
                                    ? <Text style={styles.nextLevelBadge}>Yeni</Text>
                                    : <Text style={styles.nextLevelBadgeFar}>Lv.{milestoneLv}</Text>
                                  }
                                </View>
                              ))}
                            </>
                          )}
                          {/* Hiçbir şey yoksa */}
                          {prodIncrease === null && !buildingDef.lossReductionPerLevel && !buildingDef.interestRatePerLevel && milestoneUnits.length === 0 && (
                            <View style={styles.nextLevelRow}>
                              <Text style={styles.nextLevelIcon}>⚡</Text>
                              <Text style={styles.nextLevelText}>Bina kapasitesi ve eğitim hızı artar</Text>
                            </View>
                          )}
                        </View>
                      );
                    })()}
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
                                <Text style={styles.trainedId}>{t(`units.${uid}.name`) !== `units.${uid}.name` ? t(`units.${uid}.name`) : (unitDef?.label ?? uid)}</Text>
                                <Text style={styles.trainedCount}>×{cnt}</Text>
                              </View>
                            );
                          })}
                      </View>
                    )}
                  </View>
                );
              })()}

            {panelTab === 'units' && (
              <View>
                {/* Eğitim timer — devam ediyorsa göster */}
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
                {/* Bina Bazlı Birim Kapasitesi Gösterimi */}
                {(() => {
                  const buildingUnits = getBuildingUnitCount(selectedBuilding.id);
                  const cap = getUnitCap();
                  const isFull = buildingUnits >= cap;
                  const BUILDING_LABELS_I18N: Record<string, string> = {
                    barracks: 'common.land', tankFactory: 'common.land', airport: 'common.air',
                    shipyard: 'common.sea', defenseTower: 'common.defense', hq: 'common.defense',
                  };
                  const label = t(BUILDING_LABELS_I18N[selectedBuilding.id] ?? 'common.units');
                  return (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isFull ? '#4a1c1c' : '#1a2a1a', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                      <Text style={{ color: isFull ? '#ff6b6b' : '#8bc34a', fontWeight: 'bold', fontSize: 13 }}>
                        {t('base.capacityLabel', { label })}
                      </Text>
                      <Text style={{ color: isFull ? '#ff6b6b' : '#ccc', fontWeight: 'bold', fontSize: 13 }}>
                        {buildingUnits} / {cap}
                      </Text>
                    </View>
                  );
                })()}
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
                            <UnitImage
                              unitId={unit.id}
                              uri={unit.imageUri}
                              icon={unit.icon}
                              style={styles.unitCardBanner}
                              banner
                            />
                          )}
                          <View style={styles.unitCardRow}>
                            {!isSel ? (
                              unit.imageUri ? (
                                <UnitImage
                                  unitId={unit.id}
                                  uri={unit.imageUri}
                                  icon={unit.icon}
                                  style={styles.unitCardThumb}
                                />
                              ) : (
                                <Text style={styles.unitCardIcon}>{unit.icon}</Text>
                              )
                            ) : null}
                            <View style={styles.unitCardInfo}>
                              <Text style={styles.unitCardName}>{t(`units.${unit.id}.name`) !== `units.${unit.id}.name` ? t(`units.${unit.id}.name`) : unit.label}</Text>
                              <Text style={styles.unitCardStat}>
                                ATK {unit.attackPower} · DEF {unit.defensePower}
                              </Text>
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
                                  💵{formatNumber(trainCost.cash)} 🛢️{formatNumber(trainCost.oil)}{' '}
                                  ⛏️{formatNumber(trainCost.ore)}
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
            )}

            {panelTab === 'research' && (() => {
              const branchTabs: { key: string; label: string }[] = [
                { key: 'land',     label: t('common.land') },
                { key: 'air',      label: t('common.air') },
                { key: 'naval',    label: t('common.sea') },
                { key: 'defense',  label: t('common.defense') },
              ];
              const filteredResearch = availableResearch.filter(n => n.branch === researchBranchTab);
              return (
                <View>
                  {/* Alt sekmeler */}
                  <View style={styles.researchBranchRow}>
                    {branchTabs.map(bt => (
                      <Pressable
                        key={bt.key}
                        onPress={() => { setResearchBranchTab(bt.key); setSelectedResearch(null); }}
                        style={[
                          styles.researchBranchBtn,
                          researchBranchTab === bt.key && styles.researchBranchBtnActive,
                        ]}
                      >
                        <Text style={[
                          styles.researchBranchLabel,
                          researchBranchTab === bt.key && styles.researchBranchLabelActive,
                        ]}>
                          {bt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {/* Araştırma timer — devam ediyorsa göster */}
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
                  {/* Araştırma listesi */}
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
                        <Pressable
                          key={node.id}
                          onPress={() => setSelectedResearch(isSel ? null : node)}
                        >
                          <View style={[styles.researchCard, isSel && styles.researchCardSelected]}>
                            <Text style={styles.researchName}>{node.label}</Text>{/* research labels stay as-is — no i18n keys for research nodes */}
                            <Text style={styles.researchDesc}>{node.description}</Text>
                            <View style={styles.costRow}>
                              {node.costCash > 0 && (
                                <CostChip icon="💵" value={formatNumber(node.costCash)} />
                              )}
                              {node.costOil > 0 && (
                                <CostChip icon="🛢️" value={formatNumber(node.costOil)} />
                              )}
                              {node.costOre > 0 && (
                                <CostChip icon="⛏️" value={formatNumber(node.costOre)} />
                              )}
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
            })()}
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

