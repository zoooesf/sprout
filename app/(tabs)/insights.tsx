/**
 * Insights screen — trend chart + trigger heatmap + AI summary card.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, typography, spacing, categories, scoreColor } from '@/lib/tokens';
import { useAuthStore } from '@/stores/auth';
import { supabase, type LogEntry } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { generateInsightsNarrative, hasClaudeKey } from '@/lib/claude';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 40 - 36;
const CHART_H = 130;

type RangeKey = '7d' | '14d' | '30d' | '90d';
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d',  label: 'Week',   days: 7  },
  { key: '14d', label: '2 weeks', days: 14 },
  { key: '30d', label: 'Month',  days: 30 },
  { key: '90d', label: '3 mo',   days: 90 },
];

export default function InsightsScreen() {
  const [range, setRange] = useState<RangeKey>('14d');
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const activeSubject = useAuthStore((s) => s.activeSubject);
  const rangeDays = RANGES.find((r) => r.key === range)!.days;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['insights-entries', activeSubject?.id, range],
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
  const dailyScores = buildDailyScores(checkins, rangeDays);
  const avgScore = dailyScores.filter((d) => d.score > 0).reduce((s, d, _, a) => s + d.score / a.length, 0);

  // Fetch AI narrative when entries load (or range changes)
  useEffect(() => {
    if (!hasClaudeKey() || entries.length < 5) {
      setAiNarrative(null);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    generateInsightsNarrative(activeSubject?.name ?? 'your child', entries, avgScore, rangeDays)
      .then((text) => {
        if (!cancelled) {
          setAiNarrative(text);
          setAiLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [entries, range]);

  const triggerFoods = buildTriggerFoods(entries);
  const heatmapRows = buildHeatmapRows(dailyScores);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>{activeSubject?.name ?? '—'} · {activeSubject?.conditions?.join(', ') || 'Health'}</Text>
            <Text style={styles.heading}>Insights</Text>
          </View>
        </View>

        {/* Range picker */}
        <View style={styles.rangeWrap}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[styles.rangeBtn, range === r.key && styles.rangeBtnOn]}
            >
              <Text style={[styles.rangeBtnText, range === r.key && styles.rangeBtnTextOn]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.sage} style={{ marginTop: 60 }} />
        ) : checkins.length === 0 ? (
          <View style={styles.emptyState}>
            <CategoryIcon name="chart" size={40} color={colors.faint} />
            <Text style={styles.emptyTitle}>Keep logging — patterns take a little time to grow</Text>
            <Text style={styles.emptySub}>Check-in daily to see your trend chart here.</Text>
          </View>
        ) : (
          <>
            {/* Trend chart card */}
            <Card style={styles.chartCard}>
              <View style={styles.chartMeta}>
                <Text style={styles.chartLabel}>Condition score</Text>
                <Text style={styles.chartDateRange}>{rangeDateLabel(rangeDays)}</Text>
              </View>
              <View style={styles.avgRow}>
                <Text style={styles.avgScore}>{avgScore > 0 ? avgScore.toFixed(1) : '—'}</Text>
                <Text style={styles.avgLabel}>avg / {rangeDays} days</Text>
              </View>
              <TrendChart data={dailyScores} />
            </Card>

            {/* Stats row */}
            <View style={styles.statsRow}>
              {buildStats(checkins, entries).map((s) => (
                <Card key={s.label} style={styles.statCard}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statSub}>{s.sub}</Text>
                </Card>
              ))}
            </View>

            {/* Heatmap calendar */}
            {heatmapRows.length > 0 && (
              <Card style={styles.heatmapCard}>
                <Text style={styles.sectionTitle}>Score calendar</Text>
                <View style={styles.heatmapGrid}>
                  {heatmapRows.map((row, ri) => (
                    <View key={ri} style={styles.heatmapRow}>
                      {row.map((day, di) => (
                        <View
                          key={di}
                          style={[
                            styles.heatmapCell,
                            { backgroundColor: day.score > 0 ? scoreColor(day.score) : colors.hairlineSoft },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
                <View style={styles.heatmapLegend}>
                  <Text style={styles.heatmapLegendText}>Low</Text>
                  <View style={styles.heatmapLegendBar}>
                    {[1,3,5,7,9].map((n) => (
                      <View key={n} style={[styles.heatmapLegendDot, { backgroundColor: scoreColor(n) }]} />
                    ))}
                  </View>
                  <Text style={styles.heatmapLegendText}>High</Text>
                </View>
              </Card>
            )}

            {/* Trigger foods */}
            {triggerFoods.length > 0 && (
              <Card style={styles.triggersCard}>
                <View style={styles.sectionHeader}>
                  <CategoryIcon name="warning" size={15} color={colors.terracotta} />
                  <Text style={styles.sectionTitle}>Foods near flare days</Text>
                </View>
                <Text style={styles.triggersSub}>
                  These foods were logged within 24h before a score of 7 or higher.
                </Text>
                {triggerFoods.map((f) => (
                  <View key={f.name} style={styles.triggerRow}>
                    <Text style={styles.triggerName}>{f.name}</Text>
                    <View style={styles.triggerBar}>
                      <View
                        style={[
                          styles.triggerBarFill,
                          { width: `${(f.count / triggerFoods[0].count) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.triggerCount}>{f.count}×</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* AI summary */}
            <Card style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <CategoryIcon name="spark" size={18} color={colors.sage} />
                <Text style={styles.aiTitle}>What Sprout sees</Text>
              </View>
              {aiLoading ? (
                <View style={styles.aiLoadingRow}>
                  <ActivityIndicator size="small" color={colors.sage} />
                  <Text style={styles.aiLoadingText}>Analysing patterns…</Text>
                </View>
              ) : (
                <Text style={styles.aiBody}>
                  {aiNarrative ?? generateFallbackNarrative(activeSubject?.name ?? 'your child', entries, avgScore)}
                </Text>
              )}
              <View style={styles.aiDivider} />
              <View style={styles.aiActions}>
                <TouchableOpacity style={[styles.aiBtn, styles.aiBtnDark]}>
                  <Text style={[styles.aiBtnText, { color: '#fff' }]}>Share with doctor</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildDailyScores(checkins: LogEntry[], days: number) {
  const result: { date: string; score: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayCheckin = checkins.find((e) => e.timestamp.startsWith(dateStr));
    result.push({ date: dateStr, score: (dayCheckin?.payload as any)?.severity_score ?? 0 });
  }
  return result;
}

function buildHeatmapRows(dailyScores: { date: string; score: number }[]) {
  const rows: { date: string; score: number }[][] = [];
  const chunkSize = 7;
  for (let i = 0; i < dailyScores.length; i += chunkSize) {
    rows.push(dailyScores.slice(i, i + chunkSize));
  }
  return rows;
}

function buildTriggerFoods(entries: LogEntry[]): { name: string; count: number }[] {
  const checkins = entries.filter((e) => e.type === 'checkin');
  const flareDays = checkins
    .filter((c) => (c.payload as any)?.severity_score >= 7)
    .map((c) => new Date(c.timestamp).getTime());

  const counts: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.type !== 'food') continue;
    const name = (entry.payload as any)?.name;
    if (!name) continue;
    const foodTime = new Date(entry.timestamp).getTime();
    const nearFlare = flareDays.some(
      (ft) => ft - foodTime >= 0 && ft - foodTime <= 86_400_000
    );
    if (nearFlare) counts[name] = (counts[name] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function buildStats(checkins: LogEntry[], allEntries: LogEntry[]) {
  const scored = checkins.filter((c) => (c.payload as any)?.severity_score > 0);
  const flares = scored.filter((c) => (c.payload as any)?.severity_score >= 7).length;
  const creams = allEntries.filter((e) => e.type === 'cream').length;
  return [
    { label: 'Flare days', value: String(flares), sub: `of ${scored.length} logged` },
    { label: 'Calm days', value: String(scored.filter((c) => (c.payload as any)?.severity_score <= 4).length), sub: 'score ≤ 4' },
    { label: 'Cream used', value: `${creams}×`, sub: 'total applications' },
  ];
}

function rangeDateLabel(days: number): string {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} — ${fmt(end)}`;
}

function generateFallbackNarrative(name: string, entries: LogEntry[], avg: number): string {
  if (entries.length < 5) {
    return `Keep logging entries for ${name} — Sprout needs at least a week of data to find meaningful patterns. Check-ins, food, and cream logs are the most useful signals.`;
  }
  const score = avg > 0 ? avg.toFixed(1) : '—';
  const hint = hasClaudeKey()
    ? 'AI analysis will appear here once enough data is collected.'
    : 'Add your EXPO_PUBLIC_ANTHROPIC_API_KEY to unlock AI-powered pattern analysis.';
  return `${name}'s average condition score over this period is ${score}/10. ${hint}`;
}

// ── TrendChart ────────────────────────────────────────────────────────────────

function TrendChart({ data }: { data: { date: string; score: number }[] }) {
  const scored = data.filter((d) => d.score > 0);
  if (scored.length < 2) {
    return (
      <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Not enough check-ins yet</Text>
      </View>
    );
  }

  const pad = 4;
  const w = CHART_W;
  const h = CHART_H;

  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: d.score > 0 ? pad + (1 - (d.score - 1) / 9) * (h - pad * 2) : null,
  }));

  const segments: string[] = [];
  let pen = '';
  pts.forEach((p) => {
    if (p.y === null) { pen = ''; return; }
    pen ? segments.push(`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`) : segments.push(`M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    pen = `${p.x},${p.y}`;
  });
  const linePath = segments.join(' ');

  const firstPt = pts.find((p) => p.y !== null);
  const lastPt = [...pts].reverse().find((p) => p.y !== null);
  const areaPath = firstPt && lastPt
    ? `${linePath} L ${lastPt.x.toFixed(1)} ${h - pad} L ${firstPt.x.toFixed(1)} ${h - pad} Z`
    : '';

  return (
    <View style={{ marginTop: 10 }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.sage} stopOpacity="0.25" />
            <Stop offset="1" stopColor={colors.sage} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[3, 5, 7].map((g) => {
          const y = pad + (1 - (g - 1) / 9) * (h - pad * 2);
          return <Line key={g} x1={pad} x2={w - pad} y1={y} y2={y} stroke={colors.hairline} strokeWidth="0.8" strokeDasharray="2,4" />;
        })}
        {areaPath ? <Path d={areaPath} fill="url(#area)" /> : null}
        <Path d={linePath} fill="none" stroke={colors.sage} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) =>
          p.y !== null ? (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === pts.length - 1 ? 4 : 2.4}
              fill={i === pts.length - 1 ? colors.terracotta : '#fff'}
              stroke={i === pts.length - 1 ? '#fff' : colors.sage}
              strokeWidth={i === pts.length - 1 ? 2 : 1.4}
            />
          ) : null
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: spacing.md, marginBottom: spacing.lg },
  headerSub: { fontSize: typography.sizes.sm, color: colors.muted, fontWeight: '500', marginBottom: 2 },
  heading: { fontSize: typography.sizes['3xl'], fontWeight: '600', color: colors.ink, letterSpacing: -0.5 },

  rangeWrap: { flexDirection: 'row', backgroundColor: colors.hairlineSoft, borderRadius: 12, padding: 3, marginBottom: spacing.lg },
  rangeBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rangeBtnOn: { backgroundColor: colors.card, shadowColor: colors.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  rangeBtnText: { fontSize: 13, fontWeight: '500', color: colors.muted },
  rangeBtnTextOn: { color: colors.ink, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.ink, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  emptySub: { fontSize: typography.sizes.base, color: colors.muted, textAlign: 'center' },

  chartCard: { padding: 18, marginBottom: spacing.md },
  chartMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  chartLabel: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  chartDateRange: { fontSize: 13, color: colors.muted },
  avgRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  avgScore: { fontSize: 30, fontWeight: '600', color: colors.ink, letterSpacing: -0.6 },
  avgLabel: { fontSize: 13, color: colors.muted },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  statCard: { flex: 1, padding: 12 },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 22, fontWeight: '600', color: colors.ink, marginTop: 4, letterSpacing: -0.4 },
  statSub: { fontSize: 11, color: colors.muted, marginTop: 2 },

  heatmapCard: { padding: 18, marginBottom: spacing.md },
  heatmapGrid: { gap: 4, marginTop: 10 },
  heatmapRow: { flexDirection: 'row', gap: 4 },
  heatmapCell: { flex: 1, height: 18, borderRadius: 4 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  heatmapLegendBar: { flex: 1, flexDirection: 'row', gap: 3 },
  heatmapLegendDot: { flex: 1, height: 8, borderRadius: 2 },
  heatmapLegendText: { fontSize: 10, color: colors.muted, fontWeight: '500' },

  triggersCard: { padding: 18, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.ink },
  triggersSub: { fontSize: 12, color: colors.muted, lineHeight: 17, marginBottom: 12 },
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  triggerName: { fontSize: 13, fontWeight: '500', color: colors.ink, width: 100 },
  triggerBar: { flex: 1, height: 6, backgroundColor: colors.hairlineSoft, borderRadius: 3, overflow: 'hidden' },
  triggerBarFill: { height: '100%', backgroundColor: colors.terracotta, borderRadius: 3 },
  triggerCount: { fontSize: 12, color: colors.muted, width: 24, textAlign: 'right' },

  aiCard: { padding: 18, marginBottom: spacing.md, backgroundColor: colors.sageSoft },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiTitle: { fontSize: 12, fontWeight: '600', color: colors.sageDeep, textTransform: 'uppercase', letterSpacing: 0.3 },
  aiBody: { fontSize: 15, lineHeight: 23, color: colors.ink },
  aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  aiLoadingText: { fontSize: 14, color: colors.muted },
  aiDivider: { height: 1, backgroundColor: colors.hairline, marginVertical: 14 },
  aiActions: { flexDirection: 'row', gap: 10 },
  aiBtn: { flex: 1, height: 38, borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  aiBtnDark: { backgroundColor: colors.ink, borderColor: colors.ink },
  aiBtnText: { fontSize: 13, fontWeight: '500', color: colors.ink },
});
