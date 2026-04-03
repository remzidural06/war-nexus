import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatDuration } from '../utils/formatters';

interface Props {
  seconds: number;
  label?: string;
  total?: number;
  goldCost?: number;
  onSpeedUp?: () => void;
}

export function CountdownTimer({ seconds, label, total, goldCost, onSpeedUp }: Props) {
  const progress = total && total > 0 ? 1 - seconds / total : 0;
  const pct = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Text style={styles.time}>{formatDuration(seconds)}</Text>
        {onSpeedUp && goldCost != null && goldCost > 0 && (
          <Pressable style={styles.speedBtn} onPress={onSpeedUp}>
            <Text style={styles.speedText}>🪙 {goldCost} Hızlandır</Text>
          </Pressable>
        )}
      </View>
      {total && total > 0 ? (
        <View style={styles.barContainer}>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.barPct}>%{pct}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    alignItems: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  time: {
    color: colors.sand,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  speedBtn: {
    backgroundColor: '#5C4800',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  speedText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 6,
  },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  barPct: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
  },
});
