import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { t } from '../i18n';
import type { March } from '../state/types';

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}dk ${s}sn` : `${s}sn`;
}

export function OutgoingAttackBanner({
  march,
  topOffset = 80,
  onCancel,
}: {
  march: March;
  topOffset?: number;
  onCancel?: () => void;
}) {
  const progress = 1 - march.secondsRemaining / march.totalSeconds;
  const canCancel = march.type === 'attack' && !!onCancel;

  return (
    <View style={[s.container, { top: topOffset }]}>
      <View style={s.row1}>
        <Text style={s.title}>{t('attack.outgoingTitle')}</Text>
        <Text style={s.target}>{march.targetName}</Text>
        <Text style={s.timer}>⏱️ {formatTime(march.secondsRemaining)}</Text>
      </View>
      <View style={s.row2}>
        <Text style={s.detail}>{t('attack.outgoingDetail', { units: String(march.committedUnits), power: String(march.attackPower) })}</Text>
        {canCancel ? (
          <Pressable onPress={onCancel} style={s.cancelBtn}>
            <Text style={s.cancelText}>{t('attack.outgoingCancel')}</Text>
          </Pressable>
        ) : (
          <Text style={s.statusText}>
            {march.type === 'return' ? t('attack.outgoingReturning') : t('attack.outgoingAttacking')}
          </Text>
        )}
      </View>
      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 4,
    right: 4,
    backgroundColor: '#001A0A',
    borderWidth: 1.5,
    borderColor: colors.military,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 998,
    elevation: 9,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  title: {
    color: colors.military,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  target: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  timer: {
    color: colors.military,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  statusText: {
    color: colors.military,
    fontSize: 10,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: colors.danger + '33',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cancelText: {
    color: colors.dangerLight,
    fontSize: 10,
    fontWeight: '700',
  },
  progressBg: {
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.military,
    borderRadius: 2,
  },
});
