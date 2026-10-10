import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEvenly } from '@/store';
import { useAuth } from '@/auth';
import { fetchServerMembers, joinGroupByCode, updateMyMemberName } from '@/claims';
import { computeNets } from '@/settle';
import { fmtDate, inr } from '@/format';
import { C, F, R, S } from '@/theme';
import { AvatarStack } from '@/components/Avatar';
import { Amount, Btn, Card, Divider, Empty, Field, Header, Screen, TextField } from '@/components/ui';
import { CATEGORIES } from '@/types';

export default function Dashboard() {
  const {
    ready, onboarded, self, groups, expenses,
    memberById, groupExpenses, loadDemo, clearAll, addSyncedGroup,
  } = useEvenly();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded]);

  const me = self();
  const activeGroups = useMemo(() => groups.filter((g) => !g.archived), [groups]);
  const archivedGroups = useMemo(() => groups.filter((g) => g.archived), [groups]);

  const { owe, owed } = useMemo(() => {
    let owe = 0;
    let owed = 0;
    for (const g of activeGroups) {
      const net = computeNets(groupExpenses(g.id))[me?.id ?? ''] ?? 0;
      if (net < 0) owe += -net;
      else owed += net;
    }
    return { owe, owed };
  }, [activeGroups, groupExpenses, me]);

  const recent = useMemo(
    () => [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    [expenses],
  );

  const { signOut, profile, userId } = useAuth();

  if (!ready || !onboarded) {
    return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  }

  const net = owed - owe;

  const more = () =>
    Alert.alert('Menu', profile ? `Signed in as ${profile.display_name}` : undefined, [
      { text: 'Join group with code', onPress: () => { setJoinCode(''); setJoinError(''); setJoinOpen(true); } },
      { text: 'Sign out', style: 'destructive', onPress: confirmSignOut },
      { text: 'Explore demo data', onPress: loadDemo },
      { text: 'Clear all data', style: 'destructive', onPress: confirmClear },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const doJoin = async () => {
    const code = joinCode.trim();
    if (!code || joinBusy) return;
    const me = self();
    if (!me || !userId) return;
    setJoinBusy(true);
    setJoinError('');
    try {
      const srv = await joinGroupByCode(code);
      const existing = groups.find((g) => g.serverId === srv.id);
      if (existing) {
        setJoinOpen(false);
        router.push(`/group/${existing.id}`);
        return;
      }
      const members = await fetchServerMembers(srv.id);
      await updateMyMemberName(srv.id, me.name);
      const others = members
        .filter((m) => m.profile_id !== userId)
        .map((m) => m.member_name);
      const localId = addSyncedGroup(srv.name, srv.id, me.id, others);
      setJoinOpen(false);
      setJoinCode('');
      router.push(`/group/${localId}`);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Could not join the group.');
    } finally {
      setJoinBusy(false);
    }
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need to sign in again to sync payment claims.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  const confirmClear = () =>
    Alert.alert('Clear everything?', 'All groups, members and expenses will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearAll },
    ]);

  const onFab = () => {
    if (activeGroups.length === 0) router.push('/new-group');
    else if (activeGroups.length === 1) router.push(`/group/${activeGroups[0].id}/add`);
    else setPickerOpen(true);
  };

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? '';

  return (
    <Screen>
      <Header
        title="Evenly"
        right={
          <Pressable onPress={more} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="ellipsis-horizontal" size={20} color={C.muted} />
          </Pressable>
        }
      />

      {activeGroups.length === 0 && expenses.length === 0 ? (
        <Empty
          icon={<Ionicons name="people-outline" size={30} color={C.muted} />}
          title="Split your first bill"
          subtitle="Create a group for your roommates, friends or trip — then add expenses and let Evenly figure out who owes whom."
          action={
            <View style={{ gap: S.sm, width: '100%' }}>
              <Btn label="Create a group" onPress={() => router.push('/new-group')} />
              <Btn label="Explore with demo data" variant="secondary" onPress={loadDemo} />
            </View>
          }
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={{ paddingBottom: 110, gap: S.md }}
          ListHeaderComponent={
            <View style={{ gap: S.md }}>
              <Card>
                <Text style={styles.cardLabel}>Net balance</Text>
                <Amount size={34} weight={F.extra} color={net >= 0 ? C.greenStrong : C.red}>
                  {net >= 0 ? `+${inr(net)}` : `−${inr(-net)}`}
                </Amount>
                <Text style={styles.cardSub}>
                  {net >= 0 ? 'people owe you overall' : 'you owe overall'}
                </Text>
                <Divider />
                <View style={styles.balanceRow}>
                  <View style={styles.balanceCol}>
                    <Text style={styles.balanceLabel}>You owe</Text>
                    <Amount size={17} color={owe > 0 ? C.red : C.muted}>{inr(owe)}</Amount>
                  </View>
                  <View style={styles.balanceColRight}>
                    <Text style={styles.balanceLabel}>Owed to you</Text>
                    <Amount size={17} color={owed > 0 ? C.greenStrong : C.muted}>{inr(owed)}</Amount>
                  </View>
                </View>
              </Card>

              {recent.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Recent activity</Text>
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    {recent.map((e, i) => {
                      const payer = memberById(e.paidBy);
                      const share = e.splits.find((s) => s.memberId === me?.id)?.amount ?? 0;
                      return (
                        <View key={e.id}>
                          <View style={styles.recentRow}>
                            <View style={[styles.catDot, { backgroundColor: CATEGORIES[e.category].bg }]}>
                              <View style={[styles.catDotInner, { backgroundColor: CATEGORIES[e.category].color }]} />
                            </View>
                            <View style={styles.recentMain}>
                              <Text style={styles.recentDesc} numberOfLines={1}>{e.description}</Text>
                              <Text style={styles.recentMeta}>
                                {groupName(e.groupId)} · {fmtDate(e.date)} · {payer?.isSelf ? 'You' : payer?.name} paid
                              </Text>
                            </View>
                            <View style={styles.recentRight}>
                              <Amount size={15}>{inr(e.amount)}</Amount>
                              <Text style={styles.recentShare}>your share {inr(share)}</Text>
                            </View>
                          </View>
                          {i < recent.length - 1 && <Divider />}
                        </View>
                      );
                    })}
                  </Card>
                </View>
              )}

              <View>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Groups</Text>
                  <Pressable onPress={() => router.push('/new-group')} style={styles.newBtn}>
                    <Ionicons name="add" size={16} color={C.greenStrong} />
                    <Text style={styles.newBtnTxt}>New</Text>
                  </Pressable>
                </View>
                <View style={{ gap: S.sm }}>
                  {activeGroups.map((g) => {
                    const gExp = groupExpenses(g.id);
                    const gMembers = g.memberIds
                      .map((id) => memberById(id))
                      .filter((m) => m !== undefined);
                    const gNet = computeNets(gExp)[me?.id ?? ''] ?? 0;
                    const spent = gExp.reduce((a, e) => a + e.amount, 0);
                    return (
                      <Pressable key={g.id} onPress={() => router.push(`/group/${g.id}`)}>
                        <Card>
                          <View style={styles.groupTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.groupName} numberOfLines={1}>{g.name}</Text>
                              <Text style={styles.groupMeta}>
                                {gMembers.length} members · {inr(spent)} split
                              </Text>
                            </View>
                            <AvatarStack members={gMembers.map((m) => ({ name: m!.name, colorIdx: m!.colorIdx }))} />
                          </View>
                          {gNet !== 0 && (
                            <View style={[styles.netPill, { backgroundColor: gNet > 0 ? C.greenDim : C.redDim }]}>
                              <Text style={[styles.netTxt, { color: gNet > 0 ? C.greenStrong : C.red }]}>
                                {gNet > 0 ? `You get back ${inr(gNet)}` : `You owe ${inr(-gNet)}`}
                              </Text>
                            </View>
                          )}
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {archivedGroups.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Archived</Text>
                  <View style={{ gap: S.sm }}>
                    {archivedGroups.map((g) => (
                      <Pressable key={g.id} onPress={() => router.push(`/group/${g.id}`)}>
                        <Card style={styles.archivedCard}>
                          <Text style={styles.archivedName}>{g.name}</Text>
                          <Text style={styles.archivedTag}>Archived</Text>
                        </Card>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
        />
      )}

      <Pressable style={styles.fab} onPress={onFab}>
        <Ionicons name="add" size={30} color={C.white} />
      </Pressable>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.sheetBg} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add expense to…</Text>
            {activeGroups.map((g) => (
              <Pressable
                key={g.id}
                style={styles.sheetRow}
                onPress={() => {
                  setPickerOpen(false);
                  router.push(`/group/${g.id}/add`);
                }}
              >
                <Text style={styles.sheetRowTxt}>{g.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={C.faint} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={joinOpen} transparent animationType="fade" onRequestClose={() => setJoinOpen(false)}>
        <Pressable style={styles.sheetBg} onPress={() => setJoinOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Join group</Text>
            <Text style={styles.sheetSub}>Enter the 6-character invite code shared by a member.</Text>
            <Field label="Invite code">
              <TextField
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="A1B2C3"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                editable={!joinBusy}
                style={styles.codeInput}
              />
            </Field>
            {joinError ? <Text style={styles.joinError}>{joinError}</Text> : null}
            <View style={{ height: S.md }} />
            <Btn label={joinBusy ? 'Joining…' : 'Join group'} onPress={doJoin} disabled={joinBusy || joinCode.trim().length < 4} />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: F.regular, color: C.muted, marginTop: 40, textAlign: 'center' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontFamily: F.semi, color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  cardSub: { fontFamily: F.regular, color: C.muted, fontSize: 13, marginTop: 4, marginBottom: S.md },
  balanceRow: { flexDirection: 'row', marginTop: S.md },
  balanceCol: { flex: 1 },
  balanceColRight: { flex: 1, alignItems: 'flex-end' },
  balanceLabel: { fontFamily: F.medium, color: C.faint, fontSize: 12, marginBottom: 3 },
  sectionTitle: { fontFamily: F.bold, color: C.text, fontSize: 16, marginBottom: S.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.sm },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.greenDim, borderRadius: R.sm, paddingVertical: 7, paddingHorizontal: 12,
  },
  newBtnTxt: { fontFamily: F.bold, color: C.greenStrong, fontSize: 13 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md },
  catDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catDotInner: { width: 10, height: 10, borderRadius: 5 },
  recentMain: { flex: 1 },
  recentDesc: { fontFamily: F.semi, color: C.text, fontSize: 14, marginBottom: 2 },
  recentMeta: { fontFamily: F.regular, color: C.muted, fontSize: 12 },
  recentRight: { alignItems: 'flex-end' },
  recentShare: { fontFamily: F.regular, color: C.faint, fontSize: 11, marginTop: 2 },
  groupTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  groupName: { fontFamily: F.bold, color: C.text, fontSize: 16, marginBottom: 3 },
  groupMeta: { fontFamily: F.regular, color: C.muted, fontSize: 12 },
  netPill: { borderRadius: R.sm, paddingVertical: 7, paddingHorizontal: 10, alignSelf: 'flex-start', marginTop: S.sm },
  netTxt: { fontFamily: F.semi, fontSize: 13 },
  archivedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: 0.75 },
  archivedName: { fontFamily: F.semi, color: C.muted, fontSize: 15 },
  archivedTag: { fontFamily: F.semi, color: C.faint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
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
    padding: S.lg, paddingBottom: S.xl, gap: 4,
  },
  sheetTitle: { fontFamily: F.bold, fontSize: 17, color: C.text, marginBottom: S.sm },
  sheetSub: { fontFamily: F.regular, fontSize: 13, color: C.muted, marginBottom: S.sm },
  codeInput: { fontFamily: F.bold, fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  joinError: { fontFamily: F.medium, fontSize: 13, color: C.red, marginTop: S.sm },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  sheetRowTxt: { fontFamily: F.semi, fontSize: 15, color: C.text },
});
