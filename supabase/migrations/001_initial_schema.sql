-- Sprout — Initial Schema
-- Run this in Supabase SQL editor: https://supabase.com/dashboard → SQL Editor

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── families ────────────────────────────────────────────────────────────────
create table families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz default now()
);

-- ── profiles (one per auth user) ────────────────────────────────────────────
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  family_id    uuid references families(id) on delete set null,
  display_name text not null default '',
  created_at   timestamptz default now()
);

-- Auto-create profile on sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── subjects (children being tracked) ────────────────────────────────────────
create table subjects (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  name       text not null,
  birthday   date,
  pronouns   text,
  conditions text[] default '{}',
  color      text default '#C97A4A',
  created_at timestamptz default now()
);

-- ── library_items (saved medications, creams, supplements) ───────────────────
create table library_items (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references subjects(id) on delete cascade,
  type         text not null check (type in ('medication','cream','supplement')),
  name         text not null,
  barcode      text,
  ingredients  text[] default '{}',
  default_dose text,
  created_at   timestamptz default now()
);

-- ── log_entries ──────────────────────────────────────────────────────────────
create table log_entries (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  logged_by  uuid not null references profiles(id) on delete set null,
  type       text not null check (type in ('food','medication','cream','sleep','checkin','photo','note')),
  timestamp  timestamptz not null default now(),
  payload    jsonb not null default '{}',
  photo_urls text[] default '{}',
  weather    jsonb,
  created_at timestamptz default now()
);

-- Index for fast timeline queries
create index log_entries_subject_timestamp on log_entries(subject_id, timestamp desc);
create index log_entries_type on log_entries(subject_id, type);

-- ── Row-Level Security ────────────────────────────────────────────────────────

alter table families       enable row level security;
alter table profiles       enable row level security;
alter table subjects       enable row level security;
alter table library_items  enable row level security;
alter table log_entries    enable row level security;

-- profiles: users can read/update their own profile
create policy "profiles: own"
  on profiles for all
  using (auth.uid() = id);

-- families: members can read their family
create policy "families: members can read"
  on families for select
  using (id in (select family_id from profiles where id = auth.uid()));

-- families: any authenticated user can create (on onboarding)
create policy "families: create"
  on families for insert
  with check (auth.role() = 'authenticated');

-- families: members can update their family name
create policy "families: members can update"
  on families for update
  using (id in (select family_id from profiles where id = auth.uid()));

-- subjects: family members can CRUD
create policy "subjects: family members"
  on subjects for all
  using (family_id in (select family_id from profiles where id = auth.uid()))
  with check (family_id in (select family_id from profiles where id = auth.uid()));

-- library_items: family members of the subject's family
create policy "library_items: family members"
  on library_items for all
  using (
    subject_id in (
      select s.id from subjects s
      join profiles p on p.family_id = s.family_id
      where p.id = auth.uid()
    )
  );

-- log_entries: family members of the subject's family
create policy "log_entries: family members"
  on log_entries for all
  using (
    subject_id in (
      select s.id from subjects s
      join profiles p on p.family_id = s.family_id
      where p.id = auth.uid()
    )
  );
