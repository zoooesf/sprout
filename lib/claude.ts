import type { LogEntry } from './supabase';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export function hasClaudeKey(): boolean {
  return !!API_KEY;
}

export async function generateInsightsNarrative(
  childName: string,
  entries: LogEntry[],
  avgScore: number,
  rangeDays: number
): Promise<string | null> {
  if (!API_KEY) return null;

  const checkins = entries.filter((e) => e.type === 'checkin');
  const foods = entries.filter((e) => e.type === 'food');
  const creams = entries.filter((e) => e.type === 'cream');

  const flareDays = checkins
    .filter((c) => (c.payload as any)?.severity_score >= 7)
    .map((c) => c.timestamp.split('T')[0]);

  const calmDays = checkins.filter((c) => (c.payload as any)?.severity_score <= 4).length;

  // Foods eaten within 24h before a flare
  const suspectFoodCounts: Record<string, number> = {};
  for (const f of foods) {
    const foodTime = new Date(f.timestamp).getTime();
    const nearFlare = flareDays.some((fd) => {
      const flareTime = new Date(fd).getTime();
      return flareTime - foodTime >= 0 && flareTime - foodTime <= 86_400_000;
    });
    if (nearFlare) {
      const name = (f.payload as any)?.name;
      if (name) suspectFoodCounts[name] = (suspectFoodCounts[name] ?? 0) + 1;
    }
  }
  const topSuspects = Object.entries(suspectFoodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const symptoms = checkins
    .flatMap((c) => (c.payload as any)?.symptoms ?? [])
    .reduce((acc: Record<string, number>, s: string) => {
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
  const topSymptoms = Object.entries(symptoms)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  const prompt = `You are a compassionate health tracking assistant helping parents monitor their child's skin condition (such as eczema). Write a brief, warm, data-driven summary.

Data for ${childName} over the past ${rangeDays} days:
- Average condition score: ${avgScore > 0 ? avgScore.toFixed(1) : 'n/a'}/10 (10 = most severe)
- Check-ins logged: ${checkins.length}
- Flare days (score ≥ 7): ${flareDays.length}
- Calm days (score ≤ 4): ${calmDays}
- Cream applications: ${creams.length}
- Foods eaten near flare days: ${topSuspects.length > 0 ? topSuspects.join(', ') : 'none identified yet'}
- Most common symptoms: ${topSymptoms.length > 0 ? topSymptoms.join(', ') : 'none noted'}

Write 2–3 sentences. Be warm and encouraging. If there are potential food patterns, mention them gently. Do not give medical advice. Keep it under 75 words.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}
