import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useHisab } from '@/store';
import { computeNets } from '@/settle';
import { fmtDate, inr } from '@/format';
import { C, R, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Btn, Card, Empty, Header, Screen, Seg } from '@/components/ui';
import { DonutChart, HBar } from '@/components/charts';
import { CATEGORIES, type Category, type Expense } from '@/types';

type Tab = 'activity' | 'balances' | 'insights';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, groups, groupExpenses, memberById, deleteExpense, addMember } = useHisab();
  const [tab, setTab] = useState<Tab>('activity');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUpi, setNewUpi] = useState('');

  const group = groups.find((g) => g.id === id);
  const expenses = useMemo(() => (id ? groupExpenses(id) : []), [id, groupExpenses]);
  const gMembers = useMemo(
    () => (group ? group.memberIds.map((m) => memberById(m)).filter((m) => m !== undefined) : []),
    [group, memberById],
  );
  const nets = useMemo(() => computeNets(expenses), [expenses]);

  const catTotals = useMemo(() => {
    const t = new Map<Category, number>();
    for (const e of expenses) t.set(e.category, (t.get(e.category) ?? 0) + e.amount);
    return [...t.entries()].map(([label, value]) => ({ label, value, color: CATEGORIES[label].color }));
  }, [expenses]);

  const paidTotals = useMemo(() => {
    const t = new Map<string, number>();
    for (const e of expenses) t.set(e.paidBy, (t.get(e.paidBy) ?? 0) + e.amount);
    return gMembers
      .map((m) => ({ id: m!.id, name: m!.name, color: m!.color, value: t.get(m!.id) ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, gMembers]);

  if (!ready) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  if (!group) {
    return (
      <Screen>
        <Header title="Not found" onBack />
        <Empty title="Group not found" subtitle="It may have been deleted." />
      </Screen>
    );
  }

  const myShare = (expenseId: string) => expenses.find((e) => e.id === expenseId)?.splits.find((s) => s.memberId === 'u1')?.amount ?? 0;

  const confirmDelete = (expenseId: string, desc: string) =>
    Alert.alert('Delete expense?', `"${desc}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(expenseId) },
    ]);

  const submitMember = () => {
    if (!newName.trim()) return;
    addMember(group.id, newName.trim(), newUpi.trim() || undefined);
    setNewName('');
    setNewUpi('');
    setShowAddMember(false);
  };

  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const biggest = expenses.reduce<Expense | undefined>((a, e) => (e.amount > (a?.amount ?? 0) ? e : a), undefined);

  return (
    <Screen>
      <Header title={group.name} subtitle={`${gMembers.length} members · ${inr(total)} split`} onBack />
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
          <Empty title="No expenses yet" subtitle="Tap + to add the first one." />
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ gap: S.sm, paddingBottom: 110 }}
            renderItem={({ item: e }) => {
              const payer = memberById(e.paidBy);
              const share = myShare(e.id);
              return (
                <Pressable onLongPress={() => confirmDelete(e.id, e.description)}>
                  <Card style={styles.expRow}>
                    <View style={[styles.catDot, { backgroundColor: CATEGORIES[e.category].color }]} />
                    <View style={styles.expMain}>
                      <Text style={styles.expDesc} numberOfLines={1}>{e.description}</Text>
                      <Text style={styles.expMeta}>
                        {fmtDate(e.date)} · {payer?.name === 'Aarav Mehta' ? 'You' : payer?.name} paid
                        {e.recurring ? ' · ↻ monthly' : ''}
                      </Text>
                    </View>
                    <View style={styles.expRight}>
                      <Text style={styles.expAmt}>{inr(e.amount)}</Text>
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
          data={gMembers}
          keyExtractor={(m) => m!.id}
          contentContainerStyle={{ gap: S.sm, paddingBottom: 110 }}
          ListHeaderComponent={
            <Card style={styles.settleCard}>
              <Text style={styles.settleTitle}>⚡ Smart settle-up</Text>
              <Text style={styles.settleSub}>Hisab collapses every debt into the fewest possible payments.</Text>
              <View style={{ height: S.sm }} />
              <Btn label="See settle-up plan" onPress={() => router.push(`/group/${group.id}/settle`)} />
            </Card>
          }
          renderItem={({ item: m }) => {
            const net = nets[m!.id] ?? 0;
            return (
              <Card style={styles.balRow}>
                <Avatar name={m!.name} color={m!.color} size={44} />
                <View style={styles.balMain}>
                  <Text style={styles.balName}>{m!.name === 'Aarav Mehta' ? 'You' : m!.name}</Text>
                  <Text style={styles.balMeta}>
                    {net === 0 ? 'all settled' : net > 0 ? 'gets back' : 'owes'}
                  </Text>
                </View>
                {net !== 0 && (
                  <Text style={[styles.balAmt, { color: net > 0 ? C.up : C.down }]}>
                    {inr(Math.abs(net))}
                  </Text>
                )}
                {net === 0 && <Text style={styles.balSettled}>✓</Text>}
              </Card>
            );
          }}
          ListFooterComponent={
            <View>
              {showAddMember ? (
                <Card style={{ gap: S.sm, marginTop: S.sm }}>
                  <TextInput
                    placeholder="Name" placeholderTextColor={C.faint} value={newName} onChangeText={setNewName}
                    style={styles.input} />
                  <TextInput
                    placeholder="UPI ID (optional)" placeholderTextColor={C.faint} value={newUpi} onChangeText={setNewUpi}
                    style={styles.input} autoCapitalize="none" />
                  <View style={{ flexDirection: 'row', gap: S.sm }}>
                    <View style={{ flex: 1 }}><Btn label="Add" onPress={submitMember} disabled={!newName.trim()} /></View>
                    <View style={{ flex: 1 }}><Btn label="Cancel" variant="ghost" onPress={() => setShowAddMember(false)} /></View>
                  </View>
                </Card>
              ) : (
                <Pressable onPress={() => setShowAddMember(true)} style={styles.addMember}>
                  <Text style={styles.addMemberTxt}>+ Add member</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {tab === 'insights' && (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={{ paddingBottom: 110, gap: S.md }}
          ListHeaderComponent={
            <View style={{ gap: S.md }}>
              <Card style={styles.insightCard}>
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
                          <Text style={styles.legendVal}>{inr(c.value)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </Card>
              <Card style={styles.insightCard}>
                <Text style={styles.insightTitle}>Who paid the most</Text>
                <View style={{ height: S.sm }} />
                {paidTotals.map((p) => (
                  <HBar key={p.id} label={p.name.split(' ')[0]} value={p.value} max={paidTotals[0]?.value ?? 1} color={p.color} />
                ))}
              </Card>
              <View style={styles.statGrid}>
                <Card style={styles.statCard}>
                  <Text style={styles.statNum}>{expenses.length}</Text>
                  <Text style={styles.statLbl}>expenses</Text>
                </Card>
                <Card style={styles.statCard}>
                  <Text style={styles.statNum}>{inr(total / Math.max(expenses.length, 1))}</Text>
                  <Text style={styles.statLbl}>avg expense</Text>
                </Card>
              </View>
              {biggest && (
                <Card>
                  <Text style={styles.insightTitle}>Biggest expense</Text>
                  <Text style={styles.bigDesc}>{biggest.description}</Text>
                  <Text style={styles.bigAmt}>{inr(biggest.amount)}</Text>
                </Card>
              )}
            </View>
          }
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push(`/group/${group.id}/add`)}>
        <Text style={styles.fabTxt}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { color: C.muted, marginTop: 40, textAlign: 'center' },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  expMain: { flex: 1 },
  expDesc: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  expMeta: { color: C.muted, fontSize: 13 },
  expRight: { alignItems: 'flex-end' },
  expAmt: { color: C.text, fontSize: 16, fontWeight: '800' },
  expShare: { color: C.faint, fontSize: 12, marginTop: 2 },
  settleCard: { marginBottom: S.sm, backgroundColor: C.surface },
  settleTitle: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  settleSub: { color: C.muted, fontSize: 14, lineHeight: 20 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  balMain: { flex: 1 },
  balName: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  balMeta: { color: C.muted, fontSize: 13 },
  balAmt: { fontSize: 17, fontWeight: '800' },
  balSettled: { color: C.up, fontSize: 20, fontWeight: '800' },
  addMember: { alignItems: 'center', paddingVertical: S.md, marginTop: S.sm },
  addMemberTxt: { color: C.brand, fontWeight: '800', fontSize: 15 },
  input: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: R.md,
    paddingVertical: 13, paddingHorizontal: S.md, color: C.text, fontSize: 16,
  },
  insightCard: { gap: 2 },
  insightTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  muted: { color: C.muted, fontSize: 14 },
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: C.text, fontSize: 13, fontWeight: '600', flex: 1 },
  legendVal: { color: C.muted, fontSize: 13, fontWeight: '700' },
  statGrid: { flexDirection: 'row', gap: S.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: S.lg },
  statNum: { color: C.brand, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLbl: { color: C.muted, fontSize: 12, fontWeight: '600' },
  bigDesc: { color: C.muted, fontSize: 14, marginTop: 4 },
  bigAmt: { color: C.text, fontSize: 26, fontWeight: '800', marginTop: 2 },
  fab: {
    position: 'absolute', right: S.md, bottom: S.xl + 10, width: 60, height: 60, borderRadius: 30,
    backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  fabTxt: { color: C.brandInk, fontSize: 32, fontWeight: '400', marginTop: -3 },
});
