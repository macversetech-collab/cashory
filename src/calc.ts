import type { DB, Entry, Category } from './types';
import { noteKey, monthKey } from './format';

/** One signed movement of money on a category + account. A move gives two lines. */
export interface Line {
  entry: Entry;
  categoryId: string;
  accountId: string;
  delta: number;
}

export function liveEntries(db: DB): Entry[] {
  return db.entries.filter((e) => !e.deletedAt);
}

export function byDateAsc(a: Entry, b: Entry): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function linesOf(e: Entry): Line[] {
  if (e.type === 'in') return [{ entry: e, categoryId: e.categoryId, accountId: e.accountId, delta: e.amount }];
  if (e.type === 'out') return [{ entry: e, categoryId: e.categoryId, accountId: e.accountId, delta: -e.amount }];
  return [
    { entry: e, categoryId: e.categoryId, accountId: e.accountId, delta: -e.amount },
    { entry: e, categoryId: e.toCategoryId!, accountId: e.toAccountId!, delta: e.amount },
  ];
}

export function allLines(db: DB): Line[] {
  return liveEntries(db).flatMap(linesOf);
}

/** Date range: from inclusive, to exclusive (YYYY-MM-DD strings). */
export interface Range {
  from: string;
  to: string;
}

export const ALL_TIME: Range = { from: '0000-00-00', to: '9999-99-99' };

export function monthRange(key: string): Range {
  const [y, m] = key.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return { from: `${key}-01`, to: `${ny}-${String(nm).padStart(2, '0')}-01` };
}

const inRange = (d: string, r: Range) => d >= r.from && d < r.to;

export interface Totals {
  in: number;
  out: number;
  movedIn: number;
  movedOut: number;
  start: number;
  end: number;
}

function emptyTotals(start = 0): Totals {
  return { in: 0, out: 0, movedIn: 0, movedOut: 0, start, end: start };
}

/** Totals per category for a range: In/Out exclude moves; start/end balances include everything. */
export function categoryTotals(db: DB, r: Range): Map<string, Totals> {
  const map = new Map<string, Totals>();
  for (const c of db.categories) map.set(c.id, emptyTotals(c.startingBalance));
  for (const l of allLines(db)) {
    const t = map.get(l.categoryId);
    if (!t) continue;
    if (l.entry.date < r.from) {
      t.start += l.delta;
      t.end += l.delta;
    } else if (l.entry.date < r.to) {
      t.end += l.delta;
      if (l.entry.type === 'in') t.in += l.delta;
      else if (l.entry.type === 'out') t.out -= l.delta;
      else if (l.delta > 0) t.movedIn += l.delta;
      else t.movedOut -= l.delta;
    }
  }
  return map;
}

/** Totals per account for a range. Category starting balances count in their account. */
export function accountTotals(db: DB, r: Range): Map<string, Totals> {
  const map = new Map<string, Totals>();
  for (const a of db.accounts) map.set(a.id, emptyTotals());
  for (const c of db.categories) {
    const t = map.get(c.accountId);
    if (t) {
      t.start += c.startingBalance;
      t.end += c.startingBalance;
    }
  }
  for (const l of allLines(db)) {
    const t = map.get(l.accountId);
    if (!t) continue;
    if (l.entry.date < r.from) {
      t.start += l.delta;
      t.end += l.delta;
    } else if (l.entry.date < r.to) {
      t.end += l.delta;
      if (l.entry.type === 'in') t.in += l.delta;
      else if (l.entry.type === 'out') t.out -= l.delta;
      else if (l.delta > 0) t.movedIn += l.delta;
      else t.movedOut -= l.delta;
    }
  }
  return map;
}

export function balancesNow(db: DB) {
  return {
    categories: categoryTotals(db, ALL_TIME),
    accounts: accountTotals(db, ALL_TIME),
  };
}

/** Whole-book In/Out/Net for a range (moves excluded). Start/end = sum of every category. */
export function summary(db: DB, r: Range): Totals {
  const t = emptyTotals();
  for (const c of db.categories) t.start += c.startingBalance;
  t.end = t.start;
  for (const e of liveEntries(db)) {
    if (e.type === 'move') continue;
    const d = e.type === 'in' ? e.amount : -e.amount;
    if (e.date < r.from) {
      t.start += d;
      t.end += d;
    } else if (e.date < r.to) {
      t.end += d;
      if (e.type === 'in') t.in += e.amount;
      else t.out += e.amount;
    }
  }
  return t;
}

