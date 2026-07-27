import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, categories, type CategoryKey } from '@/lib/tokens';
import { useAuthStore } from '@/stores/auth';
import { useSearchEntries } from '@/hooks/useSearchEntries';
import { filterEntries, computeAvailableTags } from '@/lib/search';
import type { LogEntry } from '@/lib/supabase';
import { TimelineEntry } from '@/components/TimelineEntry';
import { CategoryChip } from '@/components/CategoryChip';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { QuickLogSheet } from '@/components/QuickLogSheet';

const TYPE_ORDER = Object.keys(categories) as CategoryKey[];

export default function SearchScreen() {
  const router = useRouter();
  const activeSubject = useAuthStore((s) => s.activeSubject);
  const { data: allEntries = [], isLoading } = useSearchEntries();

  const [selectedTypes, setSelectedTypes] = useState<Set<LogEntry['type']>>(new Set());
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);

  const preTagResults = useMemo(
    () => filterEntries(allEntries, { types: selectedTypes, query, tags: new Set() }),
    [allEntries, selectedTypes, query]
  );

  const availableTags = useMemo(() => computeAvailableTags(preTagResults), [preTagResults]);

  useEffect(() => {
    setSelectedTags((prev) => {
      const next = new Set([...prev].filter((t) => availableTags.includes(t)));
      return next.size === prev.size ? prev : next;
    });
  }, [availableTags]);

  const results = useMemo(
    () => filterEntries(preTagResults, { types: new Set(), query: '', tags: selectedTags }),
    [preTagResults, selectedTags]
  );

  function toggleType(cat: LogEntry['type']) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <CategoryIcon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Search</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Text search */}
        <View style={styles.searchInputWrap}>
          <CategoryIcon name="search" size={16} color={colors.faint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ingredients, names, notes..."
            placeholderTextColor={colors.faint}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <CategoryIcon name="close" size={16} color={colors.faint} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {TYPE_ORDER.map((cat) => (
            <CategoryChip
              key={cat}
              cat={cat}
              dense
              selected={selectedTypes.has(cat)}
              onPress={() => toggleType(cat)}
            />
          ))}
        </ScrollView>

        {/* Tag refinement chips */}
        {availableTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {availableTags.map((tag) => {
              const selected = selectedTags.has(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.7}
                  style={[
                    styles.tagChip,
                    { backgroundColor: selected ? colors.ink : colors.card },
                  ]}
                >
                  <Text style={[styles.tagChipText, { color: selected ? '#fff' : colors.ink }]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Results */}
        <View style={styles.timeline}>
          {isLoading ? (
            <ActivityIndicator color={colors.sage} style={styles.loader} />
          ) : results.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No entries match your search.</Text>
            </View>
          ) : (
            results.map((entry, i) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                isLast={i === results.length - 1}
                onPress={() => setEditingEntry(entry)}
                onPhotoPress={(e) => {
                  if (e.type === 'photo') {
                    router.push({
                      pathname: '/photo-viewer',
                      params: { entryId: e.id, subjectId: activeSubject?.id },
                    });
                  } else {
                    router.push({
                      pathname: '/photo-viewer',
                      params: {
                        singleUrl: e.photo_urls[0],
                        singleTimestamp: e.timestamp,
                        entryId: e.id,
                        subjectId: activeSubject?.id,
                      },
                    });
                  }
                }}
              />
            ))
          )}
        </View>
      </ScrollView>

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

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: typography.sizes['2xl'], fontWeight: '600', color: colors.ink, letterSpacing: -0.4 },

  content: { paddingHorizontal: spacing.xl, paddingBottom: 120 },

  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.ink,
  },

  chipRow: { gap: 8, paddingBottom: spacing.md },

  tagChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  tagChipText: { fontSize: 13, fontWeight: '500' },

  timeline: { paddingTop: spacing.sm },
  loader: { marginTop: 40 },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
});
