import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useHisab } from '@/store';
import { C, R, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Btn, Card, Header, Screen } from '@/components/ui';

export default function NewGroup() {
  const { members, addGroup } = useHisab();
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({ u1: true });

  const toggle = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));
  const ids = members.filter((m) => picked[m.id]).map((m) => m.id);
  const valid = name.trim().length > 0 && ids.length >= 2;

  const save = () => {
    if (!valid) return;
    const id = addGroup(name.trim(), ids);
    router.replace(`/group/${id}`);
  };

  return (
    <Screen>
      <Header title="New group" onBack />
      <ScrollView contentContainerStyle={{ gap: S.md, paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.label}>Group name</Text>
          <TextInput
            placeholder="e.g. Flat 302, Leh Trip" placeholderTextColor={C.faint}
            value={name} onChangeText={setName} style={styles.input} autoFocus
          />
        </Card>
        <View>
          <Text style={styles.label}>Members · {ids.length} selected</Text>
          <View style={{ gap: S.sm }}>
            {members.map((m) => {
              const on = !!picked[m.id];
              return (
                <Pressable key={m.id} onPress={() => toggle(m.id)}>
                  <Card style={[styles.row, on ? styles.rowOn : null]}>
                    <View style={[styles.check, on && styles.checkOn]}>
                      {on && <Text style={styles.checkTxt}>✓</Text>}
                    </View>
                    <Avatar name={m.name} color={m.color} size={40} />
                    <Text style={styles.name}>{m.name}</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Pick at least 2 members. You can add more people later from the Balances tab.</Text>
        </View>
        <Btn label="Create group" onPress={save} disabled={!valid} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: C.muted, fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: R.md,
    paddingVertical: 13, paddingHorizontal: S.md, color: C.text, fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  rowOn: { borderColor: 'rgba(198,245,46,0.4)' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.brand, borderColor: C.brand },
  checkTxt: { color: C.brandInk, fontWeight: '800', fontSize: 14 },
  name: { color: C.text, fontSize: 16, fontWeight: '600' },
  hint: { color: C.faint, fontSize: 13, marginTop: 8, lineHeight: 18 },
});
