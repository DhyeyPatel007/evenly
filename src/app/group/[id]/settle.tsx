import { useMemo } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHisab } from '@/store';
import { computeNets, simplifyDebts } from '@/settle';
import { inr, todayISO } from '@/format';
import { C, F, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Amount, Btn, Card, Empty, Header, Screen } from '@/components/ui';

export default function Settle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, groups, groupExpenses, memberById, addExpense } = useHisab();
  const group = groups.find((g) => g.id === id);
  const expenses = useMemo(() => (id ? groupExpenses(id) : []), [id, groupExpenses]);
  const nets = useMemo(() => computeNets(expenses), [expenses]);
  const plan = useMemo(() => simplifyDebts(nets), [nets]);

  const debtors = Object.values(nets).filter((n) => n < -0.005).length;
  const creditors = Object.values(nets).filter((n) => n > 0.005).length;
  const naive = debtors * creditors;

  if (!ready) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  if (!group) return <Screen><Header title="Settle up" onBack /></Screen>;

  const payViaUpi = async (toId: string, amount: number) => {
    const m = memberById(toId);
    if (!m?.upi) {
      Alert.alert('No UPI ID', 'Add a UPI ID for this member first (Members tab).');
      return;
    }
    const url =
      `upi://pay?pa=${m.upi}&pn=${encodeURIComponent(m.name)}` +
      `&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Hisab settle-up')}`;
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else Alert.alert('UPI not available', 'No UPI app found on this device.');
    } catch {
      Alert.alert('UPI not available', 'Could not open a UPI app.');
    }
  };

  const markPaid = (fromId: string, toId: string, amount: number) => {
    const from = memberById(fromId);
    const to = memberById(toId);
    Alert.alert('Mark as paid?', `${from?.name} paid ${inr(amount)} to ${to?.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Paid',
        onPress: () =>
          addExpense({
            groupId: group.id,
            description: `Settlement · ${from?.name.split(' ')[0]} → ${to?.name.split(' ')[0]}`,
            amount,
            paidBy: fromId,
            category: 'Other',
            date: todayISO(),
            splitMode: 'exact',
            splits: [{ memberId: toId, amount }],
          }),
      },
    ]);
  };

  return (
    <Screen>
      <Header title="Settle up" subtitle={group.name} onBack />
      {plan.length === 0 ? (
        <Empty
          icon={<Ionicons name="checkmark-circle-outline" size={30} color={C.green} />}
          title="All settled"
          subtitle="Nobody owes anybody anything in this group."
        />
      ) : (
        <FlatList
          data={plan}
          keyExtractor={(p, i) => `${p.from}-${p.to}-${i}`}
          contentContainerStyle={{ gap: S.md, paddingBottom: S.xl }}
          ListHeaderComponent={
            <Card style={styles.hero}>
              <View style={styles.heroHead}>
                <Ionicons name="flash" size={20} color={C.greenStrong} />
                <Text style={styles.heroTitle}>Smart plan</Text>
              </View>
              <Text style={styles.heroSub}>
                <Text style={styles.heroNum}>{plan.length}</Text> payment{plan.length > 1 ? 's' : ''} settle
                everyone{naive > plan.length ? ` — instead of ${naive} the naive way` : ''}.
              </Text>
            </Card>
          }
          renderItem={({ item: p }) => {
            const from = memberById(p.from);
            const to = memberById(p.to);
            return (
              <Card>
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
                      onPress={() => payViaUpi(p.to, p.amount)}
                      disabled={!to?.upi}
                      icon={<Ionicons name="phone-portrait-outline" size={16} color={C.white} />}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Btn label="Mark paid" variant="secondary" onPress={() => markPaid(p.from, p.to, p.amount)} />
                  </View>
                </View>
                {!to?.upi && (
                  <Text style={styles.noUpi}>Add their UPI ID from the Members tab to enable one-tap pay.</Text>
                )}
              </Card>
            );
          }}
        />
      )}
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
});
