// Desert Operations military color palette
export const colors = {
  // Backgrounds
  background: '#0D0D0A',
  surface: '#1A1A14',
  surfaceAlt: '#222218',
  panel: '#1E1E16',
  panelBorder: '#3A3A2A',

  // Military accent colors
  sand: '#C8A84B',
  sandDark: '#A88A35',
  sandLight: '#E0C070',
  military: '#4A6741',
  militaryDark: '#2E4228',
  militaryLight: '#6A8A60',
  metal: '#8A8A7A',
  metalDark: '#5A5A4A',
  metalLight: '#AAAAAA',

  // Resources
  cash: '#C8A84B',   // gold
  oil: '#4A7A8A',    // dark teal
  ore: '#7A5A4A',    // rust brown
  gold: '#FFD700',   // premium gold

  // Status
  success: '#4A8A4A',
  warning: '#B8901A',
  danger: '#8A2A2A',
  dangerLight: '#C84040',
  info: '#4A6A8A',

  // Text
  textPrimary: '#E8E0C8',
  textSecondary: '#9A9080',
  textMuted: '#5A5548',
  textOnDark: '#FFFFFF',

  // Difficulty
  easy: '#4A8A4A',
  medium: '#C8A84B',
  hard: '#B84A20',
  elite: '#8A2A8A',

  // Units / branches
  infantry: '#4A6741',
  armor: '#6A5A30',
  air: '#2A4A6A',
  naval: '#1A4A5A',

  // UI elements
  buttonPrimary: '#4A6741',
  buttonPrimaryBorder: '#6A8A60',
  buttonDanger: '#6A2020',
  buttonDangerBorder: '#8A3030',
  buttonDisabled: '#2A2A22',
  buttonDisabledText: '#4A4A3A',

  // Tab bar
  tabActive: '#C8A84B',
  tabInactive: '#5A5548',
  tabBarBg: '#111110',
  tabBarBorder: '#2A2A20',

  // Overlays
  overlay: 'rgba(0,0,0,0.75)',
  overlayLight: 'rgba(0,0,0,0.5)',
} as const;

export type ColorKey = keyof typeof colors;
