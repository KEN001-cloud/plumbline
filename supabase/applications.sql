-- Plumbline: one fellow, many role applications.
-- Run once on an existing project: Supabase dashboard → SQL Editor → New query → paste this file → Run.
-- Safe to run again. New projects get this from schema.sql.
create table if not exists public.applications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  role        text not null check (char_length(role) between 1 and 120),
  skills      text[] not null check (cardinality(skills) between 1 and 30),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.applications enable row level security;
grant select, insert, update on public.applications to authenticated;

drop policy if exists "Fellows read own applications" on public.applications;
create policy "Fellows read own applications" on public.applications
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Fellows create own applications" on public.applications;
create policy "Fellows create own applications" on public.applications
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Fellows update own applications" on public.applications;
create policy "Fellows update own applications" on public.applications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admins read applications" on public.applications;
create policy "Admins read applications" on public.applications
  for select to authenticated using (public.is_admin());
