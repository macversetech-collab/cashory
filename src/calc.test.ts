import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import type { DB, Entry } from './types';
import { ALL_TIME, accountTotals, balancesNow, categoryTotals, monthRange, months, noteSuggestions, noteTotals, running, statement, summary } from './calc';
import { addMonths, monthKey } from './format';
import { parseImport } from './store';

function e(p: Partial<Entry> & Pick<Entry, 'id' | 'date' | 'type' | 'amount' | 'categoryId' | 'accountId'>): Entry {
  return { toCategoryId: null, toAccountId: null, note: '', createdAt: p.date + 'T00:00:00Z', ...p };
}

const base: DB = {
  app: 'cashory',
  version: 1,
  accounts: [
    { id: 'kbz', name: 'KBZ', sort: 1, archived: false },
    { id: 'cash', name: 'Cash', sort: 2, archived: false },
  ],
  categories: [
    { id: 'show', name: 'Showline', accountId: 'kbz', startingBalance: 100, color: '', sort: 1, archived: false },
    { id: 'fund', name: 'Fund', accountId: 'kbz', startingBalance: 0, color: '', sort: 2, archived: false },
  ],
  entries: [
    e({ id: '1', date: '2026-09-30', type: 'in', amount: 1000, categoryId: 'show', accountId: 'kbz', note: 'Shop' }),
    e({ id: '2', date: '2026-10-02', type: 'out', amount: 300, categoryId: 'show', accountId: 'kbz', note: 'Flour' }),
    e({ id: '3', date: '2026-10-03', type: 'out', amount: 200, categoryId: 'show', accountId: 'cash', note: 'flour ' }),
    e({ id: '4', date: '2026-10-04', type: 'move', amount: 90, categoryId: 'show', accountId: 'kbz', toCategoryId: 'fund', toAccountId: 'cash', note: 'kpay to Fund' }),
    e({ id: '5', date: '2026-10-05', type: 'out', amount: 50, categoryId: 'fund', accountId: 'kbz', deletedAt: '2026-10-06T00:00:00Z' }),
  ],
};

describe('balances', () => {
  it('category balance = start + in − out ± moves, deleted ignored', () => {
    const { categories } = balancesNow(base);
    expect(categories.get('show')!.end).toBe(100 + 1000 - 300 - 200 - 90);
    expect(categories.get('fund')!.end).toBe(90);
  });

  it('account balance follows the account booked on each entry', () => {
    const a = accountTotals(base, ALL_TIME);
    expect(a.get('kbz')!.end).toBe(100 + 1000 - 300 - 90);
    expect(a.get('cash')!.end).toBe(-200 + 90);
  });

  it('accounts and categories always add up to the same total', () => {
    const { categories, accounts } = balancesNow(base);
    const sum = (m: Map<string, { end: number }>) => [...m.values()].reduce((s, t) => s + t.end, 0);
    expect(sum(categories)).toBe(sum(accounts));
  });

  it('month report: moves are not In/Out, start/end carry over', () => {
    const s = summary(base, monthRange('2026-10'));
    expect(s).toMatchObject({ in: 0, out: 500, start: 1100, end: 600 });
    const c = categoryTotals(base, monthRange('2026-10')).get('show')!;
    expect(c).toMatchObject({ in: 0, out: 500, movedOut: 90, start: 1100, end: 510 });
    expect(months(base)).toEqual([
      { key: '2026-10', in: 0, out: 500, net: -500 },
      { key: '2026-09', in: 1000, out: 0, net: 1000 },
    ]);
  });

  it('notes group regardless of case and spaces', () => {
    const n = noteTotals(base, ALL_TIME, 'show').find((x) => x.key === 'flour')!;
    expect(n).toMatchObject({ out: 500, countOut: 2 });
  });

  it('suggestions match word starts and skip an exact match', () => {
    expect(noteSuggestions(base, 'show', 'out', 'fl').map((s) => s.note)).toEqual(['flour']);
    expect(noteSuggestions(base, 'show', 'out', 'flour')).toEqual([]);
  });

  it('running balance ends at the category balance', () => {
    const r = running(base, base.categories[0]);
    expect(r[r.length - 1].balanceAfter).toBe(510);
  });
});


