import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Account, Category, DB, Entry } from './types';
import { uid } from './format';
import { engine } from './sync/engine';
import { toRemote } from './sync/merge';

const KEY = 'cashory.db.v1';

export const PALETTE = ['#B5D86A', '#F2D55C', '#9ED9B5', '#F4B98A', '#C7B4EA', '#9CC7EE', '#E8A0A8', '#D9C27A', '#C9CFB2', '#34D399', '#22D3EE', '#818CF8', '#F472B6', '#FB923C'];

function read(): DB | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const db = JSON.parse(raw) as DB;
    return db && db.app === 'cashory' ? db : null;
  } catch {
    return null;
  }
}

function write(db: DB | null): boolean {
  try {
    if (db) localStorage.setItem(KEY, JSON.stringify(db));
    else localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

export function starterDB(): DB {
  const accounts: Account[] = ['KBZ', 'AYA', 'KPay', 'AYA Pay', 'Cash'].map((name, i) => ({ id: uid(), name, sort: i + 1, archived: false }));
  const bank = accounts[0].id;
  const categories: Category[] = ['Showline', 'Birthday Cake', 'Profits', 'Fund', 'Dad&Mom', 'For Me', 'Own Account', 'Jar Gyi'].map((name, i) => ({
    id: uid(),
    name,
    accountId: bank,
    startingBalance: 0,
    color: PALETTE[i % PALETTE.length],
    sort: i + 1,
    archived: false,
  }));
  return { app: 'cashory', version: 1, accounts, categories, entries: [] };
}

/** Checks an imported file and returns a clean DB, or throws with a readable reason. */
export function parseImport(text: string): DB {
  let d: unknown;
  try {
    d = JSON.parse(text);
  } catch {
    throw new Error('This file is not a Cashory backup (not JSON).');
  }
  const db = d as DB;
  if (!db || db.app !== 'cashory' || !Array.isArray(db.accounts) || !Array.isArray(db.categories) || !Array.isArray(db.entries)) {
    throw new Error('This file is not a Cashory backup.');
  }
  const accIds = new Set(db.accounts.map((a) => a.id));
  const catIds = new Set(db.categories.map((c) => c.id));
  for (const c of db.categories) if (!accIds.has(c.accountId)) throw new Error(`Category "${c.name}" points to a missing account.`);
  for (const e of db.entries) {
    const ok =
      catIds.has(e.categoryId) &&
      accIds.has(e.accountId) &&
      Number.isInteger(e.amount) &&
      e.amount > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
      (e.type !== 'move' || (e.toCategoryId && catIds.has(e.toCategoryId) && e.toAccountId && accIds.has(e.toAccountId)));
    if (!ok) throw new Error(`Entry ${e.id} on ${e.date} is not valid.`);
  }
  return {
    app: 'cashory',
    version: 1,
    accounts: db.accounts,
    categories: db.categories.map((c) => ({ ...c, startingBalance: c.startingBalance || 0 })),
    entries: db.entries.map((e) => ({ ...e, note: e.note || '', toCategoryId: e.toCategoryId ?? null, toAccountId: e.toAccountId ?? null })),
  };
}

interface Store {
  db: DB | null;
  saveError: boolean;
  /** Replace the whole book (new book, imported file). Everything is sent to the cloud. */
  replace(db: DB | null): void;
  /** Forget the book on this device (sign out). Cloud copy stays. */
  clearLocal(): void;
  saveEntry(e: Entry): void;
  deleteEntry(id: string): void;
  restoreEntry(id: string): void;
  saveCategory(c: Category): void;
  deleteCategory(id: string): void;
  moveCategory(id: string, dir: -1 | 1): void;
  moveAccount(id: string, dir: -1 | 1): void;
  saveAccount(a: Account): void;
}

const Ctx = createContext<Store | null>(null);
const now = () => new Date().toISOString();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(() => read());
  const [saveError, setSaveError] = useState(false);
  const ref = useRef<DB | null>(db);

  // All changes go through here: applied to the ref at once (so sync sees them immediately), then rendered.
  const apply = useCallback((fn: (d: DB | null) => DB | null) => {
    const next = fn(ref.current);
    if (next === ref.current) return;
    ref.current = next;
    setDb(next);
    setSaveError(!write(next));
  }, []);

  useEffect(() => {
    engine.attach(() => ref.current, apply);
  }, [apply]);

  useEffect(() => {
    try {
      navigator.storage?.persist?.();
    } catch {
      /* not available */
    }
  }, []);

  const update = useCallback((fn: (d: DB) => DB) => apply((d) => (d ? fn(d) : d)), [apply]);

  const store = useMemo<Store>(
    () => ({
      db,
      saveError,
      replace: (d) => {
        apply(() => d);
        engine.touchAll(d);
      },
      clearLocal: () => apply(() => null),
      saveEntry: (e) => {
        update((d) => {
          const i = d.entries.findIndex((x) => x.id === e.id);
          const entries = [...d.entries];
          if (i >= 0) entries[i] = { ...e, updatedAt: now() };
          else entries.push({ ...e, updatedAt: e.createdAt });
          return { ...d, entries };
        });
        engine.touch('entries', e.id);
      },
      deleteEntry: (id) => {
        const t = now();
        update((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, deletedAt: t, updatedAt: t } : e)) }));
        engine.touch('entries', id);
      },
      restoreEntry: (id) => {
        update((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, deletedAt: null, updatedAt: now() } : e)) }));
        engine.touch('entries', id);
      },
      saveCategory: (c) => {
        update((d) => {
          const i = d.categories.findIndex((x) => x.id === c.id);
          const categories = [...d.categories];
          const row = { ...c, updatedAt: now() };
          if (i >= 0) categories[i] = row;
          else categories.push({ ...row, sort: Math.max(0, ...d.categories.map((x) => x.sort)) + 1 });
          return { ...d, categories };
        });
        engine.touch('categories', c.id);
      },
      deleteCategory: (id) => {
        const row = ref.current?.categories.find((c) => c.id === id);
        update((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
        if (row) {
          const t = now();
          engine.tombstone('categories', toRemote('categories', { ...row, updatedAt: t }, '', t));
        }
      },
      moveAccount: (id, dir) => {
        const changed: string[] = [];
        update((d) => {
          const list = [...d.accounts].sort((a, b) => a.sort - b.sort);
          const i = list.findIndex((a) => a.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return d;
          [list[i], list[j]] = [list[j], list[i]];
          const t = now();
          return {
            ...d,
            accounts: list.map((a, k) => {
              if (a.sort === k + 1) return a;
              changed.push(a.id);
              return { ...a, sort: k + 1, updatedAt: t };
            }),
          };
        });
        if (changed.length) engine.touch('accounts', changed);
      },
      moveCategory: (id, dir) => {
        const changed: string[] = [];
        update((d) => {
          const list = [...d.categories].sort((a, b) => a.sort - b.sort);
          const i = list.findIndex((c) => c.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return d;
          [list[i], list[j]] = [list[j], list[i]];
          const t = now();
          return {
            ...d,
            categories: list.map((c, k) => {
              if (c.sort === k + 1) return c;
              changed.push(c.id);
              return { ...c, sort: k + 1, updatedAt: t };
            }),
          };
        });
        if (changed.length) engine.touch('categories', changed);
      },
      saveAccount: (a) => {
        update((d) => {
          const i = d.accounts.findIndex((x) => x.id === a.id);
          const accounts = [...d.accounts];
          const row = { ...a, updatedAt: now() };
          if (i >= 0) accounts[i] = row;
          else accounts.push({ ...row, sort: Math.max(0, ...d.accounts.map((x) => x.sort)) + 1 });
          return { ...d, accounts };
        });
        engine.touch('accounts', a.id);
      },
    }),
    [db, saveError, apply, update],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

/** Use only where db is known to exist (inside the main app). */
export function useDB(): DB {
  const { db } = useStore();
  if (!db) throw new Error('No data loaded');
  return db;
}

const HIDE_KEY = 'cashory.hide';
export function useHideBalances(): [boolean, () => void] {
  const [hide, setHide] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setHide((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !h;
    });
  return [hide, toggle];
}

export function downloadFile(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
