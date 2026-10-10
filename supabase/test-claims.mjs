/**
 * Evenly payment-claims end-to-end test — two (actually three) separate
 * authenticated accounts against the LIVE Supabase project.
 *
 * What it proves:
 *  1. Payer creates a claim → status pending, visible to group members.
 *  2. Duplicate pending claims are rejected (unique index).
 *  3. The payer CANNOT confirm their own claim (RLS).
 *  4. A non-member sees nothing and can do nothing (RLS).
 *  5. Only the recipient can confirm/reject (RLS) — no admin override exists.
 *  6. Double confirmation is impossible.
 *  7. Rejection requires a reason (trigger) and keeps the debt outstanding.
 *  8. Claim fields are immutable (amount tampering blocked).
 *  9. Confirmed claims are the settlement ledger both parties can read.
 * 10. Realtime pushes claim events to members.
 *
 * Run: node supabase/test-claims.mjs
 * Cleanup: deletes the test group (cascades). Test auth users remain in the
 * dashboard under Authentication → Users (delete them there if you like).
 */
import { createClient } from '@supabase/supabase-js';

const URL = 'https://qqwbjjycgpfbsiyopkqa.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxd2JqanljZ3BmYnNpeW9wa3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTA4NjIsImV4cCI6MjEwNzIyNjg2Mn0.5NA4_X4HlXYWGpAbk4jLwYl4jTyB7VsQeKe8EshF4pI';

const mk = () => createClient(URL, ANON);
const ts = Date.now();
const PASS = 'Test1234!';

