-- Plumbline: referral and invite links.
-- Run once on an existing project: Supabase dashboard → SQL Editor → New query → paste this file → Run.
-- Safe to run again. New projects get this from schema.sql.
alter table public.profiles add column if not exists invite_code text;

create table if not exists public.invites (
  id          bigint generated always as identity primary key,
  code        text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 10)
              check (code ~ '^[a-z0-9]{6,20}$'),
  inviter_id  uuid not null default auth.uid() references auth.users on delete cascade,
  role        text check (char_length(role) <= 120),
  task_id     text check (char_length(task_id) <= 80),
  created_at  timestamptz not null default now()
);
create unique index if not exists invites_one_per_target
  on public.invites (inviter_id, coalesce(role, ''), coalesce(task_id, ''));

alter table public.invites enable row level security;
grant select, insert on public.invites to authenticated;

drop policy if exists "Fellows read own invites" on public.invites;
create policy "Fellows read own invites" on public.invites
  for select to authenticated using (auth.uid() = inviter_id);

drop policy if exists "Fellows create own invites" on public.invites;
create policy "Fellows create own invites" on public.invites
  for insert to authenticated with check (auth.uid() = inviter_id);

drop policy if exists "Admins read invites" on public.invites;
create policy "Admins read invites" on public.invites
  for select to authenticated using (public.is_admin());

-- What an invite link points to. Reveals nothing about who sent it.
drop function if exists public.get_invite(text);
create function public.get_invite(p_code text)
returns table (role text, task_id text)
language sql stable security definer set search_path = public as $$
  select i.role, i.task_id from public.invites i where i.code = p_code;
$$;
revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;

-- Counts for the signed-in fellow's own links. Never returns names.
create or replace function public.invite_stats()
returns table (code text, joined bigint, finished bigint)
language sql stable security definer set search_path = public as $$
  select i.code, count(p.id), count(p.completed_at)
  from public.invites i
  left join public.profiles p on p.invite_code = i.code
  where i.inviter_id = auth.uid()
  group by i.code;
$$;
revoke all on function public.invite_stats() from public;
grant execute on function public.invite_stats() to authenticated;

-- Fellows cannot change who invited them.
create or replace function public.guard_profile()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    if new.verification is distinct from old.verification and new.verification <> 'pending' then
      new.verification := old.verification;
    end if;
    new.email := old.email;
    new.invite_code := old.invite_code;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Record the invite at sign-up, so it survives the email confirmation step.
-- An unknown code is ignored and never blocks the sign-up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_role text;
begin
  select i.code, i.role into v_code, v_role from public.invites i
  where i.code = new.raw_user_meta_data ->> 'ref';

  insert into public.profiles (id, email, name, country, heard, role, invite_code)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'heard',
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), v_role),
    v_code
  )
  on conflict (id) do nothing;
  return new;
end $$;
