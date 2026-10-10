import { useMemo } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useHisab } from '@/store';
import { computeNets, simplifyDebts } from '@/settle';
import { inr, todayISO } from '@/format';
import { C, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Btn, Card, Empty, Header, Screen } from '@/components/ui';

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

  const upiUrl = (toId: string, amount: number) => {
    const m = memberById(toId);
    if (!m?.upi) return null;
    return `upi://pay?pa=${m.upi}&pn=${encodeURIComponent(m.name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Hisab settle-up')}`;
  };

  const payViaUpi = async (toId: string, amount: number) => {
    const url = upiUrl(toId, amount);
    if (!url) {
      Alert.alert('No UPI ID', 'Ask them to add their UPI ID first.');
      return;
    }
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
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
        <Empty title="All settled ✓" subtitle="Nobody owes anybody anything in this group." />
      ) : (
        <FlatList
          data={plan}
          keyExtractor={(p, i) => `${p.from}-${p.to}-${i}`}
          contentContainerStyle={{ gap: S.md, paddingBottom: S.xl }}
          ListHeaderComponent={
            <Card style={styles.hero}>
              <Text style={styles.heroTitle}>⚡ Smart plan</Text>
              <Text style={styles.heroSub}>
                <Text style={styles.heroNum}>{plan.length}</Text> payment{plan.length > 1 ? 's' : ''} settle
                everyone{naive > plan.length ? ` — instead of ${naive} the naive way` : ''}.
              </Text>
            </Card>
          }
          renderItem={({ item: p }) => {
            const from = memberById(p.from);
            const to = memberById(p.to);
            const canUpi = !!to?.upi;
            return (
              <Card>
                <View style={styles.row}>
                  <Avatar name={from?.name ?? '?'} color={from?.color ?? '#888'} size={46} />
                  <View style={styles.mid}>
                    <Text style={styles.names} numberOfLines={1}>
                      {from?.name.split(' ')[0]} <Text style={styles.arrow}>→</Text> {to?.name.split(' ')[0]}
                    </Text>
                    <Text style={styles.amt}>{inr(p.amount)}</Text>
                  </View>
                  <Avatar name={to?.name ?? '?'} color={to?.color ?? '#888'} size={46} />
                </View>
                <View style={{ height: S.sm }} />
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Btn
                      label={canUpi ? 'Pay via UPI' : 'No UPI ID'}
                      onPress={() => payViaUpi(p.to, p.amount)}
                      disabled={!canUpi}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Btn label="Mark paid" variant="ghost" onPress={() => markPaid(p.from, p.to, p.amount)} />
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { color: C.muted, marginTop: 40, textAlign: 'center' },
  hero: { marginBottom: 2 },
  heroTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  heroSub: { color: C.muted, fontSize: 15, lineHeight: 22 },
  heroNum: { color: C.brand, fontWeight: '800', fontSize: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  mid: { flex: 1 },
  names: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  arrow: { color: C.brand },
  amt: { color: C.brand, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  actions: { flexDirection: 'row', gap: S.sm },
});
