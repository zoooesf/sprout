# Sprout 🌱

A calm, shared health tracking app for parents monitoring a child's skin and health conditions.

## Quick Start

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In your project, open the **SQL Editor** and run the contents of:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Go to **Settings → API** and copy your **Project URL** and **anon/public key**

### 2. Configure environment

Edit `.env.local` and replace the placeholder values:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run the app

```bash
cd sprout
npm start
```

Scan the QR code with:
- **iPhone**: Camera app or Expo Go
- **Android**: Expo Go app

---

## Connecting two parents

1. **Parent 1** signs up, creates a family, adds the child
2. Go to **Settings → Invite your co-parent**
3. Share the invite code with **Parent 2**
4. **Parent 2** signs up, taps "Have a family code?" on welcome screen, enters the code

---

## Project Structure

```
app/
  (auth)/          ← Sign-up, sign-in, onboarding screens
  (tabs)/
    index.tsx      ← Today / timeline
    insights.tsx   ← Charts + AI summaries
    settings.tsx   ← Family, notifications, library
components/        ← Shared UI components
hooks/             ← Data fetching (React Query)
lib/
  tokens.ts        ← Design tokens (colors, typography)
  supabase.ts      ← Supabase client + TypeScript types
stores/
  auth.ts          ← Zustand auth store
supabase/
  migrations/      ← SQL schema (run in Supabase SQL Editor)
```

---

## Phase 2 Roadmap

- [ ] Barcode scanning (Open Food Facts API)
- [ ] Photo attachment to log entries
- [ ] AI label extraction (Claude API)
- [ ] Weather auto-fetch (Open-Meteo)
- [ ] Trigger heatmap on Insights screen
- [ ] Full AI narrative (Claude API integration)

## Phase 3 Roadmap

- [ ] Exportable PDF report for doctor visits
- [ ] Offline-first sync (Expo SQLite queue)
- [ ] Push notification reminders
- [ ] Library management UI
