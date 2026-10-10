import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Expense, Group, EvenlyState, Member, MemberInput } from './types';
import { demoData } from './data';
import { todayISO, uid } from './format';

const KEY = '@evenly/v2';
const LEGACY_KEY = '@hisab/v2'; // renamed from Hisab — migrate once, then drop

export type MemberOp =
  | { ok: true; id: string }
  | { ok: false; error: string };

interface Store {
  ready: boolean;
  onboarded: boolean;
  members: Member[];
  groups: Group[];
  expenses: Expense[];

  self(): Member | undefined;
  memberById(id: string): Member | undefined;
  activeMembers(groupId: string): Member[];
  groupExpenses(groupId: string): Expense[];
  expenseById(id: string): Expense | undefined;

  completeOnboarding(name: string): void;
  addMember(groupId: string, input: MemberInput): MemberOp;
  updateMember(id: string, patch: Partial<Pick<Member, 'name' | 'email' | 'upi'>>): MemberOp;
  /** Returns 'removed' or 'archived' (archived when the member has expense history). */
  removeMember(groupId: string, memberId: string): 'removed' | 'archived';
  restoreMember(memberId: string): void;

  addGroup(name: string, memberInputs: MemberInput[], includeMemberIds?: string[]): string;
  renameGroup(id: string, name: string): void;
  setGroupArchived(id: string, archived: boolean): void;
  /** Only allowed when the group has no expenses. */
  deleteGroup(id: string): boolean;
  /** Links a local group to its Supabase sync group. */
  linkServerGroup(localId: string, serverId: string): void;

  addExpense(e: Omit<Expense, 'id'>): string;
  updateExpense(id: string, patch: Partial<Omit<Expense, 'id' | 'groupId'>>): void;
  deleteExpense(id: string): void;

  loadDemo(): void;
  clearAll(): void;
}

const Ctx = createContext<Store | null>(null);

const norm = (s: string) => s.trim().toLowerCase();

