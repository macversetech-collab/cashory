import { describe, expect, it } from 'vitest';
import type { DB, Entry } from '../types';
import { fromRemote, mergeRemote, toRemote } from './merge';

const entry = (id: string, note: string, updatedAt: string): Entry => ({
  id, date: '2026-10-19', type: 'out', amount: 5000, categoryId: 'c1', accountId: 'a1',
  toCategoryId: null, toAccountId: null, note, createdAt: '2026-10-19T00:00:00.000Z', updatedAt,
});
const book = (entries: Entry[]): DB => ({
  app: 'cashory', version: 1,
  accounts: [{ id: 'a1', name: 'KBZ', sort: 1, archived: false }],
  categories: [{ id: 'c1', name: 'Fund', accountId: 'a1', startingBalance: 0, color: '#fff', sort: 1, archived: false }],
  entries,
});

describe('sync merge', () => {
  it('round-trips an entry through the server shape', () => {
    const e = entry('e1', 'Flour', '2026-10-19T01:00:00.000Z');
    expect(fromRemote('entries', toRemote('entries', e, 'u1'))).toMatchObject({ ...e, deletedAt: null });
  });

  it('takes a newer server row', () => {
    const db = book([entry('e1', 'old', '2026-10-19T01:00:00.000Z')]);
    const r = toRemote('entries', entry('e1', 'new', '2026-10-19T02:00:00.000Z'), 'u1');
    const m = mergeRemote(db, 'entries', [r], new Set());
    expect(m.db.entries[0].note).toBe('new');
  });

  it('keeps an unsent local change that is newer', () => {
    const db = book([entry('e1', 'mine', '2026-10-19T03:00:00.000Z')]);
    const r = toRemote('entries', entry('e1', 'theirs', '2026-10-19T02:00:00.000Z'), 'u1');
    const m = mergeRemote(db, 'entries', [r], new Set(['e1']));
    expect(m.db.entries[0].note).toBe('mine');
    expect(m.superseded).toEqual([]);
  });

  it('drops a local change that lost and reports it', () => {
    const db = book([entry('e1', 'mine', '2026-10-19T01:00:00.000Z')]);
    const r = toRemote('entries', entry('e1', 'theirs', '2026-10-19T02:00:00.000Z'), 'u1');
    const m = mergeRemote(db, 'entries', [r], new Set(['e1']));
    expect(m.db.entries[0].note).toBe('theirs');
    expect(m.superseded).toEqual(['e1']);
  });

  it('removes a category deleted on another device', () => {
    const db = book([]);
    const r = { ...toRemote('categories', db.categories[0], 'u1', '2026-10-19T05:00:00.000Z'), updated_at: '2026-10-19T05:00:00.000Z' };
    expect(mergeRemote(db, 'categories', [r], new Set()).db.categories).toEqual([]);
  });

  it('builds a book from nothing on a new device', () => {
    const r = toRemote('accounts', { id: 'a9', name: 'AYA', sort: 2, archived: false }, 'u1');
    const m = mergeRemote(null, 'accounts', [r], new Set());
    expect(m.db.accounts.map((a) => a.name)).toEqual(['AYA']);
  });

  it('reports no change for an identical row', () => {
    const db = book([entry('e1', 'same', '2026-10-19T01:00:00.000Z')]);
    const r = toRemote('entries', db.entries[0], 'u1');
    expect(mergeRemote(db, 'entries', [r], new Set()).changed).toBe(false);
  });
});
