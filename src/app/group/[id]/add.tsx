import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useHisab } from '@/store';
import { resolveSplits, type ShareInput } from '@/settle';
import { inr, todayISO } from '@/format';
import { C, R, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Btn, Card, Header, Screen, Seg } from '@/components/ui';
import { CATEGORY_LIST, type Category, type SplitMode } from '@/types';

const MODES: { label: string; value: SplitMode; hint: string }[] = [
  { label: 'Equal', value: 'equal', hint: 'Split evenly' },
  { label: 'Shares', value: 'shares', hint: 'e.g. 2 shares vs 1' },
  { label: '%', value: 'percent', hint: 'Percentages' },
  { label: 'Exact', value: 'exact', hint: 'Exact ₹ amounts' },
];

export default function AddExpense() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups, memberById, addExpense } = useHisab();
  const group = groups.find((g) => g.id === id);

  const gMembers = (group?.memberIds ?? []).map((m) => memberById(m)).filter((m) => m !== undefined);
  const [desc, setDesc] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [cat, setCat] = useState<Category>('Food');
  const [paidBy, setPaidBy] = useState('u1');
  const [mode, setMode] = useState<SplitMode>('equal');
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [recurring, setRecurring] = useState(false);

  const amount = parseFloat(amountStr) || 0;
  const isIn = (mid: string) => included[mid] !== false;

  const shareInputs: ShareInput[] = useMemo(
    () =>
      gMembers
        .filter((m) => isIn(m!.id))
        .map((m) => ({ memberId: m!.id, value: parseFloat(values[m!.id] || '') || 0 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gMembers, included, values, mode],
  );

  const splits = useMemo(
    () => (amount > 0 ? resolveSplits(amount, mode, shareInputs) : []),
    [amount, mode, shareInputs],
  );

  const exactSum = splits.reduce((a, s) => a + s.amount, 0);
  const exactOk = mode !== 'exact' || Math.abs(exactSum - amount) < 0.005;
  const valid = desc.trim().length > 0 && amount > 0 && shareInputs.length > 0 && exactOk;

  const save = () => {
    if (!valid || !group) return;
    addExpense({
      groupId: group.id,
      description: desc.trim(),
      amount: Math.round(amount * 100) / 100,
      paidBy,
      category: cat,
      date: todayISO(),
      splitMode: mode,
      splits,
      ...(recurring ? { recurring: 'monthly' as const } : {}),
    });
    router.back();
  };

  if (!group) return <Screen><Header title="New expense" onBack /></Screen>;

  return (
    <Screen>
      <Header title="New expense" subtitle={group.name} onBack />
      <ScrollView contentContainerStyle={{ gap: S.md, paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.label}>What was it for?</Text>
          <TextInput
            placeholder="e.g. Dinner at Domino's" placeholderTextColor={C.faint}
            value={desc} onChangeText={setDesc} style={styles.input} autoFocus
          />
          <Text style={[styles.label, { marginTop: S.md }]}>Amount</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              placeholder="0" placeholderTextColor={C.faint} value={amountStr}
              onChangeText={(t) => setAmountStr(t.replace(/[^0-9.]/g, ''))}
              style={styles.amountInput} keyboardType="decimal-pad"
            />
          </View>
        </Card>

        <View>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORY_LIST.map((c) => (
              <Pressable key={c} onPress={() => setCat(c)} style={[styles.chip, cat === c && styles.chipActive]}>
                <Text style={[styles.chipTxt, cat === c && styles.chipTxtActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={styles.label}>Paid by</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
            {gMembers.map((m) => (
              <Pressable key={m!.id} onPress={() => setPaidBy(m!.id)} style={[styles.payer, paidBy === m!.id && styles.payerActive]}>
                <Avatar name={m!.name} color={m!.color} size={40} />
                <Text style={[styles.payerTxt, paidBy === m!.id && styles.payerTxtActive]} numberOfLines={1}>
                  {m!.name.split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={styles.label}>Split</Text>
          <Seg<SplitMode>
            value={mode}
            onChange={setMode}
            options={MODES.map((m) => ({ label: m.label, value: m.value }))}
          />
          <Text style={styles.hint}>{MODES.find((m) => m.value === mode)?.hint}</Text>
        </View>

        <Card>
          {gMembers.map((m) => {
            const inc = isIn(m!.id);
            const split = splits.find((s) => s.memberId === m!.id);
            return (
              <View key={m!.id}>
                <View style={styles.memberRow}>
                  <Pressable
                    onPress={() => mode === 'equal' && setIncluded((p) => ({ ...p, [m!.id]: !isIn(m!.id) }))}
                    style={styles.memberLeft}
                  >
                    {mode === 'equal' && (
                      <View style={[styles.check, inc && styles.checkOn]}>
                        {inc && <Text style={styles.checkTxt}>✓</Text>}
                      </View>
                    )}
                    <Avatar name={m!.name} color={m!.color} size={38} />
                    <Text style={[styles.memberName, !inc && styles.dimmed]}>
                      {m!.name === 'Aarav Mehta' ? 'You' : m!.name}
                    </Text>
                  </Pressable>
                  {mode !== 'equal' ? (
                    <TextInput
                      placeholder={mode === 'percent' ? '%' : mode === 'shares' ? 'shares' : '₹'}
                      placeholderTextColor={C.faint}
                      value={values[m!.id] ?? ''}
                      onChangeText={(t) => setValues((p) => ({ ...p, [m!.id]: t.replace(/[^0-9.]/g, '') }))}
                      style={styles.valueInput}
                      keyboardType="decimal-pad"
                    />
                  ) : (
                    <Text style={[styles.splitAmt, !inc && styles.dimmed]}>
                      {inc && split ? inr(split.amount) : '—'}
                    </Text>
                  )}
                </View>
                {mode !== 'equal' && (
                  <Text style={styles.perPerson}>
                    {split ? `pays ${inr(split.amount)}` : ' '}
                  </Text>
                )}
              </View>
            );
          })}
          {mode === 'exact' && !exactOk && (
            <Text style={styles.warn}>Exact amounts must add up to {inr(amount)} (now {inr(exactSum)})</Text>
          )}
        </Card>

        <Pressable onPress={() => setRecurring((r) => !r)} style={styles.recRow}>
          <View>
            <Text style={styles.recTitle}>↻ Recurring monthly</Text>
            <Text style={styles.recSub}>Rent, WiFi, mess bills…</Text>
          </View>
          <View style={[styles.toggle, recurring && styles.toggleOn]}>
            <View style={[styles.knob, recurring && styles.knobOn]} />
          </View>
        </Pressable>

        <Btn label={amount > 0 ? `Add · ${inr(amount)}` : 'Add expense'} onPress={save} disabled={!valid} />
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
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.md },
  rupee: { color: C.brand, fontSize: 24, fontWeight: '800', marginRight: 4 },
  amountInput: { flex: 1, color: C.text, fontSize: 28, fontWeight: '800', paddingVertical: 10, letterSpacing: -0.5 },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  chipActive: { backgroundColor: C.brand, borderColor: C.brand },
  chipTxt: { color: C.muted, fontWeight: '700', fontSize: 14 },
  chipTxtActive: { color: C.brandInk },
  payer: { alignItems: 'center', gap: 6, padding: 10, borderRadius: R.md, borderWidth: 1, borderColor: 'transparent', width: 76 },
  payerActive: { borderColor: C.brand, backgroundColor: C.brandDim },
  payerTxt: { color: C.muted, fontSize: 12, fontWeight: '700' },
  payerTxtActive: { color: C.text },
  hint: { color: C.faint, fontSize: 13, marginTop: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.brand, borderColor: C.brand },
  checkTxt: { color: C.brandInk, fontWeight: '800', fontSize: 14 },
  memberName: { color: C.text, fontSize: 15, fontWeight: '600' },
  dimmed: { opacity: 0.35 },
  splitAmt: { color: C.brand, fontSize: 15, fontWeight: '800' },
  valueInput: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: R.sm,
    paddingVertical: 8, paddingHorizontal: 12, color: C.text, fontSize: 15, minWidth: 86, textAlign: 'right',
  },
  perPerson: { color: C.faint, fontSize: 12, textAlign: 'right', marginTop: -6, marginBottom: 4 },
  warn: { color: C.down, fontSize: 13, fontWeight: '600', marginTop: 8 },
  recRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: S.md },
  recTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  recSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  toggle: { width: 50, height: 30, borderRadius: 15, backgroundColor: C.surface3, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: C.brand },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
});
