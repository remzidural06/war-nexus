import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { t } from '../i18n';
import type { RootTab } from '../../App';

const TAB_KEYS: { key: RootTab; i18n: string; icon: string }[] = [
  { key: 'base', i18n: 'nav.base', icon: '🏰' },
  { key: 'map', i18n: 'nav.map', icon: '🗺️' },
  { key: 'alliance', i18n: 'nav.alliance', icon: '⚔️' },
  { key: 'settings', i18n: 'nav.missions', icon: '📋' },
  { key: 'leaderboard', i18n: 'nav.leaderboard', icon: '🏆' },
  { key: 'shop', i18n: 'nav.shop', icon: '🏪' },
];

interface Props {
  activeTab: RootTab;
  onChange: (tab: RootTab) => void;
}

export function BottomTabs({ activeTab, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {TAB_KEYS.map(tab => {
        const active = tab.key === activeTab;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)}>
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{t(tab.i18n)}</Text>
            {active && <View style={styles.activeLine} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.tabBarBg,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    color: colors.tabInactive,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.tabActive,
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: colors.sand,
    borderRadius: 1,
  },
});
