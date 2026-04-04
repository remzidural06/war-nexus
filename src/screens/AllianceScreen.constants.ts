import { colors } from '../theme/colors';
import { t } from '../i18n';

export const CREATE_COST_GOLD = 500;
export const DONATE_AMOUNTS = [1000, 5000, 10000, 50000];
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export const RANK_INFO: Record<string, { icon: string; color: string }> = {
  leader:   { icon: '🔱', color: colors.sand },
  officer:  { icon: '⭐', color: colors.militaryLight },
  foreign:  { icon: '🌐', color: '#3498db' },
  economy:  { icon: '💰', color: '#f39c12' },
  interior: { icon: '🏛️', color: '#9b59b6' },
  defense:  { icon: '🛡️', color: '#e74c3c' },
  member:   { icon: '•',  color: colors.textSecondary },
};

export const ASSIGNABLE_RANKS = ['officer', 'foreign', 'economy', 'interior', 'defense', 'member'] as const;

export const MEMBER_TAB_KEYS = ['alliance.tabs.members', 'alliance.tabs.donate', 'alliance.tabs.war', 'alliance.tabs.reports', 'alliance.tabs.chat', 'alliance.tabs.settings'];

export function isOnline(lastOnline: number): boolean {
  return Date.now() - lastOnline < ONLINE_THRESHOLD_MS;
}

export function rankLabel(rank: string): string {
  const info = RANK_INFO[rank];
  return info ? `${info.icon} ${t(`alliance.roles.${rank}`)}` : `• ${t('alliance.roles.member')}`;
}

export function rankBadgeColor(rank: string): string {
  return RANK_INFO[rank]?.color ?? colors.textSecondary;
}
