-- Evenly · invite codes (migration 0002)
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Adds 6-character invite codes to groups so a member can join the SAME synced
-- group from another device: share the code, they enter it, their membership
-- row is created server-side and their app mirrors the group locally.

-- ── invite code column + backfill ───────────────────────────────────────────
create or replace function public.gen_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c text;
begin
  loop
    c := upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.groups where invite_code = c);
  end loop;
  return c;
end;
$$;

alter table public.groups add column invite_code text;
update public.groups set invite_code = public.gen_invite_code() where invite_code is null;
alter table public.groups alter column invite_code set not null;
create unique index groups_invite_code_key on public.groups (invite_code);

-- New groups get a code automatically.
create or replace function public.set_invite_code()
returns trigger
language plpgsql
as $$
begin
  if NEW.invite_code is null then
    NEW.invite_code := public.gen_invite_code();
  end if;
  return NEW;
end;
$$;

create trigger groups_invite_code
  before insert on public.groups
  for each row execute function public.set_invite_code();

-- ── join by code (security definer: invite lookup must work before membership) ─
create or replace function public.join_group_by_code(code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  me uuid := auth.uid();
  my_name text;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into g from public.groups where invite_code = upper(btrim(code));
  if not found then
    raise exception 'invalid invite code';
  end if;
  select display_name into my_name from public.profiles where id = me;
  insert into public.group_members (group_id, profile_id, member_name)
  values (g.id, me, coalesce(my_name, 'Member'))
  on conflict (group_id, profile_id) do nothing;
  return jsonb_build_object('id', g.id, 'name', g.name);
end;
$$;

grant execute on function public.join_group_by_code(text) to authenticated;

-- ── members may rename their OWN membership row (keeps name mapping tidy) ──
create policy "members: update own name" on public.group_members
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
