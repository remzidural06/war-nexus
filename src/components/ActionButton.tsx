import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
  style?: ViewStyle;
}

export function ActionButton({ label, onPress, disabled, variant = 'primary', style }: Props) {
  const bg =
    disabled
      ? colors.buttonDisabled
      : variant === 'danger'
      ? colors.buttonDanger
      : variant === 'secondary'
      ? colors.surfaceAlt
      : colors.buttonPrimary;

  const border =
    disabled
      ? colors.metalDark
      : variant === 'danger'
      ? colors.buttonDangerBorder
      : variant === 'secondary'
      ? colors.panelBorder
      : colors.buttonPrimaryBorder;

  const textColor = disabled ? colors.buttonDisabledText : colors.textPrimary;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border },
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
