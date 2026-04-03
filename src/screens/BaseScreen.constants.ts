import { Dimensions } from 'react-native';
import type { BuildingId } from '../state/types';

// ─── Canvas — ekran genişliğine uniform ölçekle ───────────────
const _rawW = Dimensions.get('window').width;
// eslint-disable-next-line no-restricted-globals
const _clampW = _rawW > 0 ? _rawW : (typeof globalThis !== 'undefined' && (globalThis as any).innerWidth ? (globalThis as any).innerWidth : 380);
export const SCREEN_W = Math.min(_clampW, 430);
export const _S = SCREEN_W / 380;
export const CANVAS_W = SCREEN_W;
export const CANVAS_H = Math.round(680 * _S);
export const HOTSPOT = Math.round(64 * _S);
export const PANEL_H = 320;

export interface HotspotPos {
  id: BuildingId;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  labelX?: number;
  labelY?: number;
}

// ─── Android konumları ────────────────────────────────────────
export const ANDROID_POSITIONS: HotspotPos[] = [
  { id: 'hq',           x: 112,               y: 78,  w: 188, h: 113, rotation: 345, labelX: 0,   labelY: 60 },
  { id: 'barracks',     x: 298,               y: 114, w: 134, h: 107, rotation: 30,  labelX: -10, labelY: 60 },
  { id: 'tankFactory',  x: 226,               y: 221, w: 96,  h: 130, rotation: 35,  labelX: 0,   labelY: 80 },
  { id: 'airport',      x: 332,               y: 285, w: 86,  h: 210, rotation: 40,  labelX: 0,   labelY: 115 },
  { id: 'shipyard',     x: 286,               y: 452, w: 123, h: 86,  rotation: 35,  labelX: 0,   labelY: 60 },
  { id: 'oilField',     x: 104,               y: 584, w: 123, h: 91,  rotation: 30,  labelX: -5,  labelY: 60 },
  { id: 'mine',         x: 61,                y: 253, w: 123, h: 145, rotation: 0,   labelX: 0,   labelY: 65 },
  { id: 'bank',         x: 91,                y: 422, w: 42,  h: 102, rotation: 0,   labelX: 0,   labelY: 40 },
  { id: 'researchLab',  x: 161,               y: 384, w: 80,  h: 80,  rotation: 0,   labelX: 0,   labelY: 75 },
  { id: 'defenseTower', x: 351.92857142857144, y: 686, w: 134, h: 139, rotation: 45, labelX: -15, labelY: 90 },
  { id: 'radar',        x: 218,               y: 538, w: 68,  h: 53,  rotation: 40,  labelX: -5,  labelY: 35 },
  { id: 'houses',       x: 143,               y: 482, w: 81,  h: 87,  rotation: 40,  labelX: 0,   labelY: 55 },
];

// ─── Web konumları ───────────────────────────────────────────
export const WEB_POSITIONS: HotspotPos[] = [
  { id: 'hq',           x: 114,               y: 82,  w: 188, h: 113, rotation: 345, labelX: 0,   labelY: 60 },
  { id: 'barracks',     x: 304,               y: 117, w: 134, h: 107, rotation: 30,  labelX: -10, labelY: 60 },
  { id: 'tankFactory',  x: 226,               y: 225, w: 96,  h: 130, rotation: 35,  labelX: 0,   labelY: 80 },
  { id: 'airport',      x: 347,               y: 308, w: 86,  h: 210, rotation: 40,  labelX: 0,   labelY: 115 },
  { id: 'shipyard',     x: 286,               y: 452, w: 123, h: 86,  rotation: 35,  labelX: 0,   labelY: 60 },
  { id: 'oilField',     x: 110,               y: 610, w: 123, h: 91,  rotation: 30,  labelX: -5,  labelY: 60 },
  { id: 'mine',         x: 67,                y: 259, w: 123, h: 145, rotation: 0,   labelX: 0,   labelY: 65 },
  { id: 'bank',         x: 93,                y: 423, w: 42,  h: 102, rotation: 0,   labelX: 0,   labelY: 40 },
  { id: 'researchLab',  x: 166,               y: 389, w: 80,  h: 80,  rotation: 0,   labelX: 0,   labelY: 75 },
  { id: 'defenseTower', x: 370.92857142857144, y: 703, w: 134, h: 139, rotation: 45, labelX: -15, labelY: 90 },
  { id: 'radar',        x: 226,               y: 560, w: 68,  h: 53,  rotation: 40,  labelX: -5,  labelY: 35 },
  { id: 'houses',       x: 152,               y: 501, w: 81,  h: 87,  rotation: 40,  labelX: 0,   labelY: 55 },
];

export const IS_WEB = typeof (globalThis as any).document !== 'undefined' && typeof (globalThis as any).navigator !== 'undefined' && /Mozilla|Chrome|Safari/.test((globalThis as any).navigator.userAgent);
export const INITIAL_POSITIONS = IS_WEB ? WEB_POSITIONS : ANDROID_POSITIONS;

// ─── HQ Attack helpers ────────────────────────────────────────
export const BUILDING_BRANCHES = [
  { id: 'barracks',     i18n: 'branches.infantry',   icon: '🪖' },
  { id: 'tankFactory',  i18n: 'branches.armor',      icon: '🛡️' },
  { id: 'airport',      i18n: 'branches.air',        icon: '✈️' },
  { id: 'shipyard',     i18n: 'branches.naval',      icon: '⚓' },
  { id: 'defenseTower', i18n: 'branches.airDefense',  icon: '🎯' },
] as const;

export const DIFFICULTY_COLORS_HQ = { easy: '#4caf50', medium: '#ff9800', hard: '#f44336', elite: '#9c27b0' };
export const DIFFICULTY_LABELS_HQ_KEYS = { easy: 'map.easy', medium: 'map.medium', hard: 'map.hard', elite: 'map.elite' };

export function hqWinChance(atk: number, def: number) { return atk <= 0 ? 0 : Math.round(atk / (atk + def) * 100); }
export function hqWinColor(pct: number) { return pct >= 70 ? '#4caf50' : pct >= 40 ? '#ff9800' : '#f44336'; }
