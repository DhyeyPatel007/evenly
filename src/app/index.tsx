import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useHisab } from '@/store';
import { computeNets } from '@/settle';
import { inr } from '@/format';
import { C, R, S } from '@/theme';
import { AvatarStack, Avatar } from '@/components/Avatar';
import { Card, Empty, Header, Screen } from '@/components/ui';
import { ME } from '@/data';

export default function Home() {
  const { ready, groups, expenses, memberById, groupExpenses, resetDemo } = useHisab();

  if (!ready) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  const myNet = computeNets(expenses)['u1'] ?? 0;
  const totalSpent = expenses.reduce((a, e) => a + e.amount, 0);

  const confirmReset = () =>
    Alert.alert('Reset demo data?', 'This restores the sample groups and expenses.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetDemo },
    ]);

  return (
    <Screen>
      <Header
        title="Hisab"
        subtitle="Split smart. Settle fast."
        right={
          <Pressable onPress={confirmReset} style={styles.resetBtn} hitSlop={10}>
            <Text style={styles.resetTxt}>↺</Text>
          </Pressable>
        }
      />

      <Card style={styles.hero}>
        <View style={styles.heroRow}>
          <Avatar name={ME.name} color={ME.color} size={52} />
          <View>
            <Text style={styles.heroLabel}>{myNet >= 0 ? 'People owe you' : 'You owe'}</Text>
            <Text style={[styles.heroAmt, { color: myNet >= 0 ? C.up : C.down }]}>
              {inr(Math.abs(myNet))}
            </Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          <View>
            <Text style={styles.statLabel}>Groups</Text>
            <Text style={styles.statVal}>{groups.length}</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.statVal}>{expenses.length}</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Total split</Text>
            <Text style={styles.statVal}>{inr(totalSpent)}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Your groups</Text>
        <Link href="/new-group" asChild>
          <Pressable style={styles.newBtn}>
            <Text style={styles.newBtnTxt}>+ New</Text>
          </Pressable>
        </Link>
      </View>

      {groups.length === 0 ? (
        <Empty title="No groups yet" subtitle="Create a group for your room, trip or team and start splitting." />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ gap: S.sm, paddingBottom: S.xl }}
          renderItem={({ item: g }) => {
            const gExp = groupExpenses(g.id);
            const gMembers = g.memberIds.map((id) => memberById(id)).filter(Boolean);
            const net = computeNets(gExp)['u1'] ?? 0;
            const spent = gExp.reduce((a, e) => a + e.amount, 0);
            return (
              <Pressable onPress={() => router.push(`/group/${g.id}`)}>
                <Card style={styles.groupCard}>
                  <View style={styles.groupTop}>
                    <View>
                      <Text style={styles.groupName}>{g.name}</Text>
                      <Text style={styles.groupMeta}>
                        {gMembers.length} members · {gExp.length} expenses · {inr(spent)} split
                      </Text>
                    </View>
                    <AvatarStack members={gMembers.map((m) => ({ name: m!.name, color: m!.color }))} />
                  </View>
                  <View style={[styles.netPill, net >= 0 ? styles.netUp : styles.netDown]}>
                    <Text style={[styles.netTxt, { color: net >= 0 ? C.up : C.down }]}>
                      {net >= 0 ? 'You get back ' : 'You owe '}
                      <Text style={styles.netAmt}>{inr(Math.abs(net))}</Text>
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { color: C.muted, marginTop: 40, textAlign: 'center' },
  resetBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center',
  },
  resetTxt: { color: C.muted, fontSize: 20, marginTop: -2 },
  hero: { marginBottom: S.md, backgroundColor: C.surface },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginBottom: S.md },
  heroLabel: { color: C.muted, fontSize: 13, fontWeight: '600' },
  heroAmt: { fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  statLabel: { color: C.faint, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  statVal: { color: C.text, fontSize: 16, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: S.sm },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  newBtn: { backgroundColor: C.brandDim, borderWidth: 1, borderColor: 'rgba(198,245,46,0.35)', borderRadius: R.sm, paddingVertical: 7, paddingHorizontal: 14 },
  newBtnTxt: { color: C.brand, fontWeight: '800', fontSize: 14 },
  groupCard: { gap: S.sm },
  groupTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupName: { color: C.text, fontSize: 19, fontWeight: '800', marginBottom: 3 },
  groupMeta: { color: C.muted, fontSize: 13 },
  netPill: { borderRadius: R.sm, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  netUp: { backgroundColor: C.upDim },
  netDown: { backgroundColor: C.downDim },
  netTxt: { fontSize: 14, fontWeight: '600' },
  netAmt: { fontWeight: '800' },
});
