import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable, Animated, PanResponder, Dimensions } from 'react-native';
import { colors, categories, type CategoryKey } from '@/lib/tokens';
import { CategoryIcon } from './icons/CategoryIcon';
import { Card } from './Card';
import type { LogEntry } from '@/lib/supabase';

const DELETE_WIDTH = 80;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface TimelineEntryProps {
  entry: LogEntry;
  isLast?: boolean;
  onPress?: () => void;
  onPhotoPress?: (entry: LogEntry) => void;
  onDelete?: (id: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getTitle(entry: LogEntry): string {
  const p = entry.payload as Record<string, any>;
  switch (entry.type) {
    case 'food': return p.name || 'Food entry';
    case 'medication': return p.library_item_name || 'Medication';
    case 'cream': return p.library_item_name || 'Cream';
    case 'sleep': return 'Sleep';
    case 'checkin': return 'Daily check-in';
    case 'photo': return 'Photo';
    case 'note': return 'Note';
    default: return 'Entry';
  }
}

function getSubtitle(entry: LogEntry): string {
  const p = entry.payload as Record<string, any>;
  switch (entry.type) {
    case 'food': return p.ingredients?.slice(0, 4).join(', ') || '';
    case 'medication': return p.dose ? `${p.dose}` : '';
    case 'cream': return p.areas?.join(', ') || '';
    case 'sleep': return p.hours ? `${p.hours}h sleep` : '';
    case 'checkin': return p.symptoms?.slice(0, 3).join(', ') || '';
    case 'photo': return p.areas?.join(', ') || '';
    case 'note': return (p.text || '').slice(0, 80);
    default: return '';
  }
}

function getMeta(entry: LogEntry): string | null {
  if (entry.type === 'checkin') {
    const score = (entry.payload as any).severity_score;
    return score ? `Score ${score}` : null;
  }
  return null;
}

export function TimelineEntry({ entry, isLast = false, onPress, onPhotoPress, onDelete }: TimelineEntryProps) {
  const catKey = entry.type === 'medication' ? 'medication' : entry.type as CategoryKey;
  const meta = categories[catKey] ?? categories.note;
  const title = getTitle(entry);
  const subtitle = getSubtitle(entry);
  const badge = getMeta(entry);

  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy) * 2,
      onPanResponderMove: (_, { dx }) => {
        translateX.setValue(Math.min(0, Math.max(-DELETE_WIDTH, dx)));
      },
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -(DELETE_WIDTH / 2)) {
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  function handleDelete() {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onDelete?.(entry.id));
  }

  return (
    <View style={styles.rowOuter}>
      {onDelete && (
        <View style={styles.deleteAction}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <CategoryIcon name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      <Animated.View style={[styles.row, { transform: [{ translateX }] }]} {...(onDelete ? panResponder.panHandlers : {})}>

      {/* vertical connector line */}
      {!isLast && <View style={styles.line} />}

      {/* category icon circle */}
      <View style={[styles.iconWrap, { backgroundColor: meta.tint }]}>
        <CategoryIcon name={meta.icon} size={20} color={meta.ink} />
      </View>

      {/* card */}
      <View style={styles.card}>
        <Card padded={false}>
          <TouchableOpacity
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
            onPress={onPress}
          >
            <View style={styles.cardInner}>
              <View style={styles.timeRow}>
                <Text style={styles.time}>{formatTime(entry.timestamp)}</Text>
                {badge && (
                  <View style={[styles.badge, { backgroundColor: meta.tint }]}>
                    <Text style={[styles.badgeText, { color: meta.ink }]}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
          {entry.photo_urls?.length > 0 && (
            <Pressable
              style={styles.photoWrapper}
              onPress={onPhotoPress ? () => onPhotoPress(entry) : undefined}
            >
              <Image
                source={{ uri: entry.photo_urls[0] }}
                style={styles.photo}
                resizeMode="cover"
              />
            </Pressable>
          )}
        </Card>
      </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowOuter: {
    position: 'relative',
    marginBottom: 10,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: DELETE_WIDTH - 10,
    height: DELETE_WIDTH - 10,
    borderRadius: 14,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    position: 'relative',
    backgroundColor: colors.bgCream,
  },
  line: {
    position: 'absolute',
    left: 24,
    top: 52,
    bottom: -10,
    width: 1.5,
    backgroundColor: colors.hairline,
    zIndex: 0,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 2,
    borderColor: colors.bgCream,
    zIndex: 1,
  },
  card: {
    flex: 1,
  },
  cardInner: {
    padding: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  photoWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  photo: {
    width: '100%',
    height: 88,
    borderRadius: 10,
  },
});
