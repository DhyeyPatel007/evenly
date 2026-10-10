import type { Expense, Group, HisabState, Member } from './types';

export const ME: Member = { id: 'u1', name: 'Aarav Mehta', upi: 'aarav.mehta@okhdfc', color: '#C6F52E' };

const MEMBERS: Member[] = [
  ME,
  { id: 'u2', name: 'Rohan Shah', upi: 'rohan.shah@okicici', color: '#7DD3FC' },
  { id: 'u3', name: 'Priya Nair', upi: 'priya.nair@okaxis', color: '#F9A8D4' },
  { id: 'u4', name: 'Kabir Bedi', upi: 'kabir.bedi@okhdfcbank', color: '#FDBA74' },
];

const GROUPS: Group[] = [
  { id: 'g1', name: 'Room 204', memberIds: ['u1', 'u2', 'u3', 'u4'], createdAt: '2026-09-01' },
  { id: 'g2', name: 'Goa Trip', memberIds: ['u1', 'u2', 'u3'], createdAt: '2026-09-20' },
];

function eq(groupId: string, ids: string[], amount: number): { memberId: string; amount: number }[] {
  const each = Math.floor((amount / ids.length) * 100) / 100;
  const splits = ids.map((memberId) => ({ memberId, amount: each }));
  const diff = Math.round((amount - each * ids.length) * 100) / 100;
  if (diff !== 0) splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
  return splits;
}

const EXPENSES: Expense[] = [
  { id: 'e1', groupId: 'g1', description: 'Mess bill · October', amount: 4800, paidBy: 'u2', category: 'Food', date: '2026-10-01', splitMode: 'equal', splits: eq('g1', ['u1', 'u2', 'u3', 'u4'], 4800), recurring: 'monthly' },
  { id: 'e2', groupId: 'g1', description: 'WiFi recharge', amount: 1200, paidBy: 'u3', category: 'Bills', date: '2026-10-02', splitMode: 'equal', splits: eq('g1', ['u1', 'u2', 'u3', 'u4'], 1200), recurring: 'monthly' },
  { id: 'e3', groupId: 'g1', description: 'Auto to station', amount: 360, paidBy: 'u1', category: 'Transport', date: '2026-10-03', splitMode: 'equal', splits: eq('g1', ['u1', 'u2', 'u4'], 360) },
  { id: 'e4', groupId: 'g1', description: 'Pizza night', amount: 1499, paidBy: 'u4', category: 'Food', date: '2026-10-04', splitMode: 'equal', splits: eq('g1', ['u1', 'u2', 'u3', 'u4'], 1499) },
  { id: 'e5', groupId: 'g1', description: 'Groceries · BigBasket', amount: 2340, paidBy: 'u1', category: 'Groceries', date: '2026-10-05', splitMode: 'equal', splits: eq('g1', ['u1', 'u2', 'u3', 'u4'], 2340) },
  { id: 'e6', groupId: 'g1', description: 'Movie tickets', amount: 1200, paidBy: 'u3', category: 'Fun', date: '2026-10-06', splitMode: 'equal', splits: eq('g1', ['u1', 'u2', 'u3'], 1200) },
  { id: 'e7', groupId: 'g1', description: 'Chai + Maggi run', amount: 240, paidBy: 'u2', category: 'Food', date: '2026-10-07', splitMode: 'equal', splits: eq('g1', ['u1', 'u2', 'u3', 'u4'], 240) },
  { id: 'e8', groupId: 'g1', description: 'Cleaning supplies', amount: 560, paidBy: 'u1', category: 'Home', date: '2026-10-08', splitMode: 'equal', splits: eq('g1', ['u1', 'u2', 'u3', 'u4'], 560) },
  { id: 'e9', groupId: 'g2', description: 'Flight bookings', amount: 18500, paidBy: 'u1', category: 'Trip', date: '2026-09-21', splitMode: 'equal', splits: eq('g2', ['u1', 'u2', 'u3'], 18500) },
  { id: 'e10', groupId: 'g2', description: 'Airbnb · 3 nights', amount: 24000, paidBy: 'u2', category: 'Trip', date: '2026-09-22', splitMode: 'equal', splits: eq('g2', ['u1', 'u2', 'u3'], 24000) },
  { id: 'e11', groupId: 'g2', description: 'Scooty rental', amount: 1800, paidBy: 'u3', category: 'Transport', date: '2026-09-25', splitMode: 'equal', splits: eq('g2', ['u1', 'u2', 'u3'], 1800) },
];

export function seedData(): HisabState {
  return {
    members: MEMBERS.map((m) => ({ ...m })),
    groups: GROUPS.map((g) => ({ ...g, memberIds: [...g.memberIds] })),
    expenses: EXPENSES.map((e) => ({ ...e, splits: e.splits.map((s) => ({ ...s })) })),
  };
}
