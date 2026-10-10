import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEvenly } from '@/store';
import { C, F, R, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Btn, Field, Header, Screen, TextField } from '@/components/ui';

export default function NewGroup() {
  const { self, addGroup } = useEvenly();
  const [name, setName] = useState('');
  const [rows, setRows] = useState<string[]>(['', '']);

  const me = self();
  const setRow = (i: number, v: string) => setRows((r) => r.map((x, k) => (k === i ? v : x)));
  const addRow = () => setRows((r) => [...r, '']);
  const removeRow = (i: number) => setRows((r) => (r.length > 1 ? r.filter((_, k) => k !== i) : r));

  const memberNames = rows.map((r) => r.trim()).filter(Boolean);
  const valid = name.trim().length > 0 && memberNames.length > 0;

  const save = () => {
    if (!valid) return;
    const id = addGroup(
      name.trim(),
      memberNames.map((n) => ({ name: n })),
      me ? [me.id] : [],
    );
    router.replace(`/group/${id}`);
  };

  return (
    <Screen>
      <Header title="New group" onBack />
      <ScrollView contentContainerStyle={{ gap: S.md, paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
        <Field label="Group name">
          <TextField
            placeholder="e.g. Flat 302, Leh Trip, Office lunch"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </Field>

        <View>
          <Text style={styles.label}>Members</Text>
          <View style={styles.meRow}>
            <Avatar name={me?.name ?? 'You'} colorIdx={me?.colorIdx ?? 1} size={38} />
            <Text style={styles.meName}>{me?.name ?? 'You'} (you)</Text>
          </View>
          {rows.map((row, i) => (
            <View key={i} style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextField
                  placeholder={`Person ${i + 1} — name`}
                  value={row}
                  onChangeText={(v) => setRow(i, v)}
                  autoCapitalize="words"
                />
              </View>
              <Pressable onPress={() => removeRow(i)} style={styles.rowBtn} hitSlop={8}>
                <Ionicons name="close" size={18} color={C.faint} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addRow} style={styles.addRow}>
            <Ionicons name="add" size={16} color={C.greenStrong} />
            <Text style={styles.addRowTxt}>Add another person</Text>
          </Pressable>
          <Text style={styles.hint}>
            You can add email and UPI details for members later from the group.
          </Text>
        </View>

        <Btn label="Create group" onPress={save} disabled={!valid} />
        {!valid && (
          <Text style={styles.warn}>Give the group a name and add at least one person.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: F.semi, color: C.muted, fontSize: 12,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.7,
  },
  meRow: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: C.greenDim, borderRadius: R.md,
    padding: S.sm, marginBottom: S.sm,
  },
  meName: { fontFamily: F.semi, color: C.greenStrong, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.sm },
  rowBtn: {
    width: 44, height: 44, borderRadius: R.md,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: S.sm },
  addRowTxt: { fontFamily: F.bold, color: C.greenStrong, fontSize: 14 },
  hint: { fontFamily: F.regular, color: C.faint, fontSize: 12, lineHeight: 17, marginTop: 4 },
  warn: { fontFamily: F.medium, color: C.amber, fontSize: 13, textAlign: 'center' },
});
