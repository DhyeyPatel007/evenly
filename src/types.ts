export type Category =
  | 'Food' | 'Groceries' | 'Transport' | 'Bills'
  | 'Fun' | 'Home' | 'Trip' | 'Other';

export type SplitMode = 'equal' | 'shares' | 'percent' | 'exact';

export interface Member {
  id: string;
  name: string;
  email?: string;
  upi?: string;
  /** index into AVATARS palette */
  colorIdx: number;
  /** the person using the app */
  isSelf?: boolean;
  /** false = archived: hidden from pickers, history preserved */
  active: boolean;
}

export interface ExpenseSplit {
  memberId: string;
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  category: Category;
  date: string; // ISO yyyy-mm-dd
  splitMode: SplitMode;
  splits: ExpenseSplit[];
  note?: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  archived: boolean;
  createdAt: string; // ISO yyyy-mm-dd
  /** Linked Supabase group id for payment-claim sync (undefined = local-only). */
  serverId?: string;
}

export interface EvenlyState {
  onboarded: boolean;
  members: Member[];
  groups: Group[];
  expenses: Expense[];
}

export interface MemberInput {
  name: string;
  email?: string;
  upi?: string;
}

export const CATEGORIES: Record<Category, { color: string; bg: string }> = {
  Food: { color: '#B45309', bg: '#FDF0DC' },
  Groceries: { color: '#15803D', bg: '#E5F4EA' },
  Transport: { color: '#1D4ED8', bg: '#DBEAFE' },
  Bills: { color: '#6D28D9', bg: '#EDE9FE' },
  Fun: { color: '#BE185D', bg: '#FCE7F3' },
  Home: { color: '#0F766E', bg: '#CCFBF1' },
  Trip: { color: '#4338CA', bg: '#E0E7FF' },
  Other: { color: '#5B6875', bg: '#EDF0F4' },
};

export const CATEGORY_LIST = Object.keys(CATEGORIES) as Category[];
