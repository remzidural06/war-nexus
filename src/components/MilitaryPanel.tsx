import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
}

export function MilitaryPanel({ title, children, style, accent }: Props) {
  return (
    <View style={[styles.panel, accent && styles.panelAccent, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <View style={styles.titleBar} />
          <Text style={styles.title}>{title.toUpperCase()}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  panelAccent: {
    borderColor: colors.sand,
    borderWidth: 1.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleBar: {
    width: 3,
    height: 14,
    backgroundColor: colors.sand,
    marginRight: 8,
    borderRadius: 2,
  },
  title: {
    color: colors.sand,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
