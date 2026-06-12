/**
 * CategoryIcon — maps icon name strings from design tokens to
 * react-native SVG paths. Uses @expo/vector-icons as a fallback
 * until we add a custom SVG icon set.
 */
import React from 'react';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface CategoryIconProps {
  name: string;
  size?: number;
  color?: string;
}

const ICON_MAP: Record<string, { lib: 'mci' | 'ion'; name: string }> = {
  leaf:    { lib: 'mci', name: 'leaf' },
  pill:    { lib: 'mci', name: 'pill' },
  drop:    { lib: 'mci', name: 'water-outline' },
  moon:    { lib: 'ion', name: 'moon-outline' },
  sun:     { lib: 'ion', name: 'sunny-outline' },
  camera:  { lib: 'ion', name: 'camera-outline' },
  pencil:  { lib: 'ion', name: 'pencil-outline' },
  // utility
  plus:    { lib: 'ion', name: 'add' },
  home:    { lib: 'ion', name: 'home-outline' },
  chart:   { lib: 'ion', name: 'stats-chart-outline' },
  gear:    { lib: 'ion', name: 'settings-outline' },
  bell:    { lib: 'ion', name: 'notifications-outline' },
  search:  { lib: 'ion', name: 'search-outline' },
  filter:  { lib: 'ion', name: 'filter-outline' },
  chevR:   { lib: 'ion', name: 'chevron-forward' },
  chevL:   { lib: 'ion', name: 'chevron-back' },
  chevD:   { lib: 'ion', name: 'chevron-down' },
  close:   { lib: 'ion', name: 'close' },
  check:   { lib: 'ion', name: 'checkmark' },
  user:    { lib: 'ion', name: 'person-outline' },
  users:   { lib: 'ion', name: 'people-outline' },
  link:    { lib: 'ion', name: 'link-outline' },
  spark:   { lib: 'ion', name: 'sparkles-outline' },
  calendar:{ lib: 'ion', name: 'calendar-outline' },
  trash:   { lib: 'ion', name: 'trash-outline' },
  swap:    { lib: 'mci', name: 'swap-horizontal' },
  scratch: { lib: 'mci', name: 'texture' },
  barcode: { lib: 'mci', name: 'barcode-scan' },
  repeat:  { lib: 'ion', name: 'repeat-outline' },
  image:   { lib: 'ion', name: 'image-outline' },
  weather: { lib: 'ion', name: 'partly-sunny-outline' },
  warning: { lib: 'ion', name: 'warning-outline' },
};

export function CategoryIcon({ name, size = 24, color = '#2D2A24' }: CategoryIconProps) {
  const entry = ICON_MAP[name];
  if (!entry) return null;

  if (entry.lib === 'mci') {
    return <MaterialCommunityIcons name={entry.name as any} size={size} color={color} />;
  }
  return <Ionicons name={entry.name as any} size={size} color={color} />;
}
