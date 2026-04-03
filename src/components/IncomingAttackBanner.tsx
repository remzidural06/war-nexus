import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { IncomingAttack } from '../state/types';
import { t } from '../i18n';

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}dk ${s}sn` : `${s}sn`;
}

export function IncomingAttackBanner({ attack, totalDefenders }: { attack: IncomingAttack; totalDefenders: number }) {
  const progress = 1 - attack.secondsRemaining / attack.totalSeconds;

  return (
    <View style={s.container}>
      <View style={s.row1}>
        <Text style={s.title}>⚠️ SALDIRI</Text>
        <Text style={s.attacker}>{attack.attackerName}</Text>
        <Text style={s.timer}>⏱️ {formatTime(attack.secondsRemaining)}</Text>
      </View>
      <View style={s.row2}>
        <Text style={s.detail}>🪖 {attack.unitCount} birim · ⚔️ Saldırıda</Text>
        {totalDefenders > 0
          ? <Text style={s.readyText}>🛡️ {totalDefenders} Savunucu</Text>
          : <Text style={s.warningText}>🚨 Savunma Yok!</Text>
        }
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
    backgroundColor: '#1A0000',
    borderWidth: 1.5,
    borderColor: '#B71C1C',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 999,
    elevation: 10,
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
    color: '#FF5252',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  attacker: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  timer: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  warningText: {
    color: '#FF8A80',
    fontSize: 10,
    fontWeight: '800',
  },
  readyText: {
    color: '#4CAF50',
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
    backgroundColor: '#FF5252',
    borderRadius: 2,
  },
});
