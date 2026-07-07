-- ============================================================
-- AuraIQ Supabase Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Profiles (auto-created on signup)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  plan text default 'free',
  study_streak integer default 0,
  last_active timestamptz,
  created_at timestamptz default now()
);

-- Subjects
create table if not exists public.subjects (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  mastery_score float default 0,
  created_at timestamptz default now()
);

-- Flashcards
create table if not exists public.flashcards (
  id bigserial primary key,
  subject_id bigint references public.subjects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  question text not null,
  answer text not null,
  difficulty text default 'medium',
  next_review_at timestamptz default now(),
  interval_days integer default 1,
  ease_factor float default 2.5,
  created_at timestamptz default now()
);

-- Saved note summaries (one per subject; subject_id null = "All Subjects")
create table if not exists public.summaries (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id bigint references public.subjects(id) on delete cascade,
  scope_label text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Study sessions
create table if not exists public.study_sessions (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id bigint references public.subjects(id) on delete set null,
  duration_minutes integer default 0,
  cards_reviewed integer default 0,
  correct_answers integer default 0,
  accuracy float default 0,
  created_at timestamptz default now()
);

-- ── Enable RLS ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_sessions enable row level security;
alter table public.summaries enable row level security;

-- ── RLS Policies ───────────────────────────────────────────
-- profiles
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- subjects
create policy "own subjects" on public.subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- flashcards
create policy "own flashcards" on public.flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions
create policy "own sessions" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- summaries
create policy "own summaries" on public.summaries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Auto-create profile on signup ──────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
