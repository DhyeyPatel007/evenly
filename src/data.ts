import type { Expense, HisabState } from './types';

/**
 * Clearly-labeled demo content. Never auto-loaded — the user opts in
 * from the empty state ("Explore with demo data").
 */
export function demoData(): HisabState {
  const members = [
    { id: 'du1', name: 'Aarav Mehta', upi: 'aarav.mehta@okhdfc', colorIdx: 1, isSelf: true, active: true },
    { id: 'du2', name: 'Rohan Shah', upi: 'rohan.shah@okicici', colorIdx: 0, active: true },
    { id: 'du3', name: 'Priya Nair', upi: 'priya.nair@okaxis', colorIdx: 4, active: true },
    { id: 'du4', name: 'Kabir Bedi', upi: 'kabir.bedi@okhdfcbank', colorIdx: 3, active: true },
  ];

  const eq = (ids: string[], amount: number) => {
    const each = Math.floor((amount / ids.length) * 100) / 100;
    const splits = ids.map((memberId) => ({ memberId, amount: each }));
    const diff = Math.round((amount - each * ids.length) * 100) / 100;
    if (diff !== 0) splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
    return splits;
  };

  const room = ['du1', 'du2', 'du3', 'du4'];
  const expenses: Expense[] = [
    { id: 'de1', groupId: 'dg1', description: 'Mess bill · October', amount: 4800, paidBy: 'du2', category: 'Food', date: '2026-10-01', splitMode: 'equal', splits: eq(room, 4800) },
    { id: 'de2', groupId: 'dg1', description: 'WiFi recharge', amount: 1200, paidBy: 'du3', category: 'Bills', date: '2026-10-02', splitMode: 'equal', splits: eq(room, 1200) },
    { id: 'de3', groupId: 'dg1', description: 'Auto to station', amount: 360, paidBy: 'du1', category: 'Transport', date: '2026-10-03', splitMode: 'equal', splits: eq(['du1', 'du2', 'du4'], 360) },
    { id: 'de4', groupId: 'dg1', description: 'Pizza night', amount: 1499, paidBy: 'du4', category: 'Food', date: '2026-10-04', splitMode: 'equal', splits: eq(room, 1499) },
    { id: 'de5', groupId: 'dg1', description: 'Groceries', amount: 2340, paidBy: 'du1', category: 'Groceries', date: '2026-10-05', splitMode: 'equal', splits: eq(room, 2340) },
    { id: 'de6', groupId: 'dg1', description: 'Movie tickets', amount: 1200, paidBy: 'du3', category: 'Fun', date: '2026-10-06', splitMode: 'equal', splits: eq(['du1', 'du2', 'du3'], 1200) },
    { id: 'de7', groupId: 'dg1', description: 'Chai + Maggi run', amount: 240, paidBy: 'du2', category: 'Food', date: '2026-10-07', splitMode: 'equal', splits: eq(room, 240) },
    { id: 'de8', groupId: 'dg1', description: 'Cleaning supplies', amount: 560, paidBy: 'du1', category: 'Home', date: '2026-10-08', splitMode: 'equal', splits: eq(room, 560) },
    { id: 'de9', groupId: 'dg2', description: 'Flight bookings', amount: 18500, paidBy: 'du1', category: 'Trip', date: '2026-09-21', splitMode: 'equal', splits: eq(['du1', 'du2', 'du3'], 18500) },
    { id: 'de10', groupId: 'dg2', description: 'Airbnb · 3 nights', amount: 24000, paidBy: 'du2', category: 'Trip', date: '2026-09-22', splitMode: 'equal', splits: eq(['du1', 'du2', 'du3'], 24000) },
    { id: 'de11', groupId: 'dg2', description: 'Scooty rental', amount: 1800, paidBy: 'du3', category: 'Transport', date: '2026-09-25', splitMode: 'equal', splits: eq(['du1', 'du2', 'du3'], 1800) },
  ];

  return {
    onboarded: true,
    members,
    groups: [
      { id: 'dg1', name: 'Room 204', memberIds: room, archived: false, createdAt: '2026-09-01' },
      { id: 'dg2', name: 'Goa Trip', memberIds: ['du1', 'du2', 'du3'], archived: false, createdAt: '2026-09-20' },
    ],
    expenses,
  };
}