let pass = 0;
let fail = 0;
function ok(cond, name, detail = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function signUp(client, email, name) {
  const { data, error } = await client.auth.signUp({ email, password: PASS });
  if (error) throw new Error(`signup ${email}: ${error.message}`);
  if (!data.session) {
    throw new Error(
      'NO SESSION after sign-up — turn OFF "Confirm email" in Supabase dashboard → Authentication → Sign In / Up → Email.',
    );
  }
  const id = data.session.user.id;
  const { error: pErr } = await client
    .from('profiles')
    .upsert({ id, display_name: name }, { onConflict: 'id' });
  if (pErr) throw new Error(`profile ${name}: ${pErr.message}`);
  return id;
}

async function claimById(client, id) {
  const { data } = await client.from('payment_claims').select('*').eq('id', id).maybeSingle();
  return data;
}

const A = mk();
const B = mk();
const C = mk();

console.log('— accounts —');
const aId = await signUp(A, `evenly-test-a-${ts}@example.com`, 'Test Aarav');
const bId = await signUp(B, `evenly-test-b-${ts}@example.com`, 'Test Bina');
const cId = await signUp(C, `evenly-test-c-${ts}@example.com`, 'Test Outsider');
ok(!!aId && !!bId && !!cId, 'three separate accounts signed up with sessions');

console.log('— group + membership —');
const { data: grp, error: gErr } = await A.from('groups')
  .insert({ name: `Evenly test ${ts}`, created_by: aId })
  .select('id')
  .single();
ok(!gErr && !!grp, 'A creates a server group');
const gid = grp.id;

for (const [client, pid, nm] of [[A, aId, 'Test Aarav'], [B, bId, 'Test Bina']]) {
  const { error } = await client
    .from('group_members')
    .insert({ group_id: gid, profile_id: pid, member_name: nm });
  ok(!error, `${nm} joins the group`);
}

console.log('— claim lifecycle —');
const { data: c1, error: c1Err } = await A.from('payment_claims')
  .insert({
    group_id: gid, payer_profile_id: aId, recipient_profile_id: bId,
    amount: 500, created_by: aId,
  })
  .select()
  .single();
ok(!c1Err && c1.status === 'pending', 'A creates claim A→B ₹500 → pending');

const { error: dupErr } = await A.from('payment_claims').insert({
  group_id: gid, payer_profile_id: aId, recipient_profile_id: bId,
  amount: 100, created_by: aId,
});
ok(dupErr?.code === '23505', 'duplicate pending claim rejected (unique index)', dupErr?.code);

const selfConfirm = await A.from('payment_claims')
  .update({ status: 'confirmed' })
  .eq('id', c1.id)
  .select('id');
const c1AfterSelf = await claimById(A, c1.id);
ok(
  (selfConfirm.data ?? []).length === 0 && c1AfterSelf.status === 'pending',
  'payer CANNOT confirm own claim (RLS)',
);

const bSees = await B.from('payment_claims').select('id').eq('group_id', gid);
ok((bSees.data ?? []).length === 1, 'recipient (member) sees the pending claim');

const cSees = await C.from('payment_claims').select('id').eq('group_id', gid);
ok((cSees.data ?? []).length === 0, 'non-member sees nothing');

const { error: cInsErr } = await C.from('payment_claims').insert({
  group_id: gid, payer_profile_id: cId, recipient_profile_id: bId,
  amount: 50, created_by: cId,
});
ok(!!cInsErr, 'non-member cannot create a claim', cInsErr?.code);

const { error: bConfErr } = await B.from('payment_claims')
  .update({ status: 'confirmed' })
  .eq('id', c1.id);
const c1Confirmed = await claimById(B, c1.id);
ok(
  !bConfErr && c1Confirmed.status === 'confirmed' && !!c1Confirmed.decided_at,
  'recipient confirms → confirmed + decided_at',
);

const again = await B.from('payment_claims')
  .update({ status: 'confirmed' })
  .eq('id', c1.id)
  .select('id');
ok((again.data ?? []).length === 0, 'double confirmation impossible');

console.log('— rejection path —');
const { data: c2 } = await A.from('payment_claims')
  .insert({
    group_id: gid, payer_profile_id: aId, recipient_profile_id: bId,
    amount: 200, created_by: aId,
  })
  .select()
  .single();
ok(c2?.status === 'pending', 'second claim created after first settled');

const tamper = await A.from('payment_claims')
  .update({ amount: 999 })
  .eq('id', c2.id)
  .select('id');
const c2AfterTamper = await claimById(A, c2.id);
ok(
  (tamper.data ?? []).length === 0 && Number(c2AfterTamper.amount) === 200,
  'payer cannot tamper with claim amount',
);

const { data: c3 } = await A.from('payment_claims')
  .insert({
    group_id: gid, payer_profile_id: aId, recipient_profile_id: bId,
    amount: 100, created_by: aId,
  })
  .select()
  .single();
const noReason = await B.from('payment_claims')
  .update({ status: 'rejected' })
  .eq('id', c3.id);
ok(
  noReason.error?.code === 'P0001',
  'rejection without reason blocked by trigger',
  noReason.error?.code,
);

const { error: rejErr } = await B.from('payment_claims')
  .update({ status: 'rejected', reject_reason: 'money never arrived' })
  .eq('id', c2.id);
const c2Rejected = await claimById(B, c2.id);
ok(
  !rejErr && c2Rejected.status === 'rejected' && c2Rejected.reject_reason === 'money never arrived',
  'recipient rejects with reason → rejected + reason recorded',
);

console.log('— ledger + realtime —');
const ledgerA = await A.from('payment_claims')
  .select('amount')
  .eq('group_id', gid)
  .eq('status', 'confirmed');
const ledgerB = await B.from('payment_claims')
  .select('amount')
  .eq('group_id', gid)
  .eq('status', 'confirmed');
const sumA = (ledgerA.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
const sumB = (ledgerB.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
ok(sumA === 500 && sumB === 500, 'both parties read the same settlement ledger (₹500 confirmed)', `${sumA}/${sumB}`);

if (typeof WebSocket === 'undefined') {
  console.log('  SKIP  realtime (no WebSocket in this node runtime)');
} else {
  let got = null;
  const ch = B.channel(`rt-${ts}`).on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'payment_claims', filter: `group_id=eq.${gid}` },
    (payload) => { got = payload; },
  );
  ch.subscribe();
  await new Promise((r) => setTimeout(r, 2500)); // let the subscription establish
  await A.from('payment_claims').insert({
    group_id: gid, payer_profile_id: aId, recipient_profile_id: bId,
    amount: 50, created_by: aId,
  });
  const deadline = Date.now() + 12000;
  while (!got && Date.now() < deadline) await new Promise((r) => setTimeout(r, 500));
  ok(!!got && got.eventType === 'INSERT', 'realtime pushes new claim to the other member');
  await B.removeChannel(ch);
  // withdraw the realtime probe claim (payer cancels own pending)
  const probe = await claimById(A, got?.new?.id ?? '');
  if (probe) await A.from('payment_claims').delete().eq('id', probe.id);
}

console.log('— cleanup —');
const { error: delErr } = await A.from('groups').delete().eq('id', gid);
const gone = await A.from('payment_claims').select('id').eq('group_id', gid);
ok(!delErr && (gone.data ?? []).length === 0, 'test group deleted (claims cascade)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
