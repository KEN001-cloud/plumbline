-- Plumbline database schema for Supabase.
-- Run once: Supabase dashboard → SQL Editor → New query → paste this file → Run.

-- ─────────────────────────────────────────────────────────────
-- Team admins (add yourself after signing up — see README)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id     uuid primary key references auth.users on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "Admins see own row" on public.admins;
create policy "Admins see own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Fellow profiles (one row per auth user, created automatically)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users on delete cascade,
  email           text,
  name            text,
  country         text,
  heard           text,
  role            text,
  field           text,
  edu             text,
  subject         text,
  years           text,
  link            text,
  other_fields    text[] not null default '{}',
  langs           text[] not null default '{English}',
  work_auth       text,
  hours           text,
  tz              text,
  task_types      text[] not null default '{}',
  id_type         text,
  id_front_path   text,
  selfie_path     text,
  resume_path     text,
  verification    text not null default 'not_submitted'
                  check (verification in ('not_submitted', 'pending', 'verified', 'rejected')),
  quiz_score      int,
  training_done   int[] not null default '{}',
  signed_name     text,
  signed_at       timestamptz,
  payout          text,
  paused          boolean not null default false,
  step            int not null default 0,
  max_step        int not null default 0,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Fellows read own profile" on public.profiles;
create policy "Fellows read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Fellows update own profile" on public.profiles;
create policy "Fellows update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Fellows may only move their own verification to 'pending'. Only your team
-- (dashboard / service role) can set 'verified' or 'rejected'.
create or replace function public.guard_profile()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    if new.verification is distinct from old.verification and new.verification <> 'pending' then
      new.verification := old.verification;
    end if;
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

-- Create the profile row when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, country, heard, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'heard',
    new.raw_user_meta_data ->> 'role'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Messages from the help center and the For AI labs form
-- Anyone can send; nobody can read them through the public API.
-- Read them in Table Editor, and get each one by email (see README).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  ref         text not null unique,
  kind        text not null check (kind in ('support', 'labs')),
  name        text not null check (char_length(name) between 1 and 200),
  email       text not null check (char_length(email) between 3 and 320),
  topic       text,
  company     text,
  details     jsonb not null default '{}',
  message     text not null check (char_length(message) between 1 and 5000),
  user_id     uuid references auth.users on delete set null,
  status      text not null default 'new',
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Anyone can send a message" on public.messages;
create policy "Anyone can send a message" on public.messages
  for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Task submissions from the workspace
-- ─────────────────────────────────────────────────────────────
create table if not exists public.task_submissions (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  task_id        text not null,
  rating_a       int not null check (rating_a between 1 and 5),
  rating_b       int not null check (rating_b between 1 and 5),
  preferred      text not null check (preferred in ('A', 'B', 'tie')),
  justification  text not null check (char_length(justification) between 40 and 5000),
  flagged        boolean not null default false,
  status         text not null default 'in_review',
  created_at     timestamptz not null default now(),
  unique (user_id, task_id)
);

alter table public.task_submissions enable row level security;

drop policy if exists "Fellows read own submissions" on public.task_submissions;
create policy "Fellows read own submissions" on public.task_submissions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Fellows submit tasks" on public.task_submissions;
create policy "Fellows submit tasks" on public.task_submissions
  for insert to authenticated with check (auth.uid() = user_id and status = 'in_review');

