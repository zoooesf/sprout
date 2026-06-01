/**
 * Today screen — HomeCalm variant from design.
 * Shows today's condition score, filterable timeline, + quick-log FAB.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, categories, type CategoryKey, scoreWord } from '@/lib/tokens';
import { useAuthStore } from '@/stores/auth';
import { useLogEntries, useDrainQueue, usePendingCount, useDeleteLogEntry } from '@/hooks/useLogEntries';
import type { LogEntry } from '@/lib/supabase';
import { ScoreDot } from '@/components/ScoreDot';
import { CategoryChip } from '@/components/CategoryChip';
import { TimelineEntry } from '@/components/TimelineEntry';
import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { QuickLogSheet } from '@/components/QuickLogSheet';

type FilterKey = 'all' | CategoryKey;

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function offsetDate(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function dateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TodayScreen() {
  const router = useRouter();
  const activeSubject = useAuthStore((s) => s.activeSubject);
  const subjects = useAuthStore((s) => s.subjects);
  const setActiveSubjectId = useAuthStore((s) => s.setActiveSubjectId);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayString());

  const isToday = selectedDate === todayString();
  const scrollRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();
  const { data: pendingCount = 0 } = usePendingCount();
  const deleteEntry = useDeleteLogEntry();
  useDrainQueue();

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] });
    }, [queryClient])
  );
  const { data: entries = [], isLoading } = useLogEntries(selectedDate);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy),
      onPanResponderRelease: (_, { dx }) => {
        if (dx > 40) {
          setSelectedDate((d) => offsetDate(d, -1));
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        } else if (dx < -40) {
          setSelectedDate((d) => {
            const next = offsetDate(d, 1);
            return next > todayString() ? d : next;
          });
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
      },
    })
  ).current;

  // Find today's check-in for score
  const checkinEntry = entries.find((e) => e.type === 'checkin');
  const todayScore: number = (checkinEntry?.payload as any)?.severity_score ?? 0;

  // Filter entries
  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => {
        const key = e.type === 'medication' ? 'medication' : e.type;
        return key === filter;
      });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          {/* Subject switcher */}
          {subjects.length > 0 && (
            <TouchableOpacity style={styles.subjectPill} activeOpacity={0.7}>
              <View style={[styles.subjectAvatar, { backgroundColor: colors.terracottaSoft }]}>
                <Text style={[styles.subjectInitial, { color: colors.warnInk }]}>
                  {activeSubject?.name?.[0] ?? '?'}
                </Text>
              </View>
              <Text style={styles.subjectName}>{activeSubject?.name ?? '—'}</Text>
              <CategoryIcon name="chevD" size={14} color={colors.faint} />
            </TouchableOpacity>
          )}
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <CategoryIcon name="search" size={18} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <CategoryIcon name="bell" size={18} color={colors.muted} />
              {pendingCount > 0 && <View style={styles.syncDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero score card — swipe left/right to navigate dates */}
        <View style={styles.heroWrap} {...panResponder.panHandlers}>
          <Card padded={false} style={styles.heroCard}>
            <View style={styles.heroInner}>
              {todayScore > 0 ? (
                <ScoreDot score={todayScore} size={68} />
              ) : (
                <View style={[styles.emptyDot]}>
                  <CategoryIcon name="sun" size={28} color={colors.sage} />
                </View>
              )}
              <View style={styles.heroText}>
                <View style={styles.heroDateRow}>
                  <CategoryIcon name="chevL" size={13} color={colors.faint} />
                  <Text style={styles.heroDate}>{dateLabel(selectedDate)}</Text>
                  <CategoryIcon name="chevR" size={13} color={isToday ? 'transparent' : colors.faint} />
                </View>
                <Text style={styles.heroStatus}>
                  {todayScore > 0
                    ? `${activeSubject?.name ?? 'Child'} is ${scoreWord(todayScore)}`
                    : isToday ? 'No check-in yet today' : 'No check-in this day'}
                </Text>
                {todayScore === 0 && isToday && (
                  <Text style={styles.heroHint}>Tap + to do today's check-in</Text>
                )}
              </View>
            </View>
            {(todayScore > 0 || isToday) && (
              <>
                <View style={styles.heroDivider} />
                <TouchableOpacity
                  style={styles.heroCheckin}
                  onPress={() => setSheetOpen(true)}
                >
                  <CategoryIcon name="sun" size={16} color={colors.sage} />
                  <Text style={styles.heroCheckinText}>
                    {todayScore > 0
                      ? (isToday ? 'Update check-in' : 'View check-in')
                      : 'Evening check-in'}
                  </Text>
                  <View style={styles.heroCheckinArrow}><CategoryIcon name="chevR" size={14} color={colors.faint} /></View>
                </TouchableOpacity>
              </>
            )}
          </Card>
          {!isToday && (
            <TouchableOpacity
              style={styles.backToToday}
              onPress={() => {
                setSelectedDate(todayString());
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
              activeOpacity={0.7}
            >
              <CategoryIcon name="chevL" size={12} color={colors.sage} />
              <Text style={styles.backToTodayText}>Back to today</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[styles.allChip, { backgroundColor: filter === 'all' ? colors.ink : colors.card }]}
          >
            <Text style={[styles.allChipText, { color: filter === 'all' ? '#fff' : colors.ink }]}>
              All
            </Text>
          </TouchableOpacity>
          {(['food', 'cream', 'medication', 'sleep', 'photo', 'note'] as CategoryKey[]).map((cat) => (
            <CategoryChip
              key={cat}
              cat={cat}
              dense
              selected={filter === cat}
              onPress={() => setFilter(cat === filter ? 'all' : cat)}
            />
          ))}
        </ScrollView>

        {/* Timeline */}
        <View style={styles.timeline}>
          {isLoading ? (
            <ActivityIndicator color={colors.sage} style={styles.loader} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? (isToday ? 'Start logging to see today\'s entries here' : 'No entries for this day')
                  : `No ${categories[filter as CategoryKey]?.label?.toLowerCase() ?? filter} entries${isToday ? ' today' : ' this day'}`}
              </Text>
            </View>
          ) : (
            filtered.map((entry, i) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                isLast={i === filtered.length - 1}
                onPress={() => setEditingEntry(entry)}
                onDelete={(id) => deleteEntry.mutate(id)}
                onPhotoPress={(e) => {
                  if (e.type === 'photo') {
                    router.push({
                      pathname: '/photo-viewer',
                      params: { entryId: e.id, subjectId: activeSubject?.id },
                    });
                  } else {
                    router.push({
                      pathname: '/photo-viewer',
                      params: { singleUrl: e.photo_urls[0], singleTimestamp: e.timestamp },
                    });
                  }
                }}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating action button — only shown for today */}
      {isToday && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setSheetOpen(true)}
          activeOpacity={0.85}
        >
          <CategoryIcon name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {sheetOpen && (
        <QuickLogSheet onClose={() => setSheetOpen(false)} />
      )}
      {editingEntry && (
        <QuickLogSheet
          editEntry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  scroll: { flex: 1 },
  content: { paddingBottom: 120 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 6,
    paddingRight: 10,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  subjectAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectInitial: { fontSize: 13, fontWeight: '600' },
  subjectName: { fontSize: 14, fontWeight: '500', color: colors.ink },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  syncDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.terracotta,
    borderWidth: 1.5,
    borderColor: colors.card,
  },

  heroWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  heroCard: { overflow: 'hidden' },
  heroInner: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 },
  emptyDot: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  heroDate: { fontSize: 13, color: colors.muted },
  heroStatus: { fontSize: 19, fontWeight: '600', color: colors.ink, letterSpacing: -0.3, lineHeight: 24 },
  heroHint: { fontSize: 13, color: colors.muted, marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: colors.hairline, marginHorizontal: 18 },
  heroCheckin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 18,
  },
  heroCheckinText: { fontSize: 13, color: colors.ink, fontWeight: '500', flex: 1 },
  heroCheckinArrow: { marginLeft: 'auto' },

  backToToday: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.sageSoft,
    alignSelf: 'center',
  },
  backToTodayText: {
    fontSize: 13,
    color: colors.sage,
    fontWeight: '500',
  },

  filterRow: { paddingHorizontal: spacing.xl, gap: 8, paddingBottom: spacing.sm },
  allChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  allChipText: { fontSize: 13, fontWeight: '500' },

  timeline: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  loader: { marginTop: 40 },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },

  fab: {
    position: 'absolute',
    right: 22,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.sage,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 40,
  },
});
