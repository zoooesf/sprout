import type { LogEntry, Subject } from './supabase';

const SAGE = '#6B8E5A';
const INK = '#2D2A24';
const MUTED = '#6E665A';
const HAIRLINE = '#E5DDD0';
const TERRACOTTA = '#C97A4A';
const SCORE_STOPS = [
  '#5E8B52', '#7FA378', '#9DB78E', '#B6C58A', '#D7C079',
  '#E0B25A', '#D89A4E', '#D08855', '#C97A4A', '#A85534',
];

function scoreColor(score: number): string {
  const idx = Math.min(Math.max(Math.round(score) - 1, 0), 9);
  return SCORE_STOPS[idx];
}

const TYPE_EMOJI: Record<string, string> = {
  checkin: '🌡️',
  food: '🍽️',
  cream: '💧',
  medication: '💊',
  sleep: '🌙',
  photo: '📷',
  note: '📝',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function entryToHtml(entry: LogEntry): string {
  const p = entry.payload as Record<string, any>;
  const emoji = TYPE_EMOJI[entry.type] ?? '•';
  let detail = '';

  switch (entry.type) {
    case 'checkin':
      detail = `Score <strong style="color:${scoreColor(p.severity_score)}">${p.severity_score}/10</strong>` +
        (p.symptoms?.length ? ` · ${p.symptoms.join(', ')}` : '');
      break;
    case 'food':
      detail = `<strong>${p.name}</strong>` +
        (p.ingredients?.length ? `<br><span style="font-size:11px;color:${MUTED}">${p.ingredients.slice(0, 8).join(', ')}${p.ingredients.length > 8 ? '…' : ''}</span>` : '');
      break;
    case 'cream':
      detail = `<strong>${p.library_item_name ?? 'Cream'}</strong>` +
        (p.areas?.length ? ` · ${p.areas.join(', ')}` : '');
      break;
    case 'medication':
      detail = `<strong>${p.library_item_name ?? 'Medication'}</strong>` +
        (p.dose ? ` · ${p.dose}` : '');
      break;
    case 'sleep':
      detail = p.hours ? `${p.hours}h sleep` : 'Sleep logged';
      if (p.notes) detail += ` · ${p.notes}`;
      break;
    case 'photo':
      detail = 'Photo' + (p.areas?.length ? ` · ${p.areas.join(', ')}` : '') +
        (p.caption ? ` · "${p.caption}"` : '');
      break;
    case 'note':
      detail = `<em>${p.text ?? ''}</em>`;
      break;
  }

  return `
    <tr>
      <td style="padding:6px 8px;color:${MUTED};font-size:11px;white-space:nowrap;vertical-align:top">${formatTime(entry.timestamp)}</td>
      <td style="padding:6px 4px;font-size:16px;vertical-align:top">${emoji}</td>
      <td style="padding:6px 8px;font-size:13px;color:${INK};vertical-align:top;line-height:1.5">${detail}</td>
    </tr>`;
}

interface ReportData {
  subject: Subject;
  entries: LogEntry[];
  rangeDays: number;
  generatedAt: Date;
}

export function buildReportHtml(data: ReportData): string {
  const { subject, entries, rangeDays, generatedAt } = data;
  const checkins = entries.filter((e) => e.type === 'checkin');
  const scored = checkins.filter((c) => (c.payload as any)?.severity_score > 0);
  const avg = scored.length
    ? (scored.reduce((s, c) => s + (c.payload as any).severity_score, 0) / scored.length).toFixed(1)
    : '—';
  const flares = scored.filter((c) => (c.payload as any).severity_score >= 7).length;
  const calmDays = scored.filter((c) => (c.payload as any).severity_score <= 4).length;
  const creams = entries.filter((e) => e.type === 'cream').length;

  // Trigger foods
  const flareDays = scored
    .filter((c) => (c.payload as any).severity_score >= 7)
    .map((c) => new Date(c.timestamp).getTime());
  const foodCounts: Record<string, number> = {};
  for (const f of entries.filter((e) => e.type === 'food')) {
    const t = new Date(f.timestamp).getTime();
    if (flareDays.some((ft) => ft - t >= 0 && ft - t <= 86_400_000)) {
      const name = (f.payload as any)?.name;
      if (name) foodCounts[name] = (foodCounts[name] ?? 0) + 1;
    }
  }
  const topFoods = Object.entries(foodCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Group entries by day
  const byDay: Record<string, LogEntry[]> = {};
  for (const e of entries) {
    const day = e.timestamp.split('T')[0];
    (byDay[day] = byDay[day] ?? []).push(e);
  }
  const days = Object.keys(byDay).sort().reverse();

  const dateRangeStart = new Date();
  dateRangeStart.setDate(dateRangeStart.getDate() - rangeDays);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const ageStr = subject.birthday
    ? (() => {
        const birth = new Date(subject.birthday);
        const now = new Date();
        const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
        return months < 24 ? `${months} months old` : `${Math.floor(months / 12)} years old`;
      })()
    : '';

  const dayRows = days.map((day) => {
    const dayEntries = byDay[day].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const checkin = dayEntries.find((e) => e.type === 'checkin');
    const score: number = (checkin?.payload as any)?.severity_score ?? 0;
    return `
      <div style="margin-bottom:20px;break-inside:avoid">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${HAIRLINE}">
          <span style="font-size:13px;font-weight:600;color:${INK}">${formatDate(day + 'T12:00:00')}</span>
          ${score > 0 ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${scoreColor(score)}"></span><span style="font-size:12px;color:${MUTED}">Score ${score}</span>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            ${dayEntries.map(entryToHtml).join('')}
          </tbody>
        </table>
      </div>`;
  }).join('');

  const triggersSection = topFoods.length > 0 ? `
    <div style="margin-bottom:24px;padding:16px;background:#FFF8F0;border-radius:10px;border:1px solid #F2D9C8">
      <h3 style="margin:0 0 8px;font-size:13px;color:${TERRACOTTA};text-transform:uppercase;letter-spacing:0.4px">⚠️ Foods eaten near flare days</h3>
      <p style="margin:0 0 10px;font-size:12px;color:${MUTED}">These foods were logged within 24 hours before a condition score of 7 or higher.</p>
      ${topFoods.map(([name, count]) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:13px;color:${INK};flex:1">${name}</span>
          <span style="font-size:12px;color:${MUTED}">${count}×</span>
        </div>`).join('')}
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: ${INK}; background: #fff; padding: 32px; max-width: 680px; margin: 0 auto; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid ${SAGE}">
    <div>
      <div style="font-size:11px;color:${SAGE};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Sprout Health Report</div>
      <h1 style="font-size:24px;font-weight:700;color:${INK};letter-spacing:-0.5px">${subject.name}</h1>
      ${ageStr ? `<p style="font-size:13px;color:${MUTED};margin-top:4px">${ageStr}${subject.conditions?.length ? ' · ' + subject.conditions.join(', ') : ''}</p>` : ''}
    </div>
    <div style="text-align:right">
      <p style="font-size:12px;color:${MUTED}">${fmt(dateRangeStart)} – ${fmt(generatedAt)}</p>
      <p style="font-size:11px;color:${MUTED};margin-top:4px">Generated ${generatedAt.toLocaleDateString()}</p>
    </div>
  </div>

  <!-- Summary stats -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px">
    ${[
      { label: 'Avg score', value: avg, sub: `/ 10 · ${scored.length} days logged` },
      { label: 'Flare days', value: String(flares), sub: 'score ≥ 7' },
      { label: 'Calm days', value: String(calmDays), sub: 'score ≤ 4' },
      { label: 'Cream used', value: `${creams}×`, sub: 'applications' },
    ].map((s) => `
      <div style="padding:12px;border:1px solid ${HAIRLINE};border-radius:10px">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">${s.label}</div>
        <div style="font-size:22px;font-weight:700;color:${INK};letter-spacing:-0.5px">${s.value}</div>
        <div style="font-size:10px;color:${MUTED};margin-top:2px">${s.sub}</div>
      </div>`).join('')}
  </div>

  ${triggersSection}

  <!-- Log entries -->
  <h2 style="font-size:14px;font-weight:600;color:${MUTED};text-transform:uppercase;letter-spacing:0.4px;margin-bottom:16px">Daily log</h2>
  ${dayRows || `<p style="color:${MUTED};font-size:13px">No entries logged in this period.</p>`}

  <!-- Footer -->
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid ${HAIRLINE}">
    <p style="font-size:11px;color:${MUTED};text-align:center">
      Generated by Sprout · This report is for informational purposes only and does not constitute medical advice.
    </p>
  </div>

</body>
</html>`;
}
