// Offline-first sync: every change is saved on the device first, then pushed to Supabase.
// Other devices' changes are pulled by "synced_at" (server clock). Newest change wins per row.
import type { DB } from '../types';
import { ApiError, cloudEnabled, getSession, rest } from './api';
import { TABLES, mergeRemote, toRemote, type Remote, type Table } from './merge';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  pending: number;
  lastSyncAt: string | null;
  error: string | null;
  /** First pull finished (or there was data on the device already). */
  ready: boolean;
}

interface Meta {
  userId: string | null;
  cursor: Record<Table, string>;
  /** id → change counter; cleared when the server has that version */
  dirty: Record<Table, Record<string, number>>;
  /** deleted accounts/categories waiting to tell the server */
  tomb: Record<Table, Record<string, Remote>>;
  lastSyncAt: string | null;
  pulledOnce: boolean;
}

const META_KEY = 'cashory.sync';
const EPOCH = '1970-01-01T00:00:00.000Z';
const OVERLAP_MS = 2 * 60 * 1000; // re-read the last 2 minutes so a slow commit is never missed
const PAGE = 1000;
const PUSH_CHUNK = 500;

const blankMeta = (userId: string | null): Meta => ({
  userId,
  cursor: { accounts: EPOCH, categories: EPOCH, entries: EPOCH },
  dirty: { accounts: {}, categories: {}, entries: {} },
  tomb: { accounts: {}, categories: {}, entries: {} },
  lastSyncAt: null,
  pulledOnce: false,
});

function readMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return { ...blankMeta(null), ...JSON.parse(raw) };
  } catch {
    /* fall through */
  }
  return blankMeta(null);
}

class Engine {
  private meta: Meta = readMeta();
  private getDB: () => DB | null = () => null;
  private setDB: (fn: (d: DB | null) => DB | null) => void = () => {};
  private running: Promise<void> | null = null;
  private again = false;
  private timer: number | undefined;
  private listeners = new Set<(s: SyncState) => void>();
  private state: SyncState = {
    status: cloudEnabled ? 'idle' : 'off',
    pending: 0,
    lastSyncAt: this.meta.lastSyncAt,
    error: null,
    ready: !cloudEnabled || this.meta.pulledOnce,
  };

  constructor() {
    this.state.pending = this.pendingCount();
  }

  attach(getDB: () => DB | null, setDB: (fn: (d: DB | null) => DB | null) => void) {
    this.getDB = getDB;
    this.setDB = setDB;
  }

  getState = () => this.state;

