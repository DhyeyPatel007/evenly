import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHisab } from '@/store';
import { fmtDateFull, inr } from '@/format';
import { C, F, R, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Amount, Card, Divider, Empty, Header, Screen } from '@/components/ui';
import { CATEGORIES, type SplitMode } from '@/types';

const MODE_LABEL: Record<SplitMode, string> = {
  equal: 'Split equally',
  shares: 'Split by shares',
  percent: 'Split by percentage',
  exact: 'Split by exact amounts',
};

export default function ExpenseDetail() {
  const { id, eid } = useLocalSearchParams<{ id: string; eid: string }>();
  const { ready, groups, expenseById, memberById, deleteExpense } = useHisab();

  const group = groups.find((g) => g.id === id);
  const expense = eid ? expenseById(eid) : undefined;

  if (!ready) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  if (!group || !expense) {
    return (
      <Screen>
        <Header title="Expense" onBack />
        <Empty
          icon={<Ionicons name="receipt-outline" size={28} color={C.muted} />}
          title="Expense not found"
          subtitle="It may have been deleted."
        />
      </Screen>
    );
  }

  const payer = memberById(expense.paidBy);

  const confirmDelete = () =>
    Alert.alert('Delete expense?', `"${expense.description}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteExpense(expense.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Header
        title="Expense"
        onBack
        right={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push(`/group/${group.id}/add?edit=${expense.id}`)}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="pencil-outline" size={19} color={C.muted} />
            </Pressable>
            <Pressable onPress={confirmDelete} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={19} color={C.red} />
            </Pressable>
          </View>
        }
      />

      <View style={{ gap: S.md }}>
        <Card>
          <View style={styles.topRow}>
            <View style={[styles.catChip, { backgroundColor: CATEGORIES[expense.category].bg }]}>
              <Text style={[styles.catTxt, { color: CATEGORIES[expense.category].color }]}>
                {expense.category}
              </Text>
            </View>
            <Text style={styles.date}>{fmtDateFull(expense.date)}</Text>
          </View>
          <Text style={styles.desc}>{expense.description}</Text>
          <Amount size={34} weight={F.extra}>{inr(expense.amount)}</Amount>
          <View style={styles.paidRow}>
            <Avatar name={payer?.name ?? '?'} colorIdx={payer?.colorIdx ?? 0} size={34} />
            <Text style={styles.paidTxt}>
              <Text style={styles.paidName}>{payer?.isSelf ? 'You' : payer?.name}</Text> paid
            </Text>
          </View>
          {expense.note ? (
            <>
              <Divider />
              <Text style={styles.note}>{expense.note}</Text>
            </>
          ) : null}
        </Card>

        <View>
          <Text style={styles.sectionTitle}>
            Split breakdown <Text style={styles.modeTag}>· {MODE_LABEL[expense.splitMode]}</Text>
          </Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {expense.splits.map((s, i) => {
              const m = memberById(s.memberId);
              const isPayer = s.memberId === expense.paidBy;
              return (
                <View key={s.memberId}>
                  <View style={styles.splitRow}>
                    <Avatar name={m?.name ?? '?'} colorIdx={m?.colorIdx ?? 0} size={38} />
                    <Text style={styles.splitName} numberOfLines={1}>
                      {m?.isSelf ? 'You' : m?.name}
                      {m && !m.active && <Text style={styles.archivedTag}> · archived</Text>}
                    </Text>
                    {isPayer && (
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeTxt}>paid</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <Amount size={15}>−{inr(s.amount)}</Amount>
                  </View>
                  {i < expense.splits.length - 1 && <Divider />}
                </View>
              );
            })}
          </Card>
        </View>
      </View>
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.sm },
  catChip: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  catTxt: { fontFamily: F.bold, fontSize: 12 },
  date: { fontFamily: F.medium, color: C.muted, fontSize: 13 },
  desc: { fontFamily: F.bold, color: C.text, fontSize: 19, marginBottom: 6 },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md },
  paidTxt: { fontFamily: F.regular, color: C.muted, fontSize: 14 },
  paidName: { fontFamily: F.bold, color: C.text },
  note: { fontFamily: F.regular, color: C.muted, fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontFamily: F.bold, color: C.text, fontSize: 16, marginBottom: S.sm },
  modeTag: { fontFamily: F.medium, color: C.faint, fontSize: 12 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md },
  splitName: { fontFamily: F.semi, color: C.text, fontSize: 14, maxWidth: '45%' },
  archivedTag: { fontFamily: F.medium, color: C.faint, fontSize: 11 },
  paidBadge: { backgroundColor: C.greenDim, borderRadius: R.sm, paddingVertical: 3, paddingHorizontal: 8 },
  paidBadgeTxt: { fontFamily: F.bold, color: C.greenStrong, fontSize: 11 },
});
