import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { scoreColor } from '@/lib/tokens';

interface ScoreDotProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export function ScoreDot({ score, size = 64, showLabel = false }: ScoreDotProps) {
  const color = scoreColor(score);
  const fontSize = Math.round(size * 0.36);

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      >
        <Text style={[styles.number, { fontSize, color: '#fff' }]}>{score}</Text>
      </View>
      {showLabel && (
        <Text style={styles.label}>today</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  number: {
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    color: '#6E665A',
  },
});