-- ─────────────────────────────────────────────────────────────
-- Private file storage for IDs, selfies and CVs
-- Files live under <user id>/..., and only that user (and your team) can reach them.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('fellow-files', 'fellow-files', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "Fellows upload own files" on storage.objects;
create policy "Fellows upload own files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fellow-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Fellows replace own files" on storage.objects;
create policy "Fellows replace own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'fellow-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Fellows read own files" on storage.objects;
create policy "Fellows read own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'fellow-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- Admin access (admin.html)
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read messages" on public.messages;
create policy "Admins read messages" on public.messages
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins update messages" on public.messages;
create policy "Admins update messages" on public.messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read submissions" on public.task_submissions;
create policy "Admins read submissions" on public.task_submissions
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins update submissions" on public.task_submissions;
create policy "Admins update submissions" on public.task_submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read fellow files" on storage.objects;
create policy "Admins read fellow files" on storage.objects
  for select to authenticated using (bucket_id = 'fellow-files' and public.is_admin());

-- ───────────────────────────────────────
-- Role applications: one row per fellow per role
-- ───────────────────────────────────────
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

-- ───────────────────────────────────────
-- Referral and invite links
-- ───────────────────────────────────────
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

-- ───────────────────────────────────────
-- Project invitations, tasks by project, and banning
-- ───────────────────────────────────────
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists ban_reason text;

create or replace function public.is_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and banned_at is not null);
$$;
grant execute on function public.is_banned() to authenticated;

-- Fellows cannot change their own verification, invite code or ban.
create or replace function public.guard_profile()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    if new.verification is distinct from old.verification and new.verification <> 'pending' then
      new.verification := old.verification;
    end if;
    new.email := old.email;
    new.invite_code := old.invite_code;
    new.banned_at := old.banned_at;
    new.ban_reason := old.ban_reason;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Which tasks belong to which project. Add a row here when a task is added to data.js.
create table if not exists public.task_projects (
  task_id  text not null,
  project  text not null,
  primary key (task_id, project)
);
alter table public.task_projects enable row level security;
grant select on public.task_projects to authenticated;
drop policy if exists "Signed-in users read task projects" on public.task_projects;
create policy "Signed-in users read task projects" on public.task_projects
  for select to authenticated using (true);
insert into public.task_projects (task_id, project) values
  ('rust-borrow-01', 'Rust Systems Reviewer'),
  ('rust-borrow-01', 'Software Engineer'),
  ('chem-ice-01', 'Chemistry Expert'),
  ('fin-ebitda-01', 'FP&A Analyst'),
  ('fin-ebitda-01', 'Accountant'),
  ('sw-translate-01', 'Swahili Language Expert')
on conflict do nothing;

-- A fellow's place on a project: invited by the team, then joined by the fellow.
create table if not exists public.project_members (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  project     text not null check (char_length(project) between 1 and 120),
  status      text not null default 'invited' check (status in ('invited', 'joined')),
  invited_at  timestamptz not null default now(),
  joined_at   timestamptz,
  unique (user_id, project)
);
alter table public.project_members enable row level security;
grant select, insert, delete on public.project_members to authenticated;

drop policy if exists "Fellows read own projects" on public.project_members;
create policy "Fellows read own projects" on public.project_members
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Admins read projects" on public.project_members;
create policy "Admins read projects" on public.project_members
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins invite to projects" on public.project_members;
create policy "Admins invite to projects" on public.project_members
  for insert to authenticated with check (public.is_admin() and status = 'invited');

drop policy if exists "Admins remove from projects" on public.project_members;
create policy "Admins remove from projects" on public.project_members
  for delete to authenticated using (public.is_admin());

-- Only verified people who are not banned can be invited.
create or replace function public.check_project_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.user_id and p.verification = 'verified' and p.banned_at is null) then
    raise exception 'Only verified fellows who are not banned can be invited to a project.';
  end if;
  return new;
end $$;
drop trigger if exists check_project_invite on public.project_members;
create trigger check_project_invite before insert on public.project_members
  for each row execute function public.check_project_invite();

-- A fellow accepts an invitation.
create or replace function public.join_project(p_project text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.project_members m set status = 'joined', joined_at = now()
  where m.user_id = auth.uid() and m.project = p_project and m.status = 'invited'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.verification = 'verified' and p.banned_at is null);
  return found;
end $$;
revoke all on function public.join_project(text) from public;
grant execute on function public.join_project(text) to authenticated;

