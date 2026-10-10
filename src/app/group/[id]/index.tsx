import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEvenly } from '@/store';
import { useSyncedGroup } from '@/useSyncedGroup';
import { fetchInviteCode } from '@/claims';
import { computeNets } from '@/settle';
import { fmtDate, inr } from '@/format';
import { C, F, R, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Amount, Btn, Card, Empty, Field, Header, Screen, Seg, TextField } from '@/components/ui';
import { DonutChart, HBar } from '@/components/charts';
import { CATEGORIES, type Category } from '@/types';

type Tab = 'activity' | 'balances' | 'insights';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    ready, groups, groupExpenses, memberById, activeMembers,
    deleteExpense, renameGroup, setGroupArchived, deleteGroup,
  } = useEvenly();
  const [tab, setTab] = useState<Tab>('activity');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const group = groups.find((g) => g.id === id);
  const expenses = useMemo(() => (id ? groupExpenses(id) : []), [id, groupExpenses]);
  const members = useMemo(() => (id ? activeMembers(id) : []), [id, activeMembers]);
  const nets = useMemo(() => computeNets(expenses), [expenses]);

  const catTotals = useMemo(() => {
    const t = new Map<Category, number>();
    for (const e of expenses) t.set(e.category, (t.get(e.category) ?? 0) + e.amount);
    return [...t.entries()].map(([label, value]) => ({ label, value, color: CATEGORIES[label].color }));
  }, [expenses]);

  const paidTotals = useMemo(() => {
    const t = new Map<string, number>();
    for (const e of expenses) t.set(e.paidBy, (t.get(e.paidBy) ?? 0) + e.amount);
    return members
      .map((m) => ({ id: m.id, name: m.name, value: t.get(m.id) ?? 0, colorIdx: m.colorIdx }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, members]);

  const { serverGroupId } = useSyncedGroup(group);

  useEffect(() => {
    if (!inviteOpen || !serverGroupId) return;
    let live = true;
    (async () => {
      const c = await fetchInviteCode(serverGroupId);
      if (live) setInviteCode(c);
    })();
    return () => {
      live = false;
    };
  }, [inviteOpen, serverGroupId]);

  const shareInvite = () => {
    if (!inviteCode || !group) return;
    Share.share({
      message: `Join my Evenly group "${group.name}" — open Evenly, tap the menu, "Join group with code", and enter ${inviteCode}.`,
    }).catch(() => {});
  };

  if (!ready) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  if (!group) {
    return (
      <Screen>
        <Header title="Not found" onBack />
        <Empty
          icon={<Ionicons name="alert-circle-outline" size={28} color={C.muted} />}
          title="Group not found"
          subtitle="It may have been deleted."
        />
      </Screen>
    );
  }

  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const me = members.find((m) => m.isSelf);
  const myNet = me ? nets[me.id] ?? 0 : 0;
  const biggest = expenses.reduce<typeof expenses[number] | undefined>(
    (a, e) => (e.amount > (a?.amount ?? 0) ? e : a), undefined,
  );

  const confirmDeleteExpense = (expenseId: string, desc: string) =>
    Alert.alert('Delete expense?', `"${desc}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(expenseId) },
    ]);

  const openSettings = () => {
    setEditName(group.name);
    setSettingsOpen(true);
  };

  const saveName = () => {
    if (editName.trim()) renameGroup(group.id, editName.trim());
    setSettingsOpen(false);
  };

  const confirmDeleteGroup = () =>
    Alert.alert('Delete group?', `"${group.name}" has no expenses and will be deleted permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (deleteGroup(group.id)) router.replace('/');
          else Alert.alert('Cannot delete', 'Groups with expenses can only be archived.');
        },
      },
    ]);

  return (
    <Screen>
      <Header
        title={group.name}
        subtitle={`${members.length} members · ${inr(total)} split`}
        onBack
        right={
          <View style={styles.headerActions}>
            <Pressable onPress={() => { setInviteCode(null); setInviteOpen(true); }} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="person-add-outline" size={20} color={C.muted} />
            </Pressable>
            <Pressable onPress={() => router.push(`/group/${group.id}/members`)} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="people-outline" size={20} color={C.muted} />
            </Pressable>
            <Pressable onPress={openSettings} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="settings-outline" size={20} color={C.muted} />
            </Pressable>
          </View>
        }
      />

      {group.archived && (
        <Card style={styles.archivedBanner}>
          <Ionicons name="archive-outline" size={18} color={C.amber} />
          <Text style={styles.archivedTxt}>This group is archived — read only.</Text>
          <Pressable onPress={() => setGroupArchived(group.id, false)}>
            <Text style={styles.unarchiveTxt}>Unarchive</Text>
          </Pressable>
        </Card>
      )}

      <Seg<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Activity', value: 'activity' },
          { label: 'Balances', value: 'balances' },
          { label: 'Insights', value: 'insights' },
        ]}
      />
      <View style={{ height: S.md }} />

      {tab === 'activity' && (
        expenses.length === 0 ? (
          <Empty
            icon={<Ionicons name="receipt-outline" size={28} color={C.muted} />}
            title="No expenses yet"
            subtitle="Add the first expense and Evenly will track who owes whom."
            action={!group.archived ? (
              <Btn label="Add expense" onPress={() => router.push(`/group/${group.id}/add`)} />
            ) : undefined}
          />
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ gap: S.sm, paddingBottom: 110 }}
            renderItem={({ item: e }) => {
              const payer = memberById(e.paidBy);
              const share = me ? e.splits.find((s) => s.memberId === me.id)?.amount ?? 0 : 0;
              return (
                <Pressable
                  onPress={() => router.push(`/group/${group.id}/expense/${e.id}`)}
                  onLongPress={() => !group.archived && confirmDeleteExpense(e.id, e.description)}
                >
                  <Card style={styles.expRow}>
                    <View style={[styles.catDot, { backgroundColor: CATEGORIES[e.category].bg }]}>
                      <View style={[styles.catDotInner, { backgroundColor: CATEGORIES[e.category].color }]} />
                    </View>
                    <View style={styles.expMain}>
                      <Text style={styles.expDesc} numberOfLines={1}>{e.description}</Text>
                      <Text style={styles.expMeta}>
                        {fmtDate(e.date)} · {payer?.isSelf ? 'You' : payer?.name} paid
                      </Text>
                    </View>
                    <View style={styles.expRight}>
                      <Amount size={15}>{inr(e.amount)}</Amount>
                      <Text style={styles.expShare}>your share {inr(share)}</Text>
                    </View>
                  </Card>
                </Pressable>
              );
            }}
          />
        )
      )}

      {tab === 'balances' && (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ gap: S.sm, paddingBottom: 110 }}
          ListHeaderComponent={
            <Card style={styles.settleCard}>
              <View style={styles.settleHead}>
                <Ionicons name="flash" size={20} color={C.greenStrong} />
                <Text style={styles.settleTitle}>Smart settle-up</Text>
              </View>
              <Text style={styles.settleSub}>
                Evenly collapses every debt into the fewest possible payments.
              </Text>
              <View style={{ height: S.sm }} />
              <Btn
                label="See settle-up plan"
                onPress={() => router.push(`/group/${group.id}/settle`)}
                disabled={group.archived}
              />
            </Card>
          }
          renderItem={({ item: m }) => {
            const net = nets[m.id] ?? 0;
            return (
              <Card style={styles.balRow}>
                <Avatar name={m.name} colorIdx={m.colorIdx} size={42} />
                <View style={styles.balMain}>
                  <Text style={styles.balName}>
                    {m.isSelf ? 'You' : m.name}
                  </Text>
                  <Text style={styles.balMeta}>
                    {net === 0 ? 'all settled' : net > 0 ? 'gets back' : 'owes'}
                  </Text>
                </View>
                {net !== 0 ? (
                  <Amount size={16} color={net > 0 ? C.greenStrong : C.red}>
                    {inr(Math.abs(net))}
                  </Amount>
                ) : (
                  <Ionicons name="checkmark-circle" size={22} color={C.green} />
                )}
              </Card>
            );
          }}
        />
      )}

      {tab === 'insights' && (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={{ paddingBottom: 110, gap: S.md }}
          ListHeaderComponent={
            <View style={{ gap: S.md }}>
              <Card>
                <Text style={styles.insightTitle}>Spending by category</Text>
                <View style={{ height: S.sm }} />
                {catTotals.length === 0 ? (
                  <Text style={styles.muted}>No data yet.</Text>
                ) : (
                  <View style={styles.donutWrap}>
                    <DonutChart segments={catTotals} />
                    <View style={styles.legend}>
                      {catTotals.map((c) => (
                        <View key={c.label} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                          <Text style={styles.legendLabel}>{c.label}</Text>
                          <Amount size={13} color={C.muted}>{inr(c.value)}</Amount>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </Card>
              <Card>
                <Text style={styles.insightTitle}>Who paid the most</Text>
                <View style={{ height: S.sm }} />
                {paidTotals.length === 0 ? (
                  <Text style={styles.muted}>No data yet.</Text>
                ) : (
                  paidTotals.map((p) => (
                    <HBar
                      key={p.id}
                      label={p.name.split(' ')[0]}
                      value={p.value}
                      max={paidTotals[0]?.value ?? 1}
                      color={['#16A34A', '#1D4ED8', '#6D28D9', '#B45309', '#BE185D', '#0F766E', '#B91C1C', '#4338CA'][p.colorIdx % 8]}
                    />
                  ))
                )}
              </Card>
              <View style={styles.statGrid}>
                <Card style={styles.statCard}>
                  <Amount size={20} weight={F.extra} color={C.greenStrong}>{expenses.length}</Amount>
                  <Text style={styles.statLbl}>expenses</Text>
                </Card>
                <Card style={styles.statCard}>
                  <Amount size={20} weight={F.extra}>{inr(expenses.length ? total / expenses.length : 0)}</Amount>
                  <Text style={styles.statLbl}>avg expense</Text>
                </Card>
              </View>
              {biggest && (
                <Card>
                  <Text style={styles.insightTitle}>Biggest expense</Text>
                  <Text style={styles.bigDesc}>{biggest.description}</Text>
                  <Amount size={24} weight={F.extra}>{inr(biggest.amount)}</Amount>
                </Card>
              )}
              {myNet !== 0 && (
                <Card style={[styles.myNetCard, { backgroundColor: myNet > 0 ? C.greenDim : C.redDim }]}>
                  <Text style={[styles.myNetTxt, { color: myNet > 0 ? C.greenStrong : C.red }]}>
                    {myNet > 0 ? `You get back ${inr(myNet)} in this group` : `You owe ${inr(-myNet)} in this group`}
                  </Text>
                </Card>
              )}
            </View>
          }
        />
      )}

      {!group.archived && (
        <Pressable style={styles.fab} onPress={() => router.push(`/group/${group.id}/add`)}>
          <Ionicons name="add" size={30} color={C.white} />
        </Pressable>
      )}

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <Pressable style={styles.sheetBg} onPress={() => setSettingsOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Group settings</Text>
            <Field label="Group name">
              <TextField value={editName} onChangeText={setEditName} />
            </Field>
            <Btn label="Save name" onPress={saveName} disabled={!editName.trim()} />
            <View style={{ height: S.sm }} />
            <Btn
              label={group.archived ? 'Unarchive group' : 'Archive group'}
              variant="secondary"
              onPress={() => {
                setGroupArchived(group.id, !group.archived);
                setSettingsOpen(false);
              }}
            />
            <View style={{ height: S.sm }} />
            <Btn
              label="Delete group"
              variant="danger"
              onPress={confirmDeleteGroup}
              disabled={expenses.length > 0}
            />
            {expenses.length > 0 && (
              <Text style={styles.deleteHint}>Groups with expenses can only be archived, not deleted.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={inviteOpen} transparent animationType="fade" onRequestClose={() => setInviteOpen(false)}>
        <Pressable style={styles.sheetBg} onPress={() => setInviteOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Invite members</Text>
            <Text style={styles.inviteSub}>
              Share this code — they install Evenly, sign in, and join from the menu. Their
              payments then sync with this group.
            </Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeTxt}>{inviteCode ?? '······'}</Text>
            </View>
            <View style={{ height: S.sm }} />
            <Btn
              label="Share invite"
              onPress={shareInvite}
              disabled={!inviteCode}
              icon={<Ionicons name="share-outline" size={16} color={C.white} />}
            />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: F.regular, color: C.muted, marginTop: 40, textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  archivedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: C.amberDim, borderColor: '#F5D9A8', marginBottom: S.md,
  },
  archivedTxt: { fontFamily: F.medium, color: C.amber, fontSize: 13, flex: 1 },
  unarchiveTxt: { fontFamily: F.bold, color: C.amber, fontSize: 13 },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  catDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  catDotInner: { width: 10, height: 10, borderRadius: 5 },
  expMain: { flex: 1 },
  expDesc: { fontFamily: F.semi, color: C.text, fontSize: 15, marginBottom: 2 },
  expMeta: { fontFamily: F.regular, color: C.muted, fontSize: 12 },
  expRight: { alignItems: 'flex-end' },
  expShare: { fontFamily: F.regular, color: C.faint, fontSize: 11, marginTop: 2 },
  settleCard: { marginBottom: 2 },
  settleHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  settleTitle: { fontFamily: F.bold, color: C.text, fontSize: 16 },
  settleSub: { fontFamily: F.regular, color: C.muted, fontSize: 14, lineHeight: 20 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  balMain: { flex: 1 },
  balName: { fontFamily: F.semi, color: C.text, fontSize: 15, marginBottom: 2 },
  balMeta: { fontFamily: F.regular, color: C.muted, fontSize: 12 },
  insightTitle: { fontFamily: F.bold, color: C.text, fontSize: 15, marginBottom: 2 },
  muted: { fontFamily: F.regular, color: C.muted, fontSize: 14 },
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: F.medium, color: C.text, fontSize: 13, flex: 1 },
  statGrid: { flexDirection: 'row', gap: S.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: S.lg, gap: 4 },
  statLbl: { fontFamily: F.medium, color: C.muted, fontSize: 12 },
  bigDesc: { fontFamily: F.regular, color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 2 },
  myNetCard: { borderWidth: 0 },
  myNetTxt: { fontFamily: F.bold, fontSize: 14, textAlign: 'center' },
  fab: {
    position: 'absolute', right: S.md, bottom: S.xl + 8,
    width: 58, height: 58, borderRadius: 29, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0E1319', shadowOpacity: 0.22, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  sheetBg: { flex: 1, backgroundColor: 'rgba(14,19,25,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    padding: S.lg, paddingBottom: S.xl, gap: S.sm,
  },
  sheetTitle: { fontFamily: F.bold, fontSize: 17, color: C.text },
  deleteHint: { fontFamily: F.regular, color: C.faint, fontSize: 12, textAlign: 'center' },
  inviteSub: { fontFamily: F.regular, fontSize: 13, color: C.muted, lineHeight: 20 },
  codeBox: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: R.md,
    paddingVertical: S.lg, alignItems: 'center', marginTop: S.sm,
  },
  codeTxt: { fontFamily: F.bold, fontSize: 34, letterSpacing: 10, color: C.text },
});
