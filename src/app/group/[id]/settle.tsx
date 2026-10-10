import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEvenly } from '@/store';
import { useAuth } from '@/auth';
import { useSyncedGroup } from '@/useSyncedGroup';
import { computeNets, simplifyDebts } from '@/settle';
import { buildAppUpiUrl, UPI_APP_OPTIONS, type UpiAppOption } from '@/upi';
import {
  cancelClaim,
  createClaim,
  decideClaim,
  fetchClaims,
  subscribeToClaims,
  type Claim,
} from '@/claims';
import { inr } from '@/format';
import { C, F, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Amount, Btn, Card, Empty, Field, Header, Screen, TextField } from '@/components/ui';

const r2 = (n: number) => Math.round(n * 100) / 100;

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Settle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, groups, groupExpenses, memberById, self } = useEvenly();
  const { ready: authReady, userId } = useAuth();
  const group = groups.find((g) => g.id === id);
  const selfMember = self();
  const { serverGroupId, members: serverMembers, syncing, syncError } = useSyncedGroup(group);

  const [claims, setClaims] = useState<Claim[]>([]);
  const [chooser, setChooser] = useState<{ toId: string; amount: number } | null>(null);
  const [draft, setDraft] = useState<{ toId: string; max: number } | null>(null);
  const [draftAmount, setDraftAmount] = useState('');
  const [rejecting, setRejecting] = useState<Claim | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshClaims = async () => {
    if (!serverGroupId) return;
    try {
      setClaims(await fetchClaims(serverGroupId));
    } catch {
      /* keep stale */
    }
  };

  // Load claims once linked; realtime keeps them fresh afterwards.
  useEffect(() => {
    if (!serverGroupId) return;
    let live = true;
    (async () => {
      try {
        const cl = await fetchClaims(serverGroupId);
        if (live) setClaims(cl);
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      live = false;
    };
  }, [serverGroupId]);

  useEffect(() => {
    if (!serverGroupId) return;
    return subscribeToClaims(serverGroupId, () => {
      refreshClaims();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverGroupId]);

  const memberNameOf = (profileId: string): string =>
    serverMembers.find((m) => m.profile_id === profileId)?.member_name ?? 'A member';

  /** Local member id for a server profile (matched by name). */
  const localIdOfProfile = (profileId: string): string | null => {
    if (!group) return null;
    const sm = serverMembers.find((m) => m.profile_id === profileId);
    if (!sm) return null;
    const norm = sm.member_name.trim().toLowerCase();
    const hit = group.memberIds
      .map((mid) => memberById(mid))
      .find((m) => m && m.name.trim().toLowerCase() === norm);
    return hit?.id ?? null;
  };

  const profileOfMember = (memberId: string): string | null => {
    const local = memberById(memberId);
    if (!local) return null;
    const norm = local.name.trim().toLowerCase();
    return (
      serverMembers.find((m) => m.member_name.trim().toLowerCase() === norm)?.profile_id ?? null
    );
  };

  const expenses = useMemo(() => (id ? groupExpenses(id) : []), [id, groupExpenses]);

  // Balances update ONLY from confirmed claims — pending claims change nothing.
  const nets = useMemo(() => {
    const n = computeNets(expenses);
    for (const c of claims) {
      if (c.status !== 'confirmed') continue;
      const fromId = localIdOfProfile(c.payer_profile_id);
      const toId = localIdOfProfile(c.recipient_profile_id);
      if (fromId && toId) {
        n[fromId] = r2((n[fromId] ?? 0) + c.amount);
        n[toId] = r2((n[toId] ?? 0) - c.amount);
      }
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, claims, serverMembers]);

  const plan = useMemo(() => simplifyDebts(nets), [nets]);
  const debtors = Object.values(nets).filter((n) => n < -0.005).length;
  const creditors = Object.values(nets).filter((n) => n > 0.005).length;
  const naive = debtors * creditors;

  const pending = useMemo(() => claims.filter((c) => c.status === 'pending'), [claims]);
  const history = useMemo(() => claims.filter((c) => c.status !== 'pending'), [claims]);
  const awaitingMe = useMemo(
    () => pending.filter((c) => c.recipient_profile_id === userId),
    [pending, userId],
  );

  if (!ready || !authReady) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  if (!group) return <Screen><Header title="Settle up" onBack /></Screen>;

  const openUpi = async (toId: string, amount: number, opt: UpiAppOption) => {
    const m = memberById(toId);
    if (!m?.upi) {
      Alert.alert('No UPI ID', 'Add a UPI ID for this member first (Members tab).');
      return;
    }
    const url = buildAppUpiUrl(opt, { vpa: m.upi, payeeName: m.name, amount });
    setChooser(null);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Could not open the app',
        opt.scheme === 'upi'
          ? 'No UPI app found on this device.'
          : `${opt.name} does not seem to be installed on this device.`,
      );
    }
  };

  const onPayPress = (toId: string, amount: number) => setChooser({ toId, amount });

  const startClaim = (toId: string, max: number) => {
    const toProfile = profileOfMember(toId);
    if (!toProfile) {
      const m = memberById(toId);
      Alert.alert(
        'Not synced yet',
        `${m?.name ?? 'This person'} hasn't signed in to synced Evenly, so they can't confirm a claim yet.`,
      );
      return;
    }
    if (pending.some((c) => c.payer_profile_id === userId && c.recipient_profile_id === toProfile)) {
      Alert.alert('Already pending', 'You already have a claim awaiting their confirmation.');
      return;
    }
    setDraftAmount(max.toFixed(2));
    setDraft({ toId, max });
  };

  const submitClaim = async () => {
    if (!draft || !serverGroupId || busy) return;
    const amt = Math.round(parseFloat(draftAmount) * 100) / 100;
    if (!(amt > 0)) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    if (amt > draft.max + 0.005) {
      Alert.alert('Too much', `You owe at most ${inr(draft.max)} on this one.`);
      return;
    }
    const toProfile = profileOfMember(draft.toId);
    if (!toProfile) {
      Alert.alert('Not synced yet', 'This person has not joined synced Evenly yet.');
      return;
    }
    setBusy(true);
    const { error } = await createClaim(serverGroupId, toProfile, amt);
    setBusy(false);
    if (error) {
      Alert.alert('Could not send claim', error);
    } else {
      setDraft(null);
      setDraftAmount('');
      Alert.alert(
        'Claim sent',
        `${memberNameOf(toProfile)} will see it as awaiting confirmation. The balance updates only after they confirm.`,
      );
      refreshClaims();
    }
  };

  const onConfirm = (c: Claim) => {
    Alert.alert(
      'Confirm received?',
      `${memberNameOf(c.payer_profile_id)} says they paid you ${inr(c.amount)}. Confirm only if the money actually arrived.`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBusy(true);
            const err = await decideClaim(c.id, 'confirmed');
            setBusy(false);
            if (err) Alert.alert('Could not confirm', err);
            else refreshClaims();
          },
        },
      ],
    );
  };

  const submitReject = async () => {
    if (!rejecting || busy) return;
    if (!rejectReason.trim()) {
      Alert.alert('Reason needed', 'Tell them why you are rejecting this claim.');
      return;
    }
    setBusy(true);
    const err = await decideClaim(rejecting.id, 'rejected', rejectReason);
    setBusy(false);
    if (err) {
      Alert.alert('Could not reject', err);
    } else {
      setRejecting(null);
      setRejectReason('');
      refreshClaims();
    }
  };

  const onCancelClaim = (c: Claim) => {
    Alert.alert('Withdraw claim?', 'The pending claim will be removed.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          const err = await cancelClaim(c.id);
          if (err) Alert.alert('Could not withdraw', err);
          else refreshClaims();
        },
      },
    ]);
  };

  const renderClaimRow = (c: Claim) => {
    const isPayer = c.payer_profile_id === userId;
    const isRecipient = c.recipient_profile_id === userId;
    return (
      <Card key={c.id} style={styles.claimCard}>
        <View style={styles.claimTop}>
          <View style={styles.claimMid}>
            <Text style={styles.claimNames} numberOfLines={1}>
              {isPayer ? 'You' : memberNameOf(c.payer_profile_id)}
              <Text style={styles.arrow}> → </Text>
              {isRecipient ? 'You' : memberNameOf(c.recipient_profile_id)}
            </Text>
            <Amount size={20} weight={F.extra}>{inr(c.amount)}</Amount>
            <Text style={styles.claimMeta}>
              {c.status === 'pending'
                ? `Awaiting confirmation · claimed ${fmtWhen(c.created_at)}`
                : c.status === 'confirmed'
                  ? `Confirmed ${c.decided_at ? fmtWhen(c.decided_at) : ''}`
                  : `Rejected${c.decided_at ? ` ${fmtWhen(c.decided_at)}` : ''}`}
            </Text>
            {c.status === 'rejected' && c.reject_reason ? (
              <Text style={styles.rejectReason}>Reason: {c.reject_reason}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.badge,
              c.status === 'pending' && styles.badgePending,
              c.status === 'confirmed' && styles.badgeConfirmed,
              c.status === 'rejected' && styles.badgeRejected,
            ]}
          >
            <Text
              style={[
                styles.badgeTxt,
                c.status === 'pending' && styles.badgeTxtPending,
                c.status === 'confirmed' && styles.badgeTxtConfirmed,
                c.status === 'rejected' && styles.badgeTxtRejected,
              ]}
            >
              {c.status === 'pending' ? 'Pending' : c.status === 'confirmed' ? 'Settled' : 'Rejected'}
            </Text>
          </View>
        </View>
        {c.status === 'pending' && isRecipient ? (
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Btn label="Confirm received" onPress={() => onConfirm(c)} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn label="Reject" variant="secondary" onPress={() => { setRejectReason(''); setRejecting(c); }} disabled={busy} />
            </View>
          </View>
        ) : null}
        {c.status === 'pending' && isPayer ? (
          <Pressable onPress={() => onCancelClaim(c)} style={styles.withdraw} disabled={busy}>
            <Text style={styles.withdrawTxt}>Withdraw claim</Text>
          </Pressable>
        ) : null}
      </Card>
    );
  };

  return (
    <Screen>
      <Header title="Settle up" subtitle={group.name} onBack />
      <ScrollView contentContainerStyle={{ gap: S.md, paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
        {syncing ? (
          <Card style={styles.syncRow}>
            <Ionicons name="cloud-outline" size={16} color={C.muted} />
            <Text style={styles.syncTxt}>Syncing payment claims…</Text>
          </Card>
        ) : syncError ? (
          <Card style={styles.syncRow}>
            <Ionicons name="cloud-offline-outline" size={16} color={C.red} />
            <Text style={[styles.syncTxt, { color: C.red }]}>Sync unavailable: {syncError}</Text>
          </Card>
        ) : serverGroupId ? (
          <View style={styles.syncRowPlain}>
            <Ionicons name="cloud-done-outline" size={14} color={C.greenStrong} />
            <Text style={styles.syncTxtSmall}>Payment claims synced across members</Text>
          </View>
        ) : null}

        {awaitingMe.length > 0 ? (
          <Card style={styles.notice}>
            <Ionicons name="notifications-outline" size={20} color={C.amber} />
            <Text style={styles.noticeTxt}>
              {awaitingMe.length} payment claim{awaitingMe.length > 1 ? 's need' : ' needs'} your
              confirmation below.
            </Text>
          </Card>
        ) : null}

        <Card style={styles.hero}>
          <View style={styles.heroHead}>
            <Ionicons name="flash" size={20} color={C.greenStrong} />
            <Text style={styles.heroTitle}>Smart plan</Text>
          </View>
          {plan.length === 0 ? (
            <Text style={styles.heroSub}>Nobody owes anybody anything right now.</Text>
          ) : (
            <Text style={styles.heroSub}>
              <Text style={styles.heroNum}>{plan.length}</Text> payment{plan.length > 1 ? 's' : ''} settle
              everyone{naive > plan.length ? ` — instead of ${naive} the naive way` : ''}.
            </Text>
          )}
        </Card>

        {plan.map((p) => {
          const from = memberById(p.from);
          const to = memberById(p.to);
          const iAmPayer = selfMember?.id === p.from;
          return (
            <Card key={`${p.from}-${p.to}-${p.amount}`}>
              <View style={styles.row}>
                <Avatar name={from?.name ?? '?'} colorIdx={from?.colorIdx ?? 0} size={44} />
                <View style={styles.mid}>
                  <Text style={styles.names} numberOfLines={1}>
                    {from?.isSelf ? 'You' : from?.name.split(' ')[0]}
                    <Text style={styles.arrow}> → </Text>
                    {to?.isSelf ? 'You' : to?.name.split(' ')[0]}
                  </Text>
                  <Amount size={22} weight={F.extra}>{inr(p.amount)}</Amount>
                </View>
                <Avatar name={to?.name ?? '?'} colorIdx={to?.colorIdx ?? 0} size={44} />
              </View>
              <View style={{ height: S.md }} />
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <Btn
                    label="Pay via UPI"
                    onPress={() => onPayPress(p.to, p.amount)}
                    disabled={!to?.upi}
                    icon={<Ionicons name="phone-portrait-outline" size={16} color={C.white} />}
                  />
                </View>
                {iAmPayer ? (
                  <View style={{ flex: 1 }}>
                    <Btn
                      label="Claim paid"
                      variant="secondary"
                      onPress={() => startClaim(p.to, p.amount)}
                      disabled={busy || !serverGroupId}
                    />
                  </View>
                ) : null}
              </View>
              {!to?.upi && (
                <Text style={styles.noUpi}>Add their UPI ID from the Members tab to enable one-tap pay.</Text>
              )}
              {iAmPayer ? (
                <Text style={styles.claimHint}>
                  Claim paid notifies them — the balance updates only after they confirm.
                </Text>
              ) : null}
            </Card>
          );
        })}

        {pending.length > 0 ? (
          <View style={{ gap: S.md }}>
            <Text style={styles.sectionTitle}>Awaiting confirmation</Text>
            {pending.map(renderClaimRow)}
          </View>
        ) : null}

        {history.length > 0 ? (
          <View style={{ gap: S.md }}>
            <Text style={styles.sectionTitle}>History</Text>
            {history.map(renderClaimRow)}
          </View>
        ) : null}

        {plan.length === 0 && pending.length === 0 && history.length === 0 ? (
          <Empty
            icon={<Ionicons name="checkmark-circle-outline" size={30} color={C.green} />}
            title="All settled"
            subtitle="Nobody owes anybody anything in this group."
          />
        ) : null}
      </ScrollView>

      {/* UPI app chooser */}
      <Modal visible={!!chooser} transparent animationType="fade" onRequestClose={() => setChooser(null)}>
        <Pressable style={styles.sheetBg} onPress={() => setChooser(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Pay with</Text>
            <Text style={styles.sheetSub}>
              {chooser ? `Pay ${inr(chooser.amount)} — choose the UPI app.` : ''}
            </Text>
            {UPI_APP_OPTIONS.map((a) => (
              <Pressable
                key={a.name}
                style={styles.appRow}
                onPress={() => chooser && openUpi(chooser.toId, chooser.amount, a)}
              >
                <View style={styles.appIcon}>
                  <Ionicons
                    name={a.scheme === 'upi' ? 'apps-outline' : 'wallet-outline'}
                    size={20}
                    color={C.greenStrong}
                  />
                </View>
                <Text style={styles.appName}>{a.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={C.faint} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Claim amount (supports partial payments) */}
      <Modal visible={!!draft} transparent animationType="fade" onRequestClose={() => setDraft(null)}>
        <Pressable style={styles.sheetBg} onPress={() => setDraft(null)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Claim payment</Text>
            <Text style={styles.sheetSub}>
              {draft
                ? `How much did you pay ${memberById(draft.toId)?.name.split(' ')[0] ?? ''}? They confirm before it counts.`
                : ''}
            </Text>
            <Field label={`Amount (owed ${draft ? inr(draft.max) : ''})`}>
              <TextField
                keyboardType="decimal-pad"
                value={draftAmount}
                onChangeText={setDraftAmount}
                placeholder="0.00"
              />
            </Field>
            <View style={{ height: S.md }} />
            <Btn label={busy ? 'Sending…' : 'Send claim'} onPress={submitClaim} disabled={busy} />
          </View>
        </Pressable>
      </Modal>

      {/* Reject with reason */}
      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <Pressable style={styles.sheetBg} onPress={() => setRejecting(null)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Reject claim</Text>
            <Text style={styles.sheetSub}>
              {rejecting
                ? `${memberNameOf(rejecting.payer_profile_id)} claimed ${inr(rejecting.amount)}. Why are you rejecting?`
                : ''}
            </Text>
            <Field label="Reason">
              <TextField
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="e.g. Money never arrived"
                multiline
              />
            </Field>
            <View style={{ height: S.md }} />
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <Btn label="Back" variant="secondary" onPress={() => setRejecting(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Btn label={busy ? '…' : 'Reject'} variant="danger" onPress={submitReject} disabled={busy} />
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: F.regular, color: C.muted, marginTop: 40, textAlign: 'center' },
  hero: { marginBottom: 2, backgroundColor: C.greenDim, borderColor: '#BFE6C9' },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroTitle: { fontFamily: F.bold, color: C.text, fontSize: 16 },
  heroSub: { fontFamily: F.regular, color: C.muted, fontSize: 14, lineHeight: 21 },
  heroNum: { fontFamily: F.extra, color: C.greenStrong, fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  mid: { flex: 1 },
  names: { fontFamily: F.semi, color: C.text, fontSize: 15, marginBottom: 3 },
  arrow: { color: C.greenStrong, fontFamily: F.bold },
  actions: { flexDirection: 'row', gap: S.sm },
  noUpi: { fontFamily: F.regular, color: C.faint, fontSize: 12, marginTop: 8, textAlign: 'center' },
  claimHint: { fontFamily: F.regular, color: C.faint, fontSize: 12, marginTop: 8, textAlign: 'center' },
  sectionTitle: { fontFamily: F.bold, color: C.text, fontSize: 15, marginTop: 4 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  syncRowPlain: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  syncTxt: { fontFamily: F.medium, fontSize: 13, color: C.muted, flex: 1 },
  syncTxtSmall: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: '#FFF7E6', borderColor: '#F0D9A8',
  },
  noticeTxt: { fontFamily: F.semi, fontSize: 13, color: C.text, flex: 1, lineHeight: 19 },
  claimCard: { gap: S.sm },
  claimTop: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm },
  claimMid: { flex: 1, gap: 2 },
  claimNames: { fontFamily: F.semi, color: C.text, fontSize: 15 },
  claimMeta: { fontFamily: F.regular, color: C.faint, fontSize: 12 },
  rejectReason: { fontFamily: F.medium, color: C.red, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgePending: { backgroundColor: '#FFF3D6' },
  badgeConfirmed: { backgroundColor: C.greenDim },
  badgeRejected: { backgroundColor: '#FDE8E8' },
  badgeTxt: { fontFamily: F.bold, fontSize: 11 },
  badgeTxtPending: { color: '#9A6B12' },
  badgeTxtConfirmed: { color: C.greenStrong },
  badgeTxtRejected: { color: C.red },
  withdraw: { alignSelf: 'flex-start', paddingVertical: 4 },
  withdrawTxt: { fontFamily: F.semi, fontSize: 13, color: C.red },
  sheetBg: { flex: 1, backgroundColor: 'rgba(14,19,25,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: S.lg, paddingBottom: S.xl, gap: 2,
  },
  sheetTitle: { fontFamily: F.bold, fontSize: 17, color: C.text },
  sheetSub: { fontFamily: F.regular, fontSize: 13, color: C.muted, marginBottom: S.sm },
  appRow: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  appIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.greenDim, alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontFamily: F.semi, fontSize: 15, color: C.text, flex: 1 },
});
