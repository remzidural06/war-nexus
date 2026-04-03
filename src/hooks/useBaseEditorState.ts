import { useState, useCallback } from 'react';
import { Clipboard } from 'react-native';
import {
  CANVAS_W, CANVAS_H, HOTSPOT, INITIAL_POSITIONS,
  type HotspotPos,
} from '../screens/BaseScreen.constants';
import type { BuildingId } from '../state/types';

export function useBaseEditorState() {
  const [editMode, setEditMode] = useState(false);
  const [positions, setPositions] = useState<HotspotPos[]>(INITIAL_POSITIONS);
  const [editTarget, setEditTarget] = useState<BuildingId | null>(null);
  const [copyMsg, setCopyMsg] = useState('');

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
          ? { ...p, w: Math.max(20, p.w + dw), h: Math.max(20, p.h + dh) }
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

  const toggleEditMode = useCallback(() => {
    setEditMode(e => !e);
    setEditTarget(null);
  }, []);

  const editPos = positions.find(p => p.id === editTarget);

  return {
    editMode,
    setEditMode,
    toggleEditMode,
    positions,
    editTarget,
    setEditTarget,
    copyMsg,
    editPos,
    handleDragEnd,
    updatePos,
    updateSize,
    updateRot,
    updateLabelOffset,
    exportPositions,
  };
}
