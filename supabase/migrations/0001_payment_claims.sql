-- Evenly · payment-claims backend (migration 0001)
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Model:
--   profiles        one row per auth user
--   groups          server-side mirror of an Evenly group (for sync scope)
--   group_members   which profiles belong to a group (membership = visibility)
--   payment_claims  payer claims "I paid X"; ONLY the recipient can confirm/reject.
--                   Confirmed claims are the settlement ledger. Nothing is deleted.

-- ── tables ──────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  member_name text not null,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table public.payment_claims (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  payer_profile_id uuid not null references public.profiles (id),
  recipient_profile_id uuid not null references public.profiles (id),
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  reject_reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (payer_profile_id <> recipient_profile_id)
);

-- One pending claim per payer→recipient pair: prevents duplicate claims.
create unique index one_pending_claim_per_pair
  on public.payment_claims (group_id, payer_profile_id, recipient_profile_id)
  where status = 'pending';

-- ── helper (bypasses RLS by design; used inside policies) ───────────────────
create or replace function public.is_group_member(g uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = g and profile_id = auth.uid()
  );
$$;

-- ── row level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.payment_claims enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.payment_claims to authenticated;

-- profiles
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: readable by authenticated" on public.profiles
  for select to authenticated using (true);

-- groups
create policy "groups: readable by members or creator" on public.groups
  for select to authenticated
  using (public.is_group_member(id) or created_by = auth.uid());
create policy "groups: insert by creator" on public.groups
  for insert to authenticated with check (created_by = auth.uid());
create policy "groups: update by creator" on public.groups
  for update to authenticated using (created_by = auth.uid());
create policy "groups: delete by creator" on public.groups
  for delete to authenticated using (created_by = auth.uid());

-- group_members
create policy "members: readable by members" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy "members: join self" on public.group_members
  for insert to authenticated with check (profile_id = auth.uid());
create policy "members: leave self" on public.group_members
  for delete to authenticated using (profile_id = auth.uid());

-- payment_claims
create policy "claims: readable by group members" on public.payment_claims
  for select to authenticated using (public.is_group_member(group_id));

create policy "claims: payer creates claim" on public.payment_claims
  for insert to authenticated
  with check (
    payer_profile_id = auth.uid()
    and created_by = auth.uid()
    and status = 'pending'
    and public.is_group_member(group_id)
    and exists (
      select 1 from public.group_members m
      where m.group_id = group_id and m.profile_id = recipient_profile_id
    )
  );

-- THE key rule: only the intended recipient can move a claim out of pending.
-- No admin override is possible — admins are not special in any policy here.
create policy "claims: only recipient decides" on public.payment_claims
  for update to authenticated
  using (recipient_profile_id = auth.uid() and status = 'pending')
  with check (recipient_profile_id = auth.uid() and status in ('confirmed', 'rejected'));

create policy "claims: payer cancels own pending claim" on public.payment_claims
  for delete to authenticated
  using (payer_profile_id = auth.uid() and status = 'pending');

-- ── transition guard (immutability + reject reason, enforced server-side) ───
create or replace function public.enforce_claim_transition()
returns trigger
language plpgsql
as $$
begin
  if OLD.status <> 'pending' then
    raise exception 'claim already decided';
  end if;
  if NEW.status not in ('confirmed', 'rejected') then
    raise exception 'invalid status transition';
  end if;
  if NEW.id <> OLD.id
     or NEW.group_id <> OLD.group_id
     or NEW.payer_profile_id <> OLD.payer_profile_id
     or NEW.recipient_profile_id <> OLD.recipient_profile_id
     or NEW.amount <> OLD.amount
     or NEW.created_by <> OLD.created_by then
    raise exception 'claim fields are immutable';
  end if;
  if NEW.status = 'rejected'
     and (NEW.reject_reason is null or btrim(NEW.reject_reason) = '') then
    raise exception 'rejection requires a reason';
  end if;
  NEW.decided_at := now();
  return NEW;
end;
$$;

create trigger claim_transition
  before update on public.payment_claims
  for each row execute function public.enforce_claim_transition();

-- ── realtime: status changes push to every member instantly ─────────────────
alter publication supabase_realtime add table public.payment_claims;