export interface MonthRow {
  key: string;
  in: number;
  out: number;
  net: number;
}

/** Month-by-month In/Out, newest first. Optional category filter. */
export function months(db: DB, categoryId?: string): MonthRow[] {
  const map = new Map<string, MonthRow>();
  for (const e of liveEntries(db)) {
    if (e.type === 'move') continue;
    if (categoryId && e.categoryId !== categoryId) continue;
    const k = monthKey(e.date);
    let m = map.get(k);
    if (!m) map.set(k, (m = { key: k, in: 0, out: 0, net: 0 }));
    if (e.type === 'in') m.in += e.amount;
    else m.out += e.amount;
    m.net = m.in - m.out;
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export interface NoteRow {
  key: string;
  note: string;
  in: number;
  out: number;
  countIn: number;
  countOut: number;
}

/** Totals grouped by note (case and spacing ignored). Moves excluded. */
export function noteTotals(db: DB, r: Range, categoryId?: string): NoteRow[] {
  const map = new Map<string, NoteRow & { last: string }>();
  for (const e of liveEntries(db)) {
    if (e.type === 'move' || !inRange(e.date, r)) continue;
    if (categoryId && e.categoryId !== categoryId) continue;
    const k = noteKey(e.note);
    let n = map.get(k);
    if (!n) map.set(k, (n = { key: k, note: e.note.trim(), in: 0, out: 0, countIn: 0, countOut: 0, last: '' }));
    if (e.date >= n.last) {
      n.last = e.date;
      if (e.note.trim()) n.note = e.note.trim();
    }
    if (e.type === 'in') {
      n.in += e.amount;
      n.countIn++;
    } else {
      n.out += e.amount;
      n.countOut++;
    }
  }
  return [...map.values()].map(({ last: _last, ...n }) => n);
}

export interface Suggestion {
  note: string;
  uses: number;
}

/**
 * Notes to offer while typing. Same category and type first (most used, then most recent),
 * then the same note used elsewhere.
 */
export function noteSuggestions(db: DB, categoryId: string | null, type: 'in' | 'out' | 'move', typed: string, limit = 6): Suggestion[] {
  const q = noteKey(typed);
  type Acc = { note: string; uses: number; last: string; score: number };
  const map = new Map<string, Acc>();
  for (const e of liveEntries(db)) {
    const k = noteKey(e.note);
    if (!k) continue;
    if (q && !k.split(' ').some((w) => w.startsWith(q)) && !k.startsWith(q)) continue;
    if (q && k === q) continue;
    const same = e.categoryId === categoryId && e.type === type;
    let a = map.get(k);
    if (!a) map.set(k, (a = { note: e.note.trim(), uses: 0, last: '', score: 0 }));
    a.uses++;
    a.score += same ? 10 : e.categoryId === categoryId ? 3 : 1;
    if (e.createdAt > a.last) {
      a.last = e.createdAt;
      a.note = e.note.trim();
    }
  }
  return [...map.values()]
    .sort((a, b) => b.score - a.score || (a.last < b.last ? 1 : -1))
    .slice(0, limit)
    .map((a) => ({ note: a.note, uses: a.uses }));
}

export interface RunningRow {
  entry: Entry;
  delta: number;
  balanceAfter: number;
}

/** Every entry touching a category with the balance after it, oldest first. */
export function running(db: DB, cat: Category): RunningRow[] {
  const rows: RunningRow[] = [];
  let bal = cat.startingBalance;
  const es = liveEntries(db).filter((e) => e.categoryId === cat.id || e.toCategoryId === cat.id).sort(byDateAsc);
  for (const e of es) {
    const delta = linesOf(e)
      .filter((l) => l.categoryId === cat.id)
      .reduce((s, l) => s + l.delta, 0);
    bal += delta;
    rows.push({ entry: e, delta, balanceAfter: bal });
  }
  return rows;
}

export function entryCountFor(db: DB, opts: { categoryId?: string; accountId?: string }): number {
  return liveEntries(db).filter((e) =>
    opts.categoryId ? e.categoryId === opts.categoryId || e.toCategoryId === opts.categoryId : e.accountId === opts.accountId || e.toAccountId === opts.accountId,
  ).length;
}
