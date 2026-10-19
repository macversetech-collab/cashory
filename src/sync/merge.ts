// Pure helpers for cloud sync: map rows to/from Supabase and merge pulled rows (newest change wins).
import type { Account, Category, DB, Entry } from '../types';

export type Table = 'accounts' | 'categories' | 'entries';
export const TABLES: Table[] = ['accounts', 'categories', 'entries'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Remote = Record<string, any>;

const EPOCH = '1970-01-01T00:00:00.000Z';

export function stamp(row: { updatedAt?: string; createdAt?: string }): string {
  return row.updatedAt || row.createdAt || EPOCH;
}

const t = (s: string | null | undefined) => (s ? Date.parse(s) : 0);

export function toRemote(table: Table, row: Account | Category | Entry, userId: string, deletedAt: string | null = null): Remote {
  if (table === 'accounts') {
    const a = row as Account;
    return { user_id: userId, id: a.id, name: a.name, sort: a.sort, archived: a.archived, updated_at: stamp(a), deleted_at: deletedAt };
  }
  if (table === 'categories') {
    const c = row as Category;
    return {
      user_id: userId,
      id: c.id,
      name: c.name,
      account_id: c.accountId,
      starting_balance: c.startingBalance,
      color: c.color,
      sort: c.sort,
      archived: c.archived,
      updated_at: stamp(c),
      deleted_at: deletedAt,
    };
  }
  const e = row as Entry;
  return {
    user_id: userId,
    id: e.id,
    date: e.date,
    type: e.type,
    amount: e.amount,
    category_id: e.categoryId,
    account_id: e.accountId,
    to_category_id: e.toCategoryId,
    to_account_id: e.toAccountId,
    note: e.note || '',
    created_at: e.createdAt,
    updated_at: stamp(e),
    deleted_at: e.deletedAt ?? null,
  };
}

export function fromRemote(table: Table, r: Remote): Account | Category | Entry {
  if (table === 'accounts') return { id: r.id, name: r.name, sort: r.sort, archived: r.archived, updatedAt: r.updated_at } as Account;
  if (table === 'categories')
    return {
      id: r.id,
      name: r.name,
      accountId: r.account_id,
      startingBalance: Number(r.starting_balance) || 0,
      color: r.color || '#B5D86A',
      sort: r.sort,
      archived: r.archived,
      updatedAt: r.updated_at,
    } as Category;
  return {
    id: r.id,
    date: String(r.date).slice(0, 10),
    type: r.type,
    amount: Number(r.amount),
    categoryId: r.category_id,
    accountId: r.account_id,
    toCategoryId: r.to_category_id ?? null,
    toAccountId: r.to_account_id ?? null,
    note: r.note || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
  } as Entry;
}

export const emptyDB = (): DB => ({ app: 'cashory', version: 1, accounts: [], categories: [], entries: [] });

/**
 * Merge rows pulled from the server into the local book.
 * A row the person changed here and has not pushed yet (dirty) is kept when it is newer.
 * Returns the new book, ids whose local change lost (to clear from dirty), and whether anything changed.
 */
export function mergeRemote(db: DB | null, table: Table, rows: Remote[], dirty: Set<string>): { db: DB; superseded: string[]; changed: boolean } {
  const base = db ?? emptyDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list: any[] = [...(base[table] as any[])];
  const index = new Map<string, number>(list.map((x, i) => [x.id, i]));
  const superseded: string[] = [];
  const removed = new Set<string>();
  let changed = false;

  for (const r of rows) {
    const i = index.get(r.id);
    const local = i !== undefined ? list[i] : undefined;
    if (local && dirty.has(r.id)) {
      if (t(stamp(local)) >= t(r.updated_at)) continue; // our unsent change is newer
      superseded.push(r.id);
    }
    const tombstone = !!r.deleted_at && table !== 'entries';
    if (tombstone) {
      if (local) {
        removed.add(r.id);
        changed = true;
      }
      continue;
    }
    const next = fromRemote(table, r);
    if (local && sameRow(local, next)) continue;
    if (i !== undefined) list[i] = next;
    else {
      index.set(r.id, list.length);
      list.push(next);
    }
    changed = true;
  }
  const out = removed.size ? list.filter((x) => !removed.has(x.id)) : list;
  return { db: changed ? { ...base, [table]: out } : base, superseded, changed };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sameRow(a: any, b: any): boolean {
  for (const k of Object.keys(b)) {
    if (k === 'updatedAt' || k === 'createdAt' || k === 'deletedAt') {
      if (t(a[k]) !== t(b[k])) return false;
    } else if ((a[k] ?? null) !== (b[k] ?? null)) return false;
  }
  return true;
}
