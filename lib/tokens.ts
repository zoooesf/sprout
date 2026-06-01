// Sprout design tokens — ported directly from sprout-system.jsx

export const colors = {
  // Backgrounds
  bgCream: '#F4EFE6',
  bgSage: '#ECEFE2',
  surface: '#FBF8F2',
  card: '#FFFFFF',

  // Text
  ink: '#2D2A24',
  ink70: 'rgba(45,42,36,0.7)',
  muted: '#6E665A',
  faint: '#B5AC9D',
  hairline: '#E5DDD0',
  hairlineSoft: 'rgba(45,42,36,0.08)',

  // Brand greens
  sage: '#6B8E5A',
  sageDeep: '#4F6E42',
  sageSoft: '#E8EFD9',
  sageMid: '#9DB78E',

  // Accents
  terracotta: '#C97A4A',
  terracottaSoft: '#F2D9C8',
  amber: '#D89A4E',
  amberSoft: '#F4E1C5',
  warnInk: '#7A4324',

  // Score gradient stops 1..10 (green → amber → terracotta)
  scoreStops: [
    '#5E8B52', '#7FA378', '#9DB78E', '#B6C58A', '#D7C079',
    '#E0B25A', '#D89A4E', '#D08855', '#C97A4A', '#A85534',
  ] as readonly string[],
} as const;

export const typography = {
  fontFamily: 'System', // DM Sans loaded via expo-font in Phase 2
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
  },
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 36,
} as const;

// Category metadata — each log entry type
export const categories = {
  food: {
    label: 'Food',
    icon: 'leaf',
    tint: '#E8EFD9',
    ink: '#3B5530',
  },
  medication: {
    label: 'Medication',
    icon: 'pill',
    tint: '#EFE4D5',
    ink: '#6E5234',
  },
  cream: {
    label: 'Cream',
    icon: 'drop',
    tint: '#E5E9EE',
    ink: '#3A4B5B',
  },
  sleep: {
    label: 'Sleep',
    icon: 'moon',
    tint: '#E4DEEF',
    ink: '#4A4068',
  },
  checkin: {
    label: 'Check-in',
    icon: 'sun',
    tint: '#F4E1C5',
    ink: '#7A5C20',
  },
  photo: {
    label: 'Photo',
    icon: 'camera',
    tint: '#F2D9C8',
    ink: '#7A4324',
  },
  note: {
    label: 'Note',
    icon: 'pencil',
    tint: '#EEE5D5',
    ink: '#5A4530',
  },
} as const;

export type CategoryKey = keyof typeof categories;

// Score word labels matching the design
export function scoreWord(score: number): string {
  if (score <= 2) return 'feeling great';
  if (score <= 4) return 'pretty calm';
  if (score <= 6) return 'a bit uncomfortable';
  if (score <= 8) return 'flaring';
  return 'a hard day';
}

// Get the gradient stop color for a score 1–10
export function scoreColor(score: number): string {
  const idx = Math.max(0, Math.min(9, score - 1));
  return colors.scoreStops[idx];
}