describe('month statement', () => {
  const oct = monthRange('2026-10');
  it('category: opening + In − Out ± moves = closing, entries split by kind', () => {
    const st = statement(base, oct, { categoryId: 'show' });
    expect(st.totals.start).toBe(1100);
    expect(st.ins.map((x) => x.id)).toEqual([]);
    expect(st.outs.map((x) => x.id)).toEqual(['2', '3']);
    expect(st.moves).toEqual([{ entry: base.entries[3], delta: -90 }]);
    const t = st.totals;
    expect(t.start + t.in - t.out + t.movedIn - t.movedOut).toBe(t.end);
    expect(t.end).toBe(510);
  });
  it('account: only entries booked to it; moves inside one account are left out', () => {
    const inside: DB = { ...base, entries: [...base.entries, e({ id: '6', date: '2026-10-07', type: 'move', amount: 40, categoryId: 'show', accountId: 'kbz', toCategoryId: 'fund', toAccountId: 'kbz' })] };
    const st = statement(inside, oct, { accountId: 'kbz' });
    expect(st.outs.map((x) => x.id)).toEqual(['2']);
    expect(st.moves.map((m) => [m.entry.id, m.delta])).toEqual([['4', -90]]);
    const t = st.totals;
    expect(t.start + t.in - t.out + t.movedIn - t.movedOut).toBe(t.end);
    const cash = statement(inside, oct, { accountId: 'cash' });
    expect(cash.moves.map((m) => [m.entry.id, m.delta])).toEqual([['4', 90]]);
  });
});

const file = new URL('../data/cashory-import.json', import.meta.url);
describe.skipIf(!existsSync(file))('real data from the Numbers file', () => {
  const db = parseImport(readFileSync(file, 'utf8'));
  const { categories, accounts } = balancesNow(db);
  const name = (n: string) => db.categories.find((c) => c.name === n)!.id;

  it('every category matches its sheet balance', () => {
    const want: Record<string, number> = {
      'Birthday Cake': -4_049_000,
      Showline: -2_174_450,
      Distribution: 0,
      Profits: 30_874_000,
      Fund: 1_100_000,
      'Dad&Mom': -500_000,
      'For Me': -417_000,
      'Own Account': 4_293_200,
      'Jar Gyi': 4_800_000,
    };
    for (const [n, v] of Object.entries(want)) expect(categories.get(name(n))!.end, n).toBe(v);
  });

  it('banks match the "Banks Total" sheet', () => {
    expect(accounts.get('acc_kbz')!.end).toBe(24_833_550);
    expect(accounts.get('acc_aya')!.end).toBe(9_093_200);
  });

  it('Showline all-time In/Out match the sheet totals row', () => {
    const t = categoryTotals(db, ALL_TIME).get(name('Showline'))!;
    expect(t.in).toBe(70_910_000);
    expect(t.out).toBe(73_084_450);
  });
  it('every month: closing = next opening, adds up, and the last closing is today\'s balance', () => {
    const dates = db.entries.map((x) => x.date).sort();
    const last = monthKey(dates[dates.length - 1]);
    const targets = [...db.categories.map((c) => ({ categoryId: c.id })), ...db.accounts.map((a) => ({ accountId: a.id }))];
    for (const tg of targets) {
      let prevEnd: number | null = null;
      for (let m = monthKey(dates[0]); m <= last; m = addMonths(m, 1)) {
        const st = statement(db, monthRange(m), tg);
        const t = st.totals;
        const label = JSON.stringify(tg) + ' ' + m;
        if (prevEnd !== null) expect(t.start, label).toBe(prevEnd);
        expect(t.start + t.in - t.out + t.movedIn - t.movedOut, label).toBe(t.end);
        expect(st.ins.reduce((s, x) => s + x.amount, 0), label).toBe(t.in);
        expect(st.outs.reduce((s, x) => s + x.amount, 0), label).toBe(t.out);
        expect(st.moves.reduce((s, x) => s + x.delta, 0), label).toBe(t.movedIn - t.movedOut);
        prevEnd = t.end;
      }
      const now = 'categoryId' in tg ? categories.get(tg.categoryId)!.end : accounts.get(tg.accountId)!.end;
      expect(prevEnd, JSON.stringify(tg)).toBe(now);
    }
  });
});
