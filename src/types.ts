export type EntryType = 'in' | 'out' | 'move';

export interface Account {
  id: string;
  name: string;
  sort: number;
  archived: boolean;
  updatedAt?: string;
}

/** A money pot (Showline, Fund, Jar Gyi …). It lives in one account. */
export interface Category {
  id: string;
  name: string;
  accountId: string;
  startingBalance: number;
  color: string;
  sort: number;
  archived: boolean;
  updatedAt?: string;
}

/**
 * in   : money into categoryId (booked to accountId)
 * out  : money out of categoryId (booked to accountId)
 * move : categoryId/accountId → toCategoryId/toAccountId. Not counted as In or Out.
 * Amounts are whole kyats, always > 0.
 */
export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD
  type: EntryType;
  amount: number;
  categoryId: string;
  accountId: string;
  toCategoryId: string | null;
  toAccountId: string | null;
  note: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface DB {
  app: 'cashory';
  version: 1;
  accounts: Account[];
  categories: Category[];
  entries: Entry[];
}
