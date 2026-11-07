-- Plumbline: project invitations, tasks by project, and banning.
-- Run once on an existing project, after applications.sql and referrals.sql:
-- Supabase dashboard → SQL Editor → New query → paste this file → Run. Safe to run again.
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
