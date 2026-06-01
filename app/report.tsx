/**
 * Report screen — generate and export a PDF health summary for doctor visits.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { supabase, type LogEntry } from '@/lib/supabase';
import { colors, typography, spacing } from '@/lib/tokens';
import { useAuthStore } from '@/stores/auth';
import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { SoftButton } from '@/components/SoftButton';
import { buildReportHtml } from '@/lib/reportTemplate';

type RangeKey = '7d' | '30d' | '90d';
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d',  label: 'Last 7 days',  days: 7  },
  { key: '30d', label: 'Last month',   days: 30 },
  { key: '90d', label: 'Last 3 months', days: 90 },
];

export default function ReportScreen() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [exporting, setExporting] = useState(false);
  const activeSubject = useAuthStore((s) => s.activeSubject);
  const rangeDays = RANGES.find((r) => r.key === range)!.days;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['report-entries', activeSubject?.id, range],
    enabled: !!activeSubject?.id,
    queryFn: async (): Promise<LogEntry[]> => {
      const since = new Date();
      since.setDate(since.getDate() - rangeDays);
      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .eq('subject_id', activeSubject!.id)
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const checkins = entries.filter((e) => e.type === 'checkin');
  const scored = checkins.filter((c) => (c.payload as any)?.severity_score > 0);
  const avg = scored.length
    ? (scored.reduce((s, c) => s + (c.payload as any).severity_score, 0) / scored.length).toFixed(1)
    : null;
  const flares = scored.filter((c) => (c.payload as any).severity_score >= 7).length;
  const calmDays = scored.filter((c) => (c.payload as any).severity_score <= 4).length;

  const handleExport = async () => {
    if (!activeSubject) return;
    setExporting(true);
    try {
      const html = buildReportHtml({
        subject: activeSubject,
        entries,
        rangeDays,
        generatedAt: new Date(),
      });

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Could not generate the report.');
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    { label: 'Entries logged', value: String(entries.length) },
    { label: 'Avg score', value: avg ? `${avg}/10` : '—' },
    { label: 'Flare days', value: String(flares) },
    { label: 'Calm days', value: String(calmDays) },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <CategoryIcon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Health report</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <Text style={styles.intro}>
          Export a clean PDF summary to share with {activeSubject?.name ? `${activeSubject.name}'s` : "your child's"} doctor or specialist.
        </Text>

        {/* Date range selector */}
        <Text style={styles.sectionLabel}>Date range</Text>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[styles.rangePill, range === r.key && styles.rangePillOn]}
              activeOpacity={0.7}
            >
              <Text style={[styles.rangePillText, range === r.key && styles.rangePillTextOn]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats preview */}
        <Text style={styles.sectionLabel}>Report preview</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.sage} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              {stats.map((s) => (
                <Card key={s.label} style={styles.statCard}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                </Card>
              ))}
            </View>

            {entries.length === 0 ? (
              <Card style={styles.emptyCard}>
                <CategoryIcon name="chart" size={32} color={colors.faint} />
                <Text style={styles.emptyText}>No entries in this range yet.</Text>
                <Text style={styles.emptySubText}>Keep logging daily to build a meaningful report.</Text>
              </Card>
            ) : (
              <Card style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <CategoryIcon name="calendar" size={16} color={colors.muted} />
                  <Text style={styles.summaryText}>
                    {entries.length} log entries across {new Set(entries.map((e) => e.timestamp.split('T')[0])).size} days
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <CategoryIcon name="leaf" size={16} color={colors.muted} />
                  <Text style={styles.summaryText}>
                    {entries.filter((e) => e.type === 'food').length} food logs
                    · {entries.filter((e) => e.type === 'cream').length} cream applications
                    · {entries.filter((e) => e.type === 'medication').length} medications
                  </Text>
                </View>
                {entries.some((e) => e.photo_urls?.length > 0) && (
                  <View style={styles.summaryRow}>
                    <CategoryIcon name="camera" size={16} color={colors.muted} />
                    <Text style={styles.summaryText}>
                      {entries.filter((e) => e.photo_urls?.length > 0).length} photos attached
                    </Text>
                  </View>
                )}
              </Card>
            )}
          </>
        )}

        {/* What's included */}
        <Text style={styles.sectionLabel}>What's in the report</Text>
        <Card style={styles.includedCard}>
          {[
            'Summary stats (avg score, flare days, calm days)',
            'Foods eaten near flare days',
            'Day-by-day log with times',
            'Cream and medication usage',
            'Photo captions and notes',
          ].map((item) => (
            <View key={item} style={styles.includedRow}>
              <CategoryIcon name="check" size={14} color={colors.sage} />
              <Text style={styles.includedText}>{item}</Text>
            </View>
          ))}
        </Card>

        {/* Export button */}
        <SoftButton
          variant="primary"
          size="lg"
          fullWidth
          loading={exporting}
          onPress={handleExport}
          style={styles.exportBtn}
        >
          Export as PDF
        </SoftButton>

        <Text style={styles.disclaimer}>
          This report is for informational purposes and does not constitute medical advice.
        </Text>
      </ScrollView>
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

  content: { paddingHorizontal: spacing.xl, paddingBottom: 48 },

  intro: { fontSize: typography.sizes.base, color: colors.muted, lineHeight: 22, marginBottom: spacing.xl },

  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, paddingLeft: 4, marginBottom: 10 },

  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.xl },
  rangePill: {
    flex: 1, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center',
  },
  rangePillOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  rangePillText: { fontSize: 12, fontWeight: '500', color: colors.muted },
  rangePillTextOn: { color: '#fff', fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.md },
  statCard: { width: '47%', padding: 14 },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },

  emptyCard: { padding: 24, alignItems: 'center', gap: 8, marginBottom: spacing.lg },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  emptySubText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 },

  summaryCard: { padding: 16, gap: 10, marginBottom: spacing.xl },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  summaryText: { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 19 },

  includedCard: { padding: 16, gap: 10, marginBottom: spacing.xl },
  includedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  includedText: { fontSize: 13, color: colors.ink, flex: 1 },

  exportBtn: { marginBottom: spacing.md },
  disclaimer: { fontSize: 11, color: colors.faint, textAlign: 'center', lineHeight: 16 },
});