  subscribe(fn: (s: SyncState) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch, pending: this.pendingCount() };
    this.listeners.forEach((fn) => fn(this.state));
  }

  private save() {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(this.meta));
    } catch {
      /* best effort */
    }
  }

  private pendingCount() {
    return TABLES.reduce((n, t) => n + Object.keys(this.meta.dirty[t]).length + Object.keys(this.meta.tomb[t]).length, 0);
  }

  // ------------------------------------------------------------ marking changes

  touch(table: Table, ids: string | string[]) {
    if (!cloudEnabled) return;
    for (const id of Array.isArray(ids) ? ids : [ids]) {
      this.meta.dirty[table][id] = (this.meta.dirty[table][id] || 0) + 1;
      delete this.meta.tomb[table][id];
    }
    this.save();
    this.emit({});
    this.schedule();
  }

  /** Mark every row on the device as changed (new book, imported file, first sign-in). */
  touchAll(db: DB | null) {
    if (!cloudEnabled || !db) return;
    for (const t of TABLES) for (const r of db[t]) this.meta.dirty[t][r.id] = (this.meta.dirty[t][r.id] || 0) + 1;
    this.save();
    this.emit({});
    this.schedule(200);
  }

  /** An account or category was removed here: tell the server so other devices drop it too. */
  tombstone(table: Table, row: Remote) {
    if (!cloudEnabled) return;
    delete this.meta.dirty[table][row.id];
    this.meta.tomb[table][row.id] = row;
    this.save();
    this.emit({});
    this.schedule();
  }

  schedule(ms = 800) {
    if (!cloudEnabled) return;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.sync(), ms);
  }

  /** Signed in as someone new (or for the first time on this device). */
  begin(userId: string) {
    if (this.meta.userId === userId) return;
    this.meta = blankMeta(userId);
    this.save();
    // Anything already on this device goes up; the server copy comes down.
    this.touchAll(this.getDB());
    this.emit({ ready: !!this.getDB(), lastSyncAt: null, error: null });
  }

  /** Signed out: forget sync progress (the book on the device is cleared by the store). */
  reset() {
    window.clearTimeout(this.timer);
    this.meta = blankMeta(null);
    this.save();
    this.emit({ status: cloudEnabled ? 'idle' : 'off', ready: false, lastSyncAt: null, error: null });
  }

  // ------------------------------------------------------------ sync

  sync(): Promise<void> {
    if (!cloudEnabled || !getSession()) return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      do {
        this.again = false;
        this.emit({ status: 'syncing', error: null });
        try {
          await this.push();
          await this.pull();
          if (this.pendingCount()) await this.push();
          this.meta.lastSyncAt = new Date().toISOString();
          this.meta.pulledOnce = true;
          this.save();
          this.emit({ status: 'idle', lastSyncAt: this.meta.lastSyncAt, ready: true });
        } catch (e) {
          const err = e as ApiError;
          this.emit({ status: err.offline ? 'offline' : 'error', error: err.message, ready: this.state.ready || !!this.getDB() });
          break;
        }
      } while (this.again);
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async push() {
    const s = getSession();
    if (!s) return;
    const db = this.getDB();
    for (const table of TABLES) {
      const snapshot = { ...this.meta.dirty[table] };
      const ids = Object.keys(snapshot);
      const tombs = Object.values(this.meta.tomb[table]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowsById = new Map<string, any>((db?.[table] ?? []).map((r: any) => [r.id, r]));
      const rows: Remote[] = [];
      const sent: string[] = [];
      for (const id of ids) {
        const r = rowsById.get(id);
        if (r) {
          rows.push(toRemote(table, r, s.user_id));
          sent.push(id);
        } else delete this.meta.dirty[table][id]; // gone locally without a tombstone (e.g. replaced book)
      }
      for (const tb of tombs) rows.push({ ...tb, user_id: s.user_id });
      for (let i = 0; i < rows.length; i += PUSH_CHUNK) {
        await rest(`/cashory_${table}?on_conflict=user_id,id`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows.slice(i, i + PUSH_CHUNK)),
        });
      }
      // Clear only what did not change again while we were sending.
      for (const id of sent) if (this.meta.dirty[table][id] === snapshot[id]) delete this.meta.dirty[table][id];
      for (const tb of tombs) delete this.meta.tomb[table][tb.id];
      this.save();
      this.emit({});
    }
  }

  private async pull() {
    for (const table of TABLES) {
      const since = new Date(Math.max(0, Date.parse(this.meta.cursor[table]) - OVERLAP_MS)).toISOString();
      let maxSynced = this.meta.cursor[table];
      for (let offset = 0; ; offset += PAGE) {
        const res = await rest(
          `/cashory_${table}?select=*&synced_at=gt.${encodeURIComponent(since)}&order=synced_at.asc,id.asc&limit=${PAGE}&offset=${offset}`,
        );
        const rows = (await res.json()) as Remote[];
        if (rows.length) {
          const dirty = new Set(Object.keys(this.meta.dirty[table]));
          // setDB applies synchronously (see store), so the result is known right away.
          let superseded: string[] = [];
          this.setDB((d) => {
            const m = mergeRemote(d, table, rows, dirty);
            superseded = m.superseded;
            return m.changed ? m.db : d;
          });
          for (const id of superseded) delete this.meta.dirty[table][id];
          for (const r of rows) if (Date.parse(r.synced_at) > Date.parse(maxSynced)) maxSynced = r.synced_at;
        }
        if (rows.length < PAGE) break;
      }
      this.meta.cursor[table] = maxSynced;
      this.save();
    }
  }
}

export const engine = new Engine();
