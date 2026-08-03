import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { COLORS } from '@constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
}: ButtonProps) {
  const variantStyle = styles[variant];
  const sizeStyle = sizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.base, variantStyle, sizeStyle, disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? COLORS.ink[950] : COLORS.gold[300]} />
      ) : (
        <Text style={[textStyles.base, textStyles[variant], sizeStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const sizes = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  md: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, borderRadius: 14 },
} as const;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  primary: {
      backgroundColor: COLORS.gold[400],
    } as ViewStyle,
  secondary: {
      backgroundColor: COLORS.surfaceElevated,
    } as ViewStyle,
  ghost: {} as ViewStyle,
  outline: {
      borderWidth: 1,
      borderColor: COLORS.gold[500],
    } as ViewStyle,
  disabled: {
      opacity: 0.4,
    } as ViewStyle,
});

const textStyles = StyleSheet.create({
  base: {
    fontWeight: '600',
  } as TextStyle,
  primary: { color: COLORS.ink[950] } as TextStyle,
  secondary: { color: COLORS.ink[50] } as TextStyle,
  ghost: { color: COLORS.gold[300] } as TextStyle,
  outline: { color: COLORS.gold[300] } as TextStyle,
});
