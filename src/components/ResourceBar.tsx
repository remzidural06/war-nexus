import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatNumber } from '../utils/formatters';
import { useDesertGame } from '../state/DesertGameContext';

const RESOURCE_COLORS: Record<string, string> = {
  cash: colors.cash,
  oil: colors.oil,
  ammo: colors.metal,
  gold: '#FFD700',
};

export function ResourceBar() {
  const { resources, playerPower } = useDesertGame();

  return (
    <View style={styles.bar}>
      {resources.map(r => {
        const isGold = r.key === 'gold';
        const pct = Math.min(1, r.amount / r.capacity);
        const fillColor = pct >= 0.9
          ? colors.danger
          : pct >= 0.6
          ? colors.sand
          : colors.military;
        return (
          <View key={r.key} style={styles.chip}>
            <Text style={styles.icon}>{r.icon}</Text>
            <View style={styles.textCol}>
              <Text style={[styles.amount, { color: RESOURCE_COLORS[r.key] ?? colors.textPrimary }]}>
                {formatNumber(r.amount)}
              </Text>
              {!isGold && (
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: fillColor }]} />
                </View>
              )}
            </View>
          </View>
        );
      })}
      <View style={styles.chip}>
        <Text style={styles.icon}>⚡</Text>
        <Text style={[styles.amount, { color: '#00BFFF' }]}>{formatNumber(playerPower)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: { fontSize: 14 },
  textCol: { gap: 2 },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: 60,
    height: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