export function EvenlyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EvenlyState | null>(null);

  useEffect(() => {
    const hydrate = (raw: string | null) => {
      if (raw) {
        // v1 states have no onboarded flag — treat existing data as onboarded
        const parsed = JSON.parse(raw) as Partial<EvenlyState>;
        setState({
          onboarded: parsed.onboarded ?? true,
          members: parsed.members ?? [],
          groups: parsed.groups ?? [],
          expenses: parsed.expenses ?? [],
        });
      } else {
        setState({ onboarded: false, members: [], groups: [], expenses: [] });
      }
    };
    AsyncStorage.getItem(KEY)
      .then((raw) => (raw ? hydrate(raw) : AsyncStorage.getItem(LEGACY_KEY).then(hydrate)))
      .catch(() => setState({ onboarded: false, members: [], groups: [], expenses: [] }));
  }, []);

  useEffect(() => {
    if (state) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const value = useMemo<Store>(() => {
    const s: EvenlyState = state ?? { onboarded: false, members: [], groups: [], expenses: [] };
    const byId = new Map(s.members.map((m) => [m.id, m]));
    const selfMember = s.members.find((m) => m.isSelf);

    const mutate = (fn: (prev: EvenlyState) => EvenlyState) =>
      setState((prev) => (prev ? fn(prev) : prev));

    return {
      ready: state !== null,
      onboarded: s.onboarded,
      members: s.members,
      groups: s.groups,
      expenses: s.expenses,

      self: () => selfMember,
      memberById: (id) => byId.get(id),
      activeMembers: (groupId) => {
        const g = s.groups.find((x) => x.id === groupId);
        if (!g) return [];
        return g.memberIds.map((id) => byId.get(id)).filter((m): m is Member => !!m && m.active);
      },
      groupExpenses: (groupId) =>
        s.expenses.filter((e) => e.groupId === groupId).sort((a, b) => (a.date < b.date ? 1 : -1)),
      expenseById: (id) => s.expenses.find((e) => e.id === id),

      completeOnboarding: (name) => {
        const m: Member = {
          id: uid(), name: name.trim(), colorIdx: 1, isSelf: true, active: true,
        };
        mutate((prev) => ({ ...prev, onboarded: true, members: [m, ...prev.members] }));
      },

      addMember: (groupId, input) => {
        const name = input.name.trim();
        if (!name) return { ok: false, error: 'Enter a name.' };
        const group = s.groups.find((g) => g.id === groupId);
        if (!group) return { ok: false, error: 'Group not found.' };
        const dup = group.memberIds
          .map((id) => byId.get(id))
          .some((m) => m && norm(m.name) === norm(name));
        if (dup) return { ok: false, error: `${name} is already in this group.` };
        const m: Member = {
          id: uid(),
          name,
          email: input.email?.trim() || undefined,
          upi: input.upi?.trim() || undefined,
          colorIdx: s.members.length % 8,
          active: true,
        };
        mutate((prev) => ({
          ...prev,
          members: [...prev.members, m],
          groups: prev.groups.map((g) =>
            g.id === groupId ? { ...g, memberIds: [...g.memberIds, m.id] } : g,
          ),
        }));
        return { ok: true, id: m.id };
      },

      updateMember: (id, patch) => {
        const m = byId.get(id);
        if (!m) return { ok: false, error: 'Member not found.' };
        const name = patch.name?.trim();
        if (name !== undefined && !name) return { ok: false, error: 'Name cannot be empty.' };
        if (name !== undefined) {
          const dup = s.members.some(
            (x) => x.id !== id && x.active && norm(x.name) === norm(name),
          );
          if (dup) return { ok: false, error: 'Another member already has this name.' };
        }
        mutate((prev) => ({
          ...prev,
          members: prev.members.map((x) =>
            x.id === id
              ? {
                  ...x,
                  name: name ?? x.name,
                  email: patch.email !== undefined ? patch.email.trim() || undefined : x.email,
                  upi: patch.upi !== undefined ? patch.upi.trim() || undefined : x.upi,
                }
              : x,
          ),
        }));
        return { ok: true, id };
      },

      removeMember: (groupId, memberId) => {
        const hasHistory = s.expenses.some(
          (e) =>
            e.groupId === groupId &&
            (e.paidBy === memberId || e.splits.some((sp) => sp.memberId === memberId)),
        );
        if (hasHistory) {
          // Archive: history stays intact, member leaves pickers.
          mutate((prev) => ({
            ...prev,
            members: prev.members.map((m) => (m.id === memberId ? { ...m, active: false } : m)),
          }));
          return 'archived';
        }
        mutate((prev) => {
          const groups = prev.groups.map((g) =>
            g.id === groupId ? { ...g, memberIds: g.memberIds.filter((x) => x !== memberId) } : g,
          );
          const stillUsed = groups.some((g) => g.memberIds.includes(memberId));
          return {
            ...prev,
            groups,
            members: stillUsed ? prev.members : prev.members.filter((m) => m.id !== memberId),
          };
        });
        return 'removed';
      },

      restoreMember: (memberId) =>
        mutate((prev) => ({
          ...prev,
          members: prev.members.map((m) => (m.id === memberId ? { ...m, active: true } : m)),
        })),

      addGroup: (name, memberInputs, includeMemberIds = []) => {
        const id = uid();
        const base = s.members.length;
        const newMembers: Member[] = memberInputs.map((inp, i) => ({
          id: uid() + i,
          name: inp.name.trim(),
          email: inp.email?.trim() || undefined,
          upi: inp.upi?.trim() || undefined,
          colorIdx: (base + i) % 8,
          active: true,
        }));
        const g: Group = {
          id,
          name: name.trim(),
          memberIds: [...includeMemberIds, ...newMembers.map((m) => m.id)],
          archived: false,
          createdAt: todayISO(),
        };
        mutate((prev) => ({
          ...prev,
          members: [...prev.members, ...newMembers],
          groups: [...prev.groups, g],
        }));
        return id;
      },

      renameGroup: (id, name) =>
        mutate((prev) => ({
          ...prev,
          groups: prev.groups.map((g) => (g.id === id ? { ...g, name: name.trim() } : g)),
        })),
      linkServerGroup: (localId, serverId) =>
        mutate((prev) => ({
          ...prev,
          groups: prev.groups.map((g) => (g.id === localId ? { ...g, serverId } : g)),
        })),

      setGroupArchived: (id, archived) =>
        mutate((prev) => ({
          ...prev,
          groups: prev.groups.map((g) => (g.id === id ? { ...g, archived } : g)),
        })),

      deleteGroup: (id) => {
        const hasExpenses = s.expenses.some((e) => e.groupId === id);
        if (hasExpenses) return false;
        mutate((prev) => {
          const group = prev.groups.find((g) => g.id === id);
          const groups = prev.groups.filter((g) => g.id !== id);
          const orphans = (group?.memberIds ?? []).filter(
            (mid) => !groups.some((g) => g.memberIds.includes(mid)),
          );
          return {
            ...prev,
            groups,
            members: prev.members.filter((m) => m.isSelf || !orphans.includes(m.id)),
          };
        });
        return true;
      },

      addExpense: (e) => {
        const id = uid();
        mutate((prev) => ({ ...prev, expenses: [{ ...e, id }, ...prev.expenses] }));
        return id;
      },

      updateExpense: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          expenses: prev.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteExpense: (id) =>
        mutate((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) })),

      loadDemo: () => setState({ ...demoData(), onboarded: true }),
      clearAll: () => setState({ onboarded: false, members: [], groups: [], expenses: [] }),
    };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEvenly(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEvenly must be used inside EvenlyProvider');
  return v;
}
