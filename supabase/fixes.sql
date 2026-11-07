-- Plumbline: rejected documents must be replaced, and the skills check has five attempts.
-- Run once on an existing project, after operations.sql:
-- Supabase dashboard → SQL Editor → New query → paste this file → Run.
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
