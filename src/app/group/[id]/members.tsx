import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEvenly } from '@/store';
import { isValidUpi } from '@/upi';
import { C, F, R, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Btn, Card, Empty, Field, Header, Screen, TextField } from '@/components/ui';

export default function Members() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    ready, groups, memberById, groupExpenses,
    addMember, updateMember, removeMember, restoreMember,
  } = useEvenly();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fUpi, setFUpi] = useState('');
  const [fError, setFError] = useState('');

  const group = groups.find((g) => g.id === id);

  if (!ready) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  if (!group) return <Screen><Header title="Members" onBack /></Screen>;

  const gMembers = group.memberIds.map((mid) => memberById(mid)).filter((m) => m !== undefined);
  const active = gMembers.filter((m) => m!.active);
  const archived = gMembers.filter((m) => !m!.active);

  const hasHistory = (memberId: string) =>
    groupExpenses(group.id).some(
      (e) => e.paidBy === memberId || e.splits.some((s) => s.memberId === memberId),
    );

  const openAdd = () => {
    setEditingId(null);
    setFName('');
    setFEmail('');
    setFUpi('');
    setFError('');
    setFormOpen(true);
  };

  const openEdit = (mid: string) => {
    const m = memberById(mid);
    if (!m) return;
    setEditingId(mid);
    setFName(m.name);
    setFEmail(m.email ?? '');
    setFUpi(m.upi ?? '');
    setFError('');
    setFormOpen(true);
  };

  const submit = () => {
    if (editingId) {
      const r = updateMember(editingId, { name: fName, email: fEmail, upi: fUpi });
      if (!r.ok) {
        setFError(r.error);
        return;
      }
    } else {
      const r = addMember(group.id, { name: fName, email: fEmail, upi: fUpi });
      if (!r.ok) {
        setFError(r.error);
        return;
      }
    }
    setFormOpen(false);
  };

  const confirmRemove = (mid: string, name: string) => {
    const history = hasHistory(mid);
    Alert.alert(
      history ? 'Archive member?' : 'Remove member?',
      history
        ? `${name} has expense history in this group. They'll be archived — past expenses stay intact, but they won't appear in new splits.`
        : `${name} has no expenses here and will be removed from the group.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: history ? 'Archive' : 'Remove',
          style: 'destructive',
          onPress: () => removeMember(group.id, mid),
        },
      ],
    );
  };

  return (
    <Screen>
      <Header
        title="Members"
        subtitle={`${active.length} in ${group.name}`}
        onBack
        right={
          <Pressable onPress={openAdd} style={styles.addBtn}>
            <Ionicons name="add" size={18} color={C.white} />
          </Pressable>
        }
      />

      {formOpen ? (
        <Card style={{ gap: S.sm }}>
          <Text style={styles.formTitle}>{editingId ? 'Edit member' : 'Add member'}</Text>
          <Field label="Name">
            <TextField placeholder="Full name" value={fName} onChangeText={setFName} autoCapitalize="words" autoFocus />
          </Field>
          <Field label="Email (optional)">
            <TextField placeholder="name@email.com" value={fEmail} onChangeText={setFEmail} keyboardType="email-address" autoCapitalize="none" />
          </Field>
          <Field label="UPI ID (optional)" hint="Used for one-tap settle-up payments.">
            <TextField placeholder="name@okhdfc" value={fUpi} onChangeText={setFUpi} autoCapitalize="none" />
          </Field>
          {fUpi.trim() && !isValidUpi(fUpi) ? (
            <Text style={styles.upiWarn}>Doesn’t look like a valid UPI ID — e.g. name@okhdfc</Text>
          ) : null}
          {fError ? <Text style={styles.error}>{fError}</Text> : null}
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <View style={{ flex: 1 }}>
              <Btn label={editingId ? 'Save' : 'Add'} onPress={submit} disabled={!fName.trim()} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn label="Cancel" variant="secondary" onPress={() => setFormOpen(false)} />
            </View>
          </View>
        </Card>
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={{ paddingBottom: S.xl, gap: S.md }}
          ListHeaderComponent={
            <View style={{ gap: S.md }}>
              <View style={{ gap: S.sm }}>
                {active.map((m) => (
                  <Card key={m!.id} style={styles.row}>
                    <Avatar name={m!.name} colorIdx={m!.colorIdx} size={44} />
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName}>
                        {m!.name} {m!.isSelf ? <Text style={styles.youTag}>· you</Text> : null}
                      </Text>
                      {[m!.email, m!.upi ? `UPI ${m!.upi}` : null].filter(Boolean).length > 0 && (
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {[m!.email, m!.upi ? `UPI ${m!.upi}` : null].filter(Boolean).join('  ·  ')}
                        </Text>
                      )}
                    </View>
                    <Pressable onPress={() => openEdit(m!.id)} style={styles.iconBtn} hitSlop={8}>
                      <Ionicons name="pencil-outline" size={17} color={C.muted} />
                    </Pressable>
                    {!m!.isSelf && (
                      <Pressable onPress={() => confirmRemove(m!.id, m!.name)} style={styles.iconBtn} hitSlop={8}>
                        <Ionicons name="trash-outline" size={17} color={C.red} />
                      </Pressable>
                    )}
                  </Card>
                ))}
              </View>

              {archived.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Archived</Text>
                  <Text style={styles.sectionSub}>
                    These members left the group. Their expense history is preserved.
                  </Text>
                  <View style={{ gap: S.sm, marginTop: S.sm }}>
                    {archived.map((m) => (
                      <Card key={m!.id} style={[styles.row, styles.archivedRow]}>
                        <Avatar name={m!.name} colorIdx={m!.colorIdx} size={40} />
                        <Text style={[styles.rowName, styles.archivedName]}>{m!.name}</Text>
                        <View style={{ flex: 1 }} />
                        <Pressable onPress={() => restoreMember(m!.id)} style={styles.restoreBtn}>
                          <Text style={styles.restoreTxt}>Restore</Text>
                        </Pressable>
                      </Card>
                    ))}
                  </View>
                </View>
              )}

              {active.length === 0 && (
                <Empty
                  icon={<Ionicons name="people-outline" size={28} color={C.muted} />}
                  title="No members"
                  subtitle="Add people to start splitting expenses."
                />
              )}
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: F.regular, color: C.muted, marginTop: 40, textAlign: 'center' },
  addBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  rowMain: { flex: 1 },
  rowName: { fontFamily: F.semi, color: C.text, fontSize: 15, marginBottom: 2 },
  youTag: { fontFamily: F.medium, color: C.greenStrong, fontSize: 12 },
  rowSub: { fontFamily: F.regular, color: C.muted, fontSize: 12 },
  iconBtn: { padding: 6 },
  sectionTitle: { fontFamily: F.bold, color: C.text, fontSize: 15, marginBottom: 4 },
  sectionSub: { fontFamily: F.regular, color: C.muted, fontSize: 13, lineHeight: 18 },
  archivedRow: { opacity: 0.75 },
  archivedName: { color: C.muted },
  restoreBtn: { backgroundColor: C.greenDim, borderRadius: R.sm, paddingVertical: 7, paddingHorizontal: 12 },
  restoreTxt: { fontFamily: F.bold, color: C.greenStrong, fontSize: 13 },
  formTitle: { fontFamily: F.bold, color: C.text, fontSize: 16 },
  error: { fontFamily: F.medium, color: C.red, fontSize: 13 },
  upiWarn: { fontFamily: F.medium, color: C.amber, fontSize: 12, marginTop: -2 },
});
