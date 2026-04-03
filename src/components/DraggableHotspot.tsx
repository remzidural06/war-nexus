import React, { useRef, useEffect, useCallback } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { styles } from '../screens/BaseScreen.styles';
import { t } from '../i18n';
import type { BuildingId, BuildingState } from '../state/types';
import type { HotspotPos } from '../screens/BaseScreen.constants';

function getBuildingLabel(id: string): string {
  return t(`buildings.${id}.name`);
}

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

export function DraggableHotspot({
  hs,
  editMode,
  isEditTarget,
  selected,
  building,
  onSelect,
  onDragEnd,
  onGamePress,
}: DraggableHotspotProps) {
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
      {!editMode && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handlePress}
        />
      )}

      {isEditTarget && <View style={styles.glowRing} />}

      {busy && <View style={styles.busyDot} />}

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
