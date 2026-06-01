import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors } from '@/lib/tokens';

type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface SoftButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const SIZES = {
  sm: { height: 36, paddingHorizontal: 14, fontSize: 14 },
  md: { height: 48, paddingHorizontal: 18, fontSize: 15 },
  lg: { height: 54, paddingHorizontal: 22, fontSize: 16 },
};

export function SoftButton({
  children,
  variant = 'outline',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  onPress,
  style,
}: SoftButtonProps) {
  const sz = SIZES[size];

  const bg =
    variant === 'primary' ? colors.sage :
    variant === 'accent'  ? colors.terracotta :
    variant === 'ghost'   ? 'transparent' :
    colors.card;

  const fg =
    variant === 'primary' || variant === 'accent' ? '#fff' : colors.ink;

  const borderColor =
    variant === 'outline' ? colors.hairline : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          height: sz.height,
          paddingHorizontal: sz.paddingHorizontal,
          backgroundColor: bg,
          borderColor,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.label, { fontSize: sz.fontSize, color: fg }]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});
