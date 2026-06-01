import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { categories, type CategoryKey, colors } from '@/lib/tokens';
import { CategoryIcon } from './icons/CategoryIcon';

interface CategoryChipProps {
  cat: CategoryKey;
  selected?: boolean;
  dense?: boolean;
  onPress?: () => void;
}

export function CategoryChip({ cat, selected = false, dense = false, onPress }: CategoryChipProps) {
  const meta = categories[cat];
  const height = dense ? 32 : 36;
  const px = dense ? 10 : 12;
  const iconSize = dense ? 15 : 16;
  const fontSize = dense ? 13 : 14;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          height,
          paddingHorizontal: px,
          backgroundColor: selected ? colors.ink : meta.tint,
        },
      ]}
    >
      <CategoryIcon name={meta.icon} size={iconSize} color={selected ? '#fff' : meta.ink} />
      <Text style={[styles.label, { fontSize, color: selected ? '#fff' : meta.ink }]}>
        {meta.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
  },
  label: {
    fontWeight: '500',
  },
});