-- Tasks are open only to verified fellows, not banned, who joined a project containing the task.
create or replace function public.can_do_task(p_task text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.task_projects t
    join public.project_members m on m.project = t.project and m.status = 'joined'
    join public.profiles p on p.id = m.user_id
    where t.task_id = p_task and m.user_id = auth.uid()
      and p.verification = 'verified' and p.banned_at is null
  );
$$;
revoke all on function public.can_do_task(text) from public;
grant execute on function public.can_do_task(text) to authenticated;

drop policy if exists "Fellows submit tasks" on public.task_submissions;
create policy "Fellows submit tasks" on public.task_submissions
  for insert to authenticated with check (auth.uid() = user_id and status = 'in_review' and public.can_do_task(task_id));

-- Banned fellows cannot create new invite links.
drop policy if exists "Fellows create own invites" on public.invites;
create policy "Fellows create own invites" on public.invites
  for insert to authenticated with check (auth.uid() = inviter_id and not public.is_banned());

-- ───────────────────────────────────────
-- Security fixes and day-to-day operations
-- ───────────────────────────────────────

-- ─────────────────────────────────────────────────
-- Profile rules
-- ─────────────────────────────────────────────────
create or replace function public.guard_profile()
returns trigger language plpgsql as $$
declare
  me text := auth.uid()::text;
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    new.email := old.email;
    new.invite_code := old.invite_code;
    new.banned_at := old.banned_at;
    new.ban_reason := old.ban_reason;

    -- Stored files must be the fellow's own.
    if new.id_front_path is distinct from old.id_front_path and new.id_front_path not like me || '/%' then new.id_front_path := old.id_front_path; end if;
    if new.selfie_path is distinct from old.selfie_path and new.selfie_path not like me || '/%' then new.selfie_path := old.selfie_path; end if;
    if new.resume_path is distinct from old.resume_path and new.resume_path not like me || '/%' then new.resume_path := old.resume_path; end if;

    -- Only the server grades the skills check.
    if coalesce(current_setting('plumbline.server', true), '') <> '1' then new.quiz_score := old.quiz_score; end if;

    -- Links shown to the team must be ordinary web links.
    if new.link is not null and new.link !~* '^https?://' then new.link := null; end if;

    -- Verification: a fellow can only ask for review, and only with both documents.
    if new.verification is distinct from old.verification
       and not (new.verification = 'pending' and new.id_front_path is not null and new.selfie_path is not null) then
      new.verification := old.verification;
    end if;

    -- Changing identity details on a verified account sends it back to review.
    if old.verification = 'verified' and (
         new.name is distinct from old.name or new.id_type is distinct from old.id_type
         or new.id_front_path is distinct from old.id_front_path or new.selfie_path is distinct from old.selfie_path) then
      new.verification := 'pending';
    end if;

    -- Onboarding can only finish when its steps are really done.
    if new.completed_at is distinct from old.completed_at and not (
         new.completed_at is not null and coalesce(new.quiz_score, 0) >= 2 and cardinality(new.training_done) >= 4
         and new.id_front_path is not null and new.selfie_path is not null
         and new.signed_name is not null and new.payout is not null) then
      new.completed_at := old.completed_at;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ─────────────────────────────────────────────────
-- Skills check, graded on the server
-- ─────────────────────────────────────────────────
create table if not exists public.quiz_key (
  question  int primary key,
  answer    int not null
);
alter table public.quiz_key enable row level security;   -- no policies: nobody reads this directly
insert into public.quiz_key (question, answer) values (0, 1), (1, 2), (2, 0) on conflict do nothing;

