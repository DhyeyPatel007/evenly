import type { ExpenseSplit, SplitMode } from './types';

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Net per member: positive = money owed TO them, negative = they owe. */
export function computeNets(
  expenses: { paidBy: string; amount: number; splits: ExpenseSplit[] }[],
): Record<string, number> {
  const nets: Record<string, number> = {};
  for (const e of expenses) {
    nets[e.paidBy] = r2((nets[e.paidBy] ?? 0) + e.amount);
    for (const s of e.splits) {
      nets[s.memberId] = r2((nets[s.memberId] ?? 0) - s.amount);
    }
  }
  return nets;
}

/**
 * Greedy min-cash-flow: collapses N debts into the fewest transfers.
 * Matches biggest debtor with biggest creditor until everyone is settled.
 */
export function simplifyDebts(nets: Record<string, number>): Settlement[] {
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  for (const [id, n] of Object.entries(nets)) {
    const v = r2(n);
    if (v < -0.005) debtors.push({ id, amt: -v });
    else if (v > 0.005) creditors.push({ id, amt: v });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const out: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const x = r2(Math.min(d.amt, c.amt));
    if (x <= 0) break;
    out.push({ from: d.id, to: c.id, amount: x });
    d.amt = r2(d.amt - x);
    c.amt = r2(c.amt - x);
    if (d.amt < 0.005) i++;
    if (c.amt < 0.005) j++;
  }
  return out;
}

export interface ShareInput {
  memberId: string;
  /** meaning depends on mode: shares count, percent, or exact ₹ */
  value: number;
}

/** Resolve a split mode into concrete per-member ₹ amounts (sums to total). */
export function resolveSplits(
  total: number,
  mode: SplitMode,
  inputs: ShareInput[],
): ExpenseSplit[] {
  if (inputs.length === 0) return [];
  const weights = inputs.map((inp) => {
    switch (mode) {
      case 'equal':
        return 1;
      case 'shares':
        return Math.max(0, inp.value);
      case 'percent':
        return Math.max(0, inp.value) / 100;
      case 'exact':
        return 0; // handled below
    }
  });

  if (mode === 'exact') {
    return inputs.map((inp) => ({ memberId: inp.memberId, amount: r2(Math.max(0, inp.value)) }));
  }

  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return inputs.map((inp) => ({ memberId: inp.memberId, amount: 0 }));

  // Largest-remainder: paise-perfect split, no lost pennies.
  const raw = weights.map((w) => (total * w) / wSum);
  const floors = raw.map((x) => Math.floor(x * 100) / 100);
  let remainder = Math.round((total - floors.reduce((a, b) => a + b, 0)) * 100);
  const order = raw
    .map((x, idx) => ({ idx, frac: x * 100 - Math.floor(x * 100) }))
    .sort((a, b) => b.frac - a.frac);
  const amounts = [...floors];
  for (const { idx } of order) {
    if (remainder <= 0) break;
    amounts[idx] = r2(amounts[idx] + 0.01);
    remainder--;
  }
  return inputs.map((inp, k) => ({ memberId: inp.memberId, amount: amounts[k] }));
}
