import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Expense, Group, HisabState, Member } from './types';
import { seedData } from './data';
import { uid } from './format';

const KEY = '@hisab/v1';

interface Store {
  ready: boolean;
  members: Member[];
  groups: Group[];
  expenses: Expense[];
  memberById: (id: string) => Member | undefined;
  groupExpenses: (groupId: string) => Expense[];
  addExpense: (e: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  addMember: (groupId: string, name: string, upi?: string, color?: string) => void;
  addGroup: (name: string, memberIds: string[]) => string;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

const PALETTE = ['#C6F52E', '#7DD3FC', '#F9A8D4', '#FDBA74', '#A78BFA', '#6EE7B7', '#FCA5A5', '#93C5FD'];

export function HisabProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HisabState | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setState(raw ? (JSON.parse(raw) as HisabState) : seedData()))
      .catch(() => setState(seedData()));
  }, []);

  useEffect(() => {
    if (state) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const value = useMemo<Store>(() => {
    const s: HisabState = state ?? { members: [], groups: [], expenses: [] };
    const byId = new Map(s.members.map((m) => [m.id, m]));
    return {
      ready: state !== null,
      members: s.members,
      groups: s.groups,
      expenses: s.expenses,
      memberById: (id) => byId.get(id),
      groupExpenses: (groupId) =>
        s.expenses.filter((e) => e.groupId === groupId).sort((a, b) => (a.date < b.date ? 1 : -1)),
      addExpense: (e) =>
        setState((prev) => (prev ? { ...prev, expenses: [{ ...e, id: uid() }, ...prev.expenses] } : prev)),
      deleteExpense: (id) =>
        setState((prev) => (prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== id) } : prev)),
      addMember: (groupId, name, upi, color) =>
        setState((prev) => {
          if (!prev) return prev;
          const m: Member = {
            id: uid(),
            name: name.trim(),
            upi: upi?.trim() || undefined,
            color: color ?? PALETTE[prev.members.length % PALETTE.length],
          };
          return {
            ...prev,
            members: [...prev.members, m],
            groups: prev.groups.map((g) =>
              g.id === groupId ? { ...g, memberIds: [...g.memberIds, m.id] } : g,
            ),
          };
        }),
      addGroup: (name, memberIds) => {
        const id = uid();
        setState((prev) =>
          prev
            ? { ...prev, groups: [...prev.groups, { id, name: name.trim(), memberIds, createdAt: new Date().toISOString().slice(0, 10) }] }
            : prev,
        );
        return id;
      },
      resetDemo: () => setState(seedData()),
    };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHisab(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHisab must be used inside HisabProvider');
  return v;
}
