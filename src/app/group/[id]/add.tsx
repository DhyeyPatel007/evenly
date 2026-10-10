import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEvenly } from '@/store';
import { resolveSplits, type ShareInput } from '@/settle';
import { fmtDateFull, inr, todayISO } from '@/format';
import { C, F, R, S } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Amount, Btn, Card, Field, Header, Screen, Seg, TextField } from '@/components/ui';
import { CATEGORY_LIST, type Category, type Expense, type Member, type SplitMode } from '@/types';

const MODES: { label: string; value: SplitMode; hint: string }[] = [
  { label: 'Equal', value: 'equal', hint: 'Split evenly between selected members.' },
  { label: 'Shares', value: 'shares', hint: 'Weighted by shares — e.g. 2 shares vs 1.' },
  { label: '%', value: 'percent', hint: 'Split by percentage (must total 100%).' },
  { label: 'Exact', value: 'exact', hint: 'Enter the exact ₹ each person owes.' },
];

function isoOf(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function dateOf(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function AddExpense() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { ready, groups, expenseById } = useEvenly();
  const group = groups.find((g) => g.id === id);
  const editing = edit ? expenseById(edit) : undefined;

  if (!ready) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  if (!group) return <Screen><Header title={edit ? 'Edit expense' : 'New expense'} onBack /></Screen>;
  // key remounts the form per expense; lazy state init then always sees final data
  return <ExpenseForm key={edit ?? 'new'} groupId={group.id} groupName={group.name} initial={editing} />;
}

function ExpenseForm({
  groupId,
  groupName,
  initial,
}: {
  groupId: string;
  groupName: string;
  initial?: Expense;
}) {
  const { activeMembers, memberById, addExpense, updateExpense } = useEvenly();

  const baseMembers = activeMembers(groupId);
  // Keep archived members visible (read-only) if they're part of the expense being edited.
  const formMembers: Member[] = useMemo(() => {
    if (!initial) return baseMembers;
    const extra = initial.splits
      .map((s) => memberById(s.memberId))
      .filter((m): m is Member => !!m && !m.active && !baseMembers.some((b) => b.id === m.id));
    return [...baseMembers, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultPayer = () => {
    if (initial) return initial.paidBy;
    const me = formMembers.find((m) => m.isSelf);
    return me ? me.id : (formMembers[0]?.id ?? '');
  };

  const [desc, setDesc] = useState(initial?.description ?? '');
  const [amountStr, setAmountStr] = useState(initial ? String(initial.amount) : '');
  const [cat, setCat] = useState<Category>(initial?.category ?? 'Food');
  const [paidBy, setPaidBy] = useState(defaultPayer);
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [showDate, setShowDate] = useState(false);
  const [note, setNote] = useState(initial?.note ?? '');
  const [mode, setMode] = useState<SplitMode>(initial?.splitMode ?? 'equal');
  const [included, setIncluded] = useState<Record<string, boolean>>(() => {
    if (!initial) return {};
    const inc: Record<string, boolean> = {};
    for (const s of initial.splits) inc[s.memberId] = true;
    return inc;
  });
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!initial || initial.splitMode === 'equal') return {};
    const vals: Record<string, string> = {};
    for (const s of initial.splits) vals[s.memberId] = String(s.amount);
    return vals;
  });

  const amount = parseFloat(amountStr) || 0;
  const isIn = (mid: string) => included[mid] !== false;

  const shareInputs: ShareInput[] = useMemo(
    () =>
      formMembers
        .filter((m) => m.active && isIn(m.id))
        .map((m) => ({ memberId: m.id, value: parseFloat(values[m.id] || '') || 0 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formMembers, included, values],
  );

  const splits = useMemo(
    () => (amount > 0 ? resolveSplits(amount, mode, shareInputs) : []),
    [amount, mode, shareInputs],
  );

  const splitSum = splits.reduce((a, s) => a + s.amount, 0);
  const modeOk =
    mode === 'percent'
      ? Math.abs(shareInputs.reduce((a, s) => a + s.value, 0) - 100) < 0.005
      : mode === 'exact'
        ? Math.abs(splitSum - amount) < 0.005
        : true;

  const valid =
    desc.trim().length > 0 && amount > 0 && paidBy && shareInputs.length > 0 && modeOk;

  const save = () => {
    if (!valid) return;
    const payload = {
      groupId,
      description: desc.trim(),
      amount: Math.round(amount * 100) / 100,
      paidBy,
      category: cat,
      date,
      splitMode: mode,
      splits,
      note: note.trim() || undefined,
    };
    if (initial) updateExpense(initial.id, payload);
    else addExpense(payload);
    router.back();
  };

  const payer = memberById(paidBy);

  return (
    <Screen>
      <Header title={initial ? 'Edit expense' : 'New expense'} subtitle={groupName} onBack />
      <ScrollView contentContainerStyle={{ gap: S.md, paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
        <Card style={{ gap: S.md }}>
          <Field label="Description">
            <TextField placeholder="e.g. Dinner at Domino's" value={desc} onChangeText={setDesc} autoFocus={!initial} />
          </Field>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field label="Amount">
                <View style={styles.amountWrap}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextField
                    placeholder="0"
                    value={amountStr}
                    onChangeText={(t) => setAmountStr(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    style={styles.amountInput}
                  />
                </View>
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Date">
                <Pressable onPress={() => setShowDate(true)} style={styles.dateBtn}>
                  <Ionicons name="calendar-outline" size={16} color={C.muted} />
                  <Text style={styles.dateTxt}>{fmtDateFull(date)}</Text>
                </Pressable>
              </Field>
            </View>
          </View>
          {showDate && (
            <DateTimePicker
              value={dateOf(date)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowDate(false);
                if (d) setDate(isoOf(d));
              }}
            />
          )}
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
            {formMembers.filter((m) => m.active).map((m) => (
              <Pressable key={m.id} onPress={() => setPaidBy(m.id)} style={[styles.payer, paidBy === m.id && styles.payerActive]}>
                <Avatar name={m.name} colorIdx={m.colorIdx} size={40} />
                <Text style={[styles.payerTxt, paidBy === m.id && styles.payerTxtActive]} numberOfLines={1}>
                  {m.isSelf ? 'You' : m.name.split(' ')[0]}
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

        <Card style={{ paddingVertical: S.sm }}>
          {formMembers.map((m) => {
            const inc = isIn(m.id);
            const split = splits.find((s) => s.memberId === m.id);
            const archived = !m.active;
            return (
              <View key={m.id} style={styles.memberBlock}>
                <View style={styles.memberRow}>
                  <Pressable
                    onPress={() => !archived && mode === 'equal' && setIncluded((p) => ({ ...p, [m.id]: !isIn(m.id) }))}
                    style={styles.memberLeft}
                    disabled={archived}
                  >
                    {mode === 'equal' && !archived && (
                      <View style={[styles.check, inc && styles.checkOn]}>
                        {inc && <Ionicons name="checkmark" size={14} color={C.white} />}
                      </View>
                    )}
                    <Avatar name={m.name} colorIdx={m.colorIdx} size={38} />
                    <View>
                      <Text style={[styles.memberName, (!inc || archived) && styles.dimmed]}>
                        {m.isSelf ? 'You' : m.name}
                      </Text>
                      {archived && <Text style={styles.archivedTag}>archived</Text>}
                    </View>
                  </Pressable>
                  {mode !== 'equal' && !archived ? (
                    <TextField
                      placeholder={mode === 'percent' ? '%' : mode === 'shares' ? 'shares' : '₹'}
                      value={values[m.id] ?? ''}
                      onChangeText={(t) => setValues((p) => ({ ...p, [m.id]: t.replace(/[^0-9.]/g, '') }))}
                      keyboardType="decimal-pad"
                      style={styles.valueInput}
                    />
                  ) : (
                    <Amount size={15} color={!inc || archived ? C.faint : C.greenStrong}>
                      {split && (inc || archived) ? inr(split.amount) : '—'}
                    </Amount>
                  )}
                </View>
                {mode !== 'equal' && !archived && split && (
                  <Text style={styles.perPerson}>owes {inr(split.amount)}</Text>
                )}
              </View>
            );
          })}
          {(mode === 'percent' || mode === 'exact') && !modeOk && amount > 0 && (
            <Text style={styles.warn}>
              {mode === 'percent'
                ? `Percentages must total 100% (now ${shareInputs.reduce((a, s) => a + s.value, 0)}%)`
                : `Exact amounts must add up to ${inr(amount)} (now ${inr(splitSum)})`}
            </Text>
          )}
        </Card>

        <Field label="Note (optional)">
          <TextField placeholder="Anything worth remembering…" value={note} onChangeText={setNote} multiline />
        </Field>

        <View style={styles.summary}>
          <Text style={styles.summaryTxt}>
            <Text style={styles.summaryName}>{payer?.isSelf ? 'You' : payer?.name}</Text>
            {' paid '}
            <Text style={styles.summaryAmt}>{inr(amount)}</Text>
            {splits.length > 0 && ` · ${splits.length} participant${splits.length > 1 ? 's' : ''}`}
          </Text>
        </View>

        <Btn label={initial ? 'Save changes' : amount > 0 ? `Add · ${inr(amount)}` : 'Add expense'} onPress={save} disabled={!valid} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: F.regular, color: C.muted, marginTop: 40, textAlign: 'center' },
  label: {
    fontFamily: F.semi, color: C.muted, fontSize: 12,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.7,
  },
  twoCol: { flexDirection: 'row', gap: S.md },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong,
    borderRadius: R.md, paddingHorizontal: S.md,
  },
  rupee: { fontFamily: F.extra, color: C.greenStrong, fontSize: 20, marginRight: 2 },
  amountInput: { borderWidth: 0, flex: 1, fontFamily: F.extra, fontSize: 22, paddingVertical: 10 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong,
    borderRadius: R.md, paddingVertical: 13, paddingHorizontal: S.md,
  },
  dateTxt: { fontFamily: F.medium, color: C.text, fontSize: 14 },
  chip: {
    borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface,
    borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: C.green, borderColor: C.green },
  chipTxt: { fontFamily: F.semi, color: C.muted, fontSize: 14 },
  chipTxtActive: { color: C.white },
  payer: {
    alignItems: 'center', gap: 6, padding: 10, width: 78,
    borderRadius: R.md, borderWidth: 1.5, borderColor: 'transparent',
  },
  payerActive: { borderColor: C.green, backgroundColor: C.greenDim },
  payerTxt: { fontFamily: F.semi, color: C.muted, fontSize: 12 },
  payerTxtActive: { color: C.text },
  hint: { fontFamily: F.regular, color: C.faint, fontSize: 12, marginTop: 8, lineHeight: 17 },
  memberBlock: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.lineStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface,
  },
  checkOn: { backgroundColor: C.green, borderColor: C.green },
  memberName: { fontFamily: F.semi, color: C.text, fontSize: 15 },
  archivedTag: { fontFamily: F.medium, color: C.faint, fontSize: 11 },
  dimmed: { opacity: 0.4 },
  valueInput: { minWidth: 92, textAlign: 'right', paddingVertical: 9 },
  perPerson: { fontFamily: F.regular, color: C.faint, fontSize: 12, textAlign: 'right', marginTop: 2 },
  warn: { fontFamily: F.semi, color: C.red, fontSize: 13, marginTop: 8 },
  summary: {
    backgroundColor: C.greenDim, borderRadius: R.md,
    padding: S.md, alignItems: 'center',
  },
  summaryTxt: { fontFamily: F.regular, color: C.muted, fontSize: 14 },
  summaryName: { fontFamily: F.bold, color: C.text },
  summaryAmt: { fontFamily: F.extra, color: C.greenStrong },
});