create or replace function public.grade_quiz(p_answers int[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_results jsonb;
  v_score int;
begin
  select jsonb_agg(p_answers[k.question + 1] = k.answer order by k.question),
         count(*) filter (where p_answers[k.question + 1] = k.answer)
    into v_results, v_score
  from public.quiz_key k;
  perform set_config('plumbline.server', '1', true);
  update public.profiles set quiz_score = v_score where id = auth.uid();
  perform set_config('plumbline.server', '', true);
  return jsonb_build_object('score', v_score, 'results', v_results);
end $$;
revoke all on function public.grade_quiz(int[]) from public;
grant execute on function public.grade_quiz(int[]) to authenticated;

-- ─────────────────────────────────────────────────
-- Files
-- ─────────────────────────────────────────────────
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'fellow-files';

-- A verified fellow's ID and selfie cannot be swapped. Their CV can.
create or replace function public.may_change_file(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select split_part(p_name, '/', 2) like 'resume.%'
      or not exists (select 1 from public.profiles where id = auth.uid() and verification = 'verified');
$$;
grant execute on function public.may_change_file(text) to authenticated;

drop policy if exists "Fellows upload own files" on storage.objects;
create policy "Fellows upload own files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fellow-files' and (storage.foldername(name))[1] = auth.uid()::text and public.may_change_file(name));

drop policy if exists "Fellows replace own files" on storage.objects;
create policy "Fellows replace own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'fellow-files' and (storage.foldername(name))[1] = auth.uid()::text and public.may_change_file(name));

drop policy if exists "Admins delete fellow files" on storage.objects;
create policy "Admins delete fellow files" on storage.objects
  for delete to authenticated using (bucket_id = 'fellow-files' and public.is_admin());

-- ─────────────────────────────────────────────────
-- Help and labs messages: limits, and a pipeline for labs
-- ─────────────────────────────────────────────────
alter table public.messages add column if not exists pipeline text not null default 'new';
alter table public.messages drop constraint if exists messages_pipeline_check;
alter table public.messages add constraint messages_pipeline_check
  check (pipeline in ('new', 'contacted', 'proposal', 'won', 'lost'));

create or replace function public.guard_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Please enter a valid email address.';
  end if;
  if (select count(*) from public.messages where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.messages where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'Too many messages right now. Please try again later.';
  end if;
  if pg_column_size(new.details) > 4000 then raise exception 'That message has too much detail.'; end if;
  new.topic := left(new.topic, 200);
  new.company := left(new.company, 200);
  new.created_at := now();
  new.status := 'new';
  new.pipeline := 'new';
  return new;
end $$;
drop trigger if exists guard_message on public.messages;
create trigger guard_message before insert on public.messages
  for each row execute function public.guard_message();

-- ─────────────────────────────────────────────────
-- Tasks live in the database, visible only to people who can work on them
-- ─────────────────────────────────────────────────
create table if not exists public.tasks (
  id          text primary key,
  title       text not null check (char_length(title) between 1 and 200),
  type        text not null,
  field       text not null,
  mins        text not null,
  rate_cents  int not null check (rate_cents between 0 and 100000),
  prompt      text not null,
  a           text not null,
  b           text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.tasks enable row level security;
grant select, insert, update, delete on public.tasks to authenticated;
grant insert, delete on public.task_projects to authenticated;

insert into public.tasks (id, title, type, field, mins, rate_cents, prompt, a, b) values
  ($t$rust-borrow-01$t$, $t$Diagnose a Rust borrow-checker error$t$, $t$Code review$t$, $t$Software engineering$t$, $t$20 min$t$, 15000, $t$Why does this fail to compile, and how do I fix it?

let v = vec![1, 2, 3];
let first = &v[0];
v.push(4);
println!("{}", first);$t$, $t$You hold an immutable borrow (`first`) while calling `push`, which needs a mutable borrow — and `v` isn’t declared `mut` either. Make `v` mutable and read `first` before pushing, or copy the value: `let first = v[0];`.$t$, $t$Vectors in Rust have a fixed size once created, so `push` is never allowed. Use an array like `[1, 2, 3, 4]` instead.$t$),
  ($t$chem-ice-01$t$, $t$Why does ice float?$t$, $t$Fact-checking$t$, $t$Chemistry$t$, $t$10 min$t$, 8000, $t$Explain simply why ice floats on liquid water.$t$, $t$Ice floats because it contains lots of tiny trapped air bubbles that make it lighter than water.$t$, $t$When water freezes, hydrogen bonds lock molecules into an open hexagonal lattice. That structure takes up more space than liquid water, so ice is less dense — roughly 9% — and floats.$t$),
  ($t$fin-ebitda-01$t$, $t$EBITDA vs. net income$t$, $t$Ranking responses$t$, $t$Finance$t$, $t$15 min$t$, 8000, $t$What is the difference between EBITDA and net income?$t$, $t$EBITDA is earnings before interest, taxes, depreciation and amortization — a proxy for operating profitability. Net income is what remains after every expense, including interest, taxes, D&A and one-off items.$t$, $t$They are the same number. EBITDA is just the name analysts use for net income on investor slides.$t$),
  ($t$sw-translate-01$t$, $t$Check a Swahili translation$t$, $t$Translation review$t$, $t$Swahili$t$, $t$8 min$t$, 4500, $t$Translate into Swahili: “The meeting has been moved to Thursday.”$t$, $t$Mkutano umehamishwa hadi Jumanne.$t$, $t$Mkutano umehamishwa hadi Alhamisi.$t$)
on conflict (id) do nothing;

create or replace function public.can_do_task(p_task text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.task_projects t
    join public.tasks k on k.id = t.task_id and k.active
    join public.project_members m on m.project = t.project and m.status = 'joined'
    join public.profiles p on p.id = m.user_id
    where t.task_id = p_task and m.user_id = auth.uid()
      and p.verification = 'verified' and p.banned_at is null
  );
$$;

drop policy if exists "Fellows read their tasks" on public.tasks;
create policy "Fellows read their tasks" on public.tasks
  for select to authenticated using (public.is_admin() or public.can_do_task(id));
drop policy if exists "Admins add tasks" on public.tasks;
create policy "Admins add tasks" on public.tasks for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins edit tasks" on public.tasks;
create policy "Admins edit tasks" on public.tasks for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete tasks" on public.tasks;
create policy "Admins delete tasks" on public.tasks for delete to authenticated using (public.is_admin());
drop policy if exists "Admins link tasks" on public.task_projects;
create policy "Admins link tasks" on public.task_projects for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins unlink tasks" on public.task_projects;
create policy "Admins unlink tasks" on public.task_projects for delete to authenticated using (public.is_admin());

drop function if exists public.get_invite(text);
create function public.get_invite(p_code text)
returns table (role text, task_id text, task_title text)
language sql stable security definer set search_path = public as $$
  select i.role, i.task_id, k.title from public.invites i
  left join public.tasks k on k.id = i.task_id
  where i.code = p_code;
$$;
revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;

-- ─────────────────────────────────────────────────
-- Pay: reviewed work and recorded payouts. Fellows are never charged.
-- ─────────────────────────────────────────────────
create table if not exists public.payouts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users on delete cascade,
  amount_cents  int not null check (amount_cents > 0),
  method        text,
  reference     text not null check (char_length(reference) between 1 and 200),
  created_at    timestamptz not null default now()
);
alter table public.payouts enable row level security;
grant select on public.payouts to authenticated;
drop policy if exists "Fellows read own payouts" on public.payouts;
create policy "Fellows read own payouts" on public.payouts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Admins read payouts" on public.payouts;
create policy "Admins read payouts" on public.payouts for select to authenticated using (public.is_admin());

alter table public.task_submissions add column if not exists minutes int check (minutes between 1 and 480);
alter table public.task_submissions add column if not exists approved_minutes int check (approved_minutes between 0 and 480);
alter table public.task_submissions add column if not exists pay_cents int not null default 0;
alter table public.task_submissions add column if not exists review_note text check (char_length(review_note) <= 2000);
alter table public.task_submissions add column if not exists payout_id bigint references public.payouts;
alter table public.task_submissions add column if not exists reviewed_at timestamptz;
alter table public.task_submissions drop constraint if exists task_submissions_status_check;
alter table public.task_submissions add constraint task_submissions_status_check
  check (status in ('in_review', 'approved', 'rejected'));

create or replace function public.guard_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_rate int;
begin
  if tg_op = 'INSERT' then
    if new.minutes is null then raise exception 'Please enter the minutes you worked.'; end if;
    new.status := 'in_review'; new.approved_minutes := null; new.pay_cents := 0;
    new.review_note := null; new.payout_id := null; new.reviewed_at := null; new.created_at := now();
    return new;
  end if;
  if new.status is distinct from old.status or new.approved_minutes is distinct from old.approved_minutes then
    if old.payout_id is not null then raise exception 'This work has already been paid.'; end if;
    new.reviewed_at := now();
    if new.status = 'approved' then
      select rate_cents into v_rate from public.tasks where id = new.task_id;
      new.approved_minutes := coalesce(new.approved_minutes, new.minutes, 0);
      new.pay_cents := round(coalesce(v_rate, 0) * new.approved_minutes / 60.0);
    else
      new.approved_minutes := null; new.pay_cents := 0;
    end if;
    if new.status = 'rejected' and coalesce(btrim(new.review_note), '') = '' then
      raise exception 'Please give a reason for rejecting this work.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_submission on public.task_submissions;
create trigger guard_submission before insert or update on public.task_submissions
  for each row execute function public.guard_submission();

-- Records money already sent through your payment provider. It moves no money itself.
create or replace function public.record_payout(p_user uuid, p_reference text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_id bigint;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select coalesce(sum(pay_cents), 0) into v_total from public.task_submissions
  where user_id = p_user and status = 'approved' and payout_id is null;
  if v_total <= 0 then raise exception 'Nothing is owed to this person.'; end if;
  insert into public.payouts (user_id, amount_cents, method, reference)
  values (p_user, v_total, (select payout from public.profiles where id = p_user), p_reference)
  returning id into v_id;
  update public.task_submissions set payout_id = v_id
  where user_id = p_user and status = 'approved' and payout_id is null;
  return v_id;
end $$;
revoke all on function public.record_payout(uuid, text) from public;
grant execute on function public.record_payout(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────
-- Application decisions, and withdrawing
-- ─────────────────────────────────────────────────
alter table public.applications add column if not exists status text not null default 'submitted';
alter table public.applications add column if not exists decided_at timestamptz;
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('submitted', 'accepted', 'rejected', 'withdrawn'));

create or replace function public.guard_application()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then new.status := 'submitted'; new.decided_at := null; end if;
    return new;
  end if;
  if public.is_admin() then
    if new.status is distinct from old.status then new.decided_at := now(); end if;
  elsif not (new.status = old.status
             or (new.status = 'withdrawn' and old.status in ('submitted', 'accepted'))
             or (new.status = 'submitted' and old.status = 'withdrawn')) then
    new.status := old.status;
  end if;
  if not public.is_admin() then new.decided_at := old.decided_at; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_application on public.applications;
create trigger guard_application before insert or update on public.applications
  for each row execute function public.guard_application();

drop policy if exists "Admins decide applications" on public.applications;
create policy "Admins decide applications" on public.applications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────
-- Ban appeals
-- ─────────────────────────────────────────────────
create table if not exists public.appeals (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  message     text not null check (char_length(message) between 20 and 2000),
  status      text not null default 'open' check (status in ('open', 'upheld', 'denied')),
  response    text check (char_length(response) <= 2000),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create unique index if not exists appeals_one_open on public.appeals (user_id) where status = 'open';
alter table public.appeals enable row level security;
grant select, insert, update on public.appeals to authenticated;

drop policy if exists "Fellows read own appeals" on public.appeals;
create policy "Fellows read own appeals" on public.appeals for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Banned fellows appeal" on public.appeals;
create policy "Banned fellows appeal" on public.appeals
  for insert to authenticated with check (auth.uid() = user_id and status = 'open' and response is null and public.is_banned());
drop policy if exists "Admins read appeals" on public.appeals;
create policy "Admins read appeals" on public.appeals for select to authenticated using (public.is_admin());
drop policy if exists "Admins decide appeals" on public.appeals;
create policy "Admins decide appeals" on public.appeals
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────
-- Notifications, written by the database when something happens
-- ─────────────────────────────────────────────────
create table if not exists public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  email       text,
  kind        text not null,
  title       text not null,
  body        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists "Fellows read own notifications" on public.notifications;
create policy "Fellows read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Fellows mark own notifications read" on public.notifications;
create policy "Fellows mark own notifications read" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.notify_user(p_user uuid, p_kind text, p_title text, p_body text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, email, kind, title, body)
  values (p_user, (select email from public.profiles where id = p_user), p_kind, p_title, p_body);
$$;
revoke all on function public.notify_user(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.on_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification is distinct from old.verification then
    if new.verification = 'verified' then
      perform public.notify_user(new.id, 'verified', 'Your identity is verified', 'We will invite you to a project that matches your applications.');
    elsif new.verification = 'rejected' then
      perform public.notify_user(new.id, 'rejected', 'We could not verify your identity', 'Please check your documents and submit them again, or contact us.');
    end if;
  end if;
  if old.banned_at is null and new.banned_at is not null then
    perform public.notify_user(new.id, 'banned', 'Your account has been banned', coalesce(new.ban_reason, 'No reason given') || '. You can appeal from your workspace.');
  elsif old.banned_at is not null and new.banned_at is null then
    perform public.notify_user(new.id, 'unbanned', 'Your ban has been removed', 'You can work on your projects again.');
  end if;
  return new;
end $$;
drop trigger if exists on_profile_change on public.profiles;
create trigger on_profile_change after update on public.profiles
  for each row execute function public.on_profile_change();

create or replace function public.on_member_invited()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_user(new.user_id, 'invited', 'You are invited to ' || new.project, 'Open your workspace to join the project.');
  return new;
end $$;
drop trigger if exists on_member_invited on public.project_members;
create trigger on_member_invited after insert on public.project_members
  for each row execute function public.on_member_invited();

create or replace function public.on_submission_reviewed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    select title into v_title from public.tasks where id = new.task_id;
    perform public.notify_user(new.user_id, 'task_' || new.status,
      'Task ' || new.status || ': ' || coalesce(v_title, new.task_id),
      case when new.status = 'rejected' then new.review_note else 'Earned $' || to_char(new.pay_cents / 100.0, 'FM999990.00') end);
  end if;
  return new;
end $$;
drop trigger if exists on_submission_reviewed on public.task_submissions;
create trigger on_submission_reviewed after update on public.task_submissions
  for each row execute function public.on_submission_reviewed();

create or replace function public.on_application_decided()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('accepted', 'rejected') then
    perform public.notify_user(new.user_id, 'application_' || new.status, 'Application ' || new.status || ': ' || new.role, null);
  end if;
  return new;
end $$;
drop trigger if exists on_application_decided on public.applications;
create trigger on_application_decided after update on public.applications
  for each row execute function public.on_application_decided();

create or replace function public.on_appeal_decided()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status <> 'open' then
    new.decided_at := now();
    if new.status = 'upheld' then
      update public.profiles set banned_at = null, ban_reason = null where id = new.user_id;
    else
      perform public.notify_user(new.user_id, 'appeal_denied', 'Your appeal was not successful', new.response);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists on_appeal_decided on public.appeals;
create trigger on_appeal_decided before update on public.appeals
  for each row execute function public.on_appeal_decided();

create or replace function public.on_payout_recorded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_user(new.user_id, 'payout', 'Payout recorded: $' || to_char(new.amount_cents / 100.0, 'FM999990.00'), 'Reference: ' || new.reference);
  return new;
end $$;
drop trigger if exists on_payout_recorded on public.payouts;
create trigger on_payout_recorded after insert on public.payouts
  for each row execute function public.on_payout_recorded();

-- ───────────────────────────────────────
-- Rejected documents and skills check attempts
-- ───────────────────────────────────────
alter table public.profiles add column if not exists quiz_attempts int not null default 0;

create or replace function public.guard_profile()
returns trigger language plpgsql as $$
declare
  me text := auth.uid()::text;
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    new.email := old.email;
    new.invite_code := old.invite_code;
    new.banned_at := old.banned_at;
    new.ban_reason := old.ban_reason;

    -- Stored files must be the fellow's own.
    if new.id_front_path is distinct from old.id_front_path and new.id_front_path not like me || '/%' then new.id_front_path := old.id_front_path; end if;
    if new.selfie_path is distinct from old.selfie_path and new.selfie_path not like me || '/%' then new.selfie_path := old.selfie_path; end if;
    if new.resume_path is distinct from old.resume_path and new.resume_path not like me || '/%' then new.resume_path := old.resume_path; end if;

    -- Only the server grades the skills check.
    if coalesce(current_setting('plumbline.server', true), '') <> '1' then
      new.quiz_score := old.quiz_score;
      new.quiz_attempts := old.quiz_attempts;
    end if;

    -- Links shown to the team must be ordinary web links.
    if new.link is not null and new.link !~* '^https?://' then new.link := null; end if;

    -- Verification: a fellow can only ask for review, and only with both documents.
    if new.verification is distinct from old.verification
       and not (new.verification = 'pending' and new.id_front_path is not null and new.selfie_path is not null) then
      new.verification := old.verification;
    end if;

    -- After a rejection, a new review needs a new ID photo or selfie.
    if old.verification = 'rejected' and new.verification = 'pending'
       and new.id_front_path is not distinct from old.id_front_path
       and new.selfie_path is not distinct from old.selfie_path then
      new.verification := old.verification;
    end if;

    -- Changing identity details on a verified account sends it back to review.
    if old.verification = 'verified' and (
         new.name is distinct from old.name or new.id_type is distinct from old.id_type
         or new.id_front_path is distinct from old.id_front_path or new.selfie_path is distinct from old.selfie_path) then
      new.verification := 'pending';
    end if;

    -- Onboarding can only finish when its steps are really done.
    if new.completed_at is distinct from old.completed_at and not (
         new.completed_at is not null and coalesce(new.quiz_score, 0) >= 2 and cardinality(new.training_done) >= 4
         and new.id_front_path is not null and new.selfie_path is not null
         and new.signed_name is not null and new.payout is not null) then
      new.completed_at := old.completed_at;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.grade_quiz(p_answers int[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_results jsonb;
  v_score int;
  v_used int;
  v_best int;
begin
  select quiz_attempts, coalesce(quiz_score, 0) into v_used, v_best from public.profiles where id = auth.uid();
  if v_used >= 5 and v_best < 2 then
    raise exception 'You have used all 5 attempts at the skills check. Contact us to ask for a reset.';
  end if;
  select jsonb_agg(p_answers[k.question + 1] = k.answer order by k.question),
         count(*) filter (where p_answers[k.question + 1] = k.answer)
    into v_results, v_score
  from public.quiz_key k;
  perform set_config('plumbline.server', '1', true);
  update public.profiles set quiz_score = v_score, quiz_attempts = quiz_attempts + 1 where id = auth.uid();
  perform set_config('plumbline.server', '', true);
  return jsonb_build_object('score', v_score, 'results', v_results);
end $$;
revoke all on function public.grade_quiz(int[]) from public;
grant execute on function public.grade_quiz(int[]) to authenticated;

-- Replaced ID photos are removed, not kept.
drop policy if exists "Fellows delete own ID files" on storage.objects;
create policy "Fellows delete own ID files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fellow-files' and (storage.foldername(name))[1] = auth.uid()::text
         and split_part(name, '/', 2) not like 'resume.%' and public.may_change_file(name));
