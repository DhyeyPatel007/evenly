import { supabase } from './lib/supabase';

export type ClaimStatus = 'pending' | 'confirmed' | 'rejected';

export interface ServerMember {
  profile_id: string;
  member_name: string;
  is_admin: boolean;
}

export interface Claim {
  id: string;
  group_id: string;
  payer_profile_id: string;
  recipient_profile_id: string;
  amount: number;
  status: ClaimStatus;
  reject_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

function friendly(err: { code?: string; message: string }, fallback: string): string {
  if (err.code === '23505') return 'You already have a pending claim with this person.';
  if (err.code === '42501') return 'Not allowed — only the intended recipient can decide a claim.';
  if (err.code === 'P0001') return err.message || fallback;
  return err.message || fallback;
}

/**
 * Find the server group backing this local group (via the stored link, else by
 * name among groups I'm in), or create it — then make sure I'm a member.
 * Returns the server group id.
 */
export async function ensureServerGroup(opts: {
  localServerId?: string;
  name: string;
  selfProfileId: string;
  selfName: string;
}): Promise<string> {
  const { localServerId, name, selfProfileId, selfName } = opts;

  const ensureMembership = async (serverGroupId: string) => {
    const { data: mine } = await supabase
      .from('group_members')
      .select('profile_id')
      .eq('group_id', serverGroupId)
      .eq('profile_id', selfProfileId)
      .maybeSingle();
    if (!mine) {
      const { error } = await supabase.from('group_members').insert({
        group_id: serverGroupId,
        profile_id: selfProfileId,
        member_name: selfName,
      });
      if (error) throw new Error(friendly(error, 'Could not join the synced group.'));
    }
  };

  if (localServerId) {
    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .eq('id', localServerId)
      .maybeSingle();
    if (!error && data) {
      await ensureMembership(data.id as string);
      return data.id as string;
    }
    // Stored link is stale (group deleted server-side) — fall through and re-link.
  }

  const { data: existing, error: findErr } = await supabase
    .from('groups')
    .select('id')
    .eq('name', name)
    .limit(1)
    .maybeSingle();
  if (findErr) throw new Error(friendly(findErr, 'Could not look up the synced group.'));
  if (existing) {
    await ensureMembership(existing.id as string);
    return existing.id as string;
  }

  const { data: created, error: createErr } = await supabase
    .from('groups')
    .insert({ name, created_by: selfProfileId })
    .select('id')
    .single();
  if (createErr || !created) throw new Error(friendly(createErr!, 'Could not create the synced group.'));
  await ensureMembership(created.id as string);
  return created.id as string;
}

export async function fetchServerMembers(serverGroupId: string): Promise<ServerMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('profile_id, member_name, is_admin')
    .eq('group_id', serverGroupId);
  if (error) throw new Error(friendly(error, 'Could not load synced members.'));
  return (data ?? []) as ServerMember[];
}

export async function createClaim(
  serverGroupId: string,
  recipientProfileId: string,
  amount: number,
): Promise<{ claim?: Claim; error?: string }> {
  const { data: user } = await supabase.auth.getUser();
  const payer = user.user?.id;
  if (!payer) return { error: 'You are not signed in.' };
  const rounded = Math.round(amount * 100) / 100;
  if (!(rounded > 0)) return { error: 'Amount must be greater than zero.' };
  const { data, error } = await supabase
    .from('payment_claims')
    .insert({
      group_id: serverGroupId,
      payer_profile_id: payer,
      recipient_profile_id: recipientProfileId,
      amount: rounded,
      created_by: payer,
    })
    .select()
    .single();
  if (error) return { error: friendly(error, 'Could not create the payment claim.') };
  return { claim: data as Claim };
}

/** Only the recipient can call this successfully — enforced by RLS + trigger. */
export async function decideClaim(
  claimId: string,
  decision: 'confirmed' | 'rejected',
  reason?: string,
): Promise<string | null> {
  if (decision === 'rejected' && !reason?.trim()) {
    return 'Please give a reason for rejecting.';
  }
  const patch: Record<string, unknown> = { status: decision };
  if (decision === 'rejected') patch.reject_reason = reason!.trim();
  const { data, error } = await supabase
    .from('payment_claims')
    .update(patch)
    .eq('id', claimId)
    .select('id, status');
  if (error) return friendly(error, 'Could not update the claim.');
  const row = (data as { id: string; status: string }[] | null)?.[0];
  // RLS silently affects zero rows when the caller isn't the recipient —
  // treat "nothing changed" as denial, not success.
  if (!row || row.status !== decision) {
    return 'Not allowed — only the intended recipient can decide a claim.';
  }
  return null;
}

export async function cancelClaim(claimId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('payment_claims')
    .delete()
    .eq('id', claimId)
    .select('id');
  if (error) return friendly(error, 'Could not cancel the claim.');
  if (!((data as { id: string }[] | null)?.length)) {
    return 'Not allowed — only the payer can withdraw a pending claim.';
  }
  return null;
}

export async function fetchClaims(serverGroupId: string): Promise<Claim[]> {
  const { data, error } = await supabase
    .from('payment_claims')
    .select(
      'id, group_id, payer_profile_id, recipient_profile_id, amount, status, reject_reason, created_at, decided_at',
    )
    .eq('group_id', serverGroupId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(friendly(error, 'Could not load payment claims.'));
  return (data ?? []) as Claim[];
}

/** Realtime: fires whenever any claim in the group is created/decided. */
export function subscribeToClaims(serverGroupId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`claims-${serverGroupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payment_claims',
        filter: `group_id=eq.${serverGroupId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Join a synced group with its 6-character invite code. */
export async function joinGroupByCode(code: string): Promise<{ id: string; name: string }> {
  const clean = code.trim().toUpperCase();
  if (!clean) throw new Error('Enter the invite code.');
  const { data, error } = await supabase.rpc('join_group_by_code', { code: clean });
  if (error) {
    const msg = error.message || '';
    throw new Error(
      msg.includes('invalid invite code')
        ? 'That code didn’t match any group. Check it and try again.'
        : 'Could not join the group.',
    );
  }
  return data as { id: string; name: string };
}

export async function fetchInviteCode(serverGroupId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('invite_code')
    .eq('id', serverGroupId)
    .maybeSingle();
  if (error) return null;
  return (data as { invite_code: string } | null)?.invite_code ?? null;
}

/** Keep the server-side member name in sync with the local name. */
export async function updateMyMemberName(serverGroupId: string, name: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  await supabase
    .from('group_members')
    .update({ member_name: name.trim() })
    .eq('group_id', serverGroupId)
    .eq('profile_id', user.user.id);
}
