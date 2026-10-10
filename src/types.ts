export type Category =
  | 'Food' | 'Groceries' | 'Transport' | 'Bills'
  | 'Fun' | 'Home' | 'Trip' | 'Other';

export type SplitMode = 'equal' | 'shares' | 'percent' | 'exact';

export interface Member {
  id: string;
  name: string;
  upi?: string;
  color: string;
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
  recurring?: 'monthly';
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

export interface HisabState {
  members: Member[];
  groups: Group[];
  expenses: Expense[];
}

export const CATEGORIES: Record<Category, { color: string }> = {
  Food: { color: '#FBBF24' },
  Groceries: { color: '#3DDC97' },
  Transport: { color: '#7DD3FC' },
  Bills: { color: '#A78BFA' },
  Fun: { color: '#F9A8D4' },
  Home: { color: '#FDBA74' },
  Trip: { color: '#6EE7B7' },
  Other: { color: '#8E99AD' },
};

export const CATEGORY_LIST = Object.keys(CATEGORIES) as Category[];
