import { useMemo } from 'react';
import { ALL_TIME, accountTotals, categoryTotals, monthRange, months, noteTotals, summary } from '../calc';
import { addMonths, money, monthKey, monthName, monthShort, signed, todayISO } from '../format';
import { downloadFile, useDB } from '../store';
import { useMoney, useUI } from '../ui';
import { IconBack, IconNext } from '../components/Icons';
import { TopBar } from '../components/TopBar';
import { liveEntries } from '../calc';
import { Num } from '../components/RollingNumber';

export function Reports({ query }: { query: URLSearchParams }) {
  const db = useDB();
  const { go, hide } = useUI();
  const m = useMoney();
  const s = (n: number) => (hide ? '•••••' : signed(n));

  const thisMonth = monthKey(todayISO());
  const mode = query.get('m') === 'all' ? 'all' : 'month';
  const month = mode === 'month' && /^\d{4}-\d{2}$/.test(query.get('m') || '') ? query.get('m')! : thisMonth;
  const range = mode === 'all' ? ALL_TIME : monthRange(month);

  const firstMonth = useMemo(() => {
    const ds = liveEntries(db).map((e) => e.date).sort();
    return ds.length ? monthKey(ds[0]) : thisMonth;
  }, [db, thisMonth]);

  const sum = useMemo(() => summary(db, range), [db, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const cats = useMemo(() => categoryTotals(db, range), [db, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const accs = useMemo(() => accountTotals(db, range), [db, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const notes = useMemo(() => noteTotals(db, range).filter((n) => n.out > 0 && n.key).sort((a, b) => b.out - a.out).slice(0, 10), [db, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthRows = useMemo(() => months(db), [db]);

  const catList = db.categories
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .filter((c) => {
      const t = cats.get(c.id)!;
      return !c.archived || t.in || t.out || t.end;
    });
  const accList = db.accounts.slice().sort((a, b) => a.sort - b.sort).filter((a) => !a.archived || accs.get(a.id)!.end);
  const noteMax = Math.max(1, ...notes.map((n) => n.out));

  function exportCsv() {
    const cat = (id: string | null) => db.categories.find((c) => c.id === id)?.name ?? '';
    const acc = (id: string | null) => db.accounts.find((a) => a.id === id)?.name ?? '';
    const q = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = liveEntries(db)
      .filter((e) => e.date >= range.from && e.date < range.to)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt < b.createdAt ? -1 : 1))
      .map((e) => [e.date, e.type, e.type === 'in' ? e.amount : '', e.type === 'out' ? e.amount : '', e.type === 'move' ? e.amount : '', cat(e.categoryId), acc(e.accountId), cat(e.toCategoryId), acc(e.toAccountId), e.note].map((v) => q(String(v))).join(','));
    const head = 'Date,Type,In,Out,Move,Category,Account,To category,To account,Note';
    downloadFile(`cashory-${mode === 'all' ? 'all-time' : month}.csv`, '﻿' + [head, ...rows].join('\n'), 'text/csv');
  }

  return (
    <>
      <TopBar title="Reports" subtitle={mode === 'all' ? 'All time' : monthName(month)} />
      <main className="page">

      <div className="seg" role="radiogroup" aria-label="Period">
        <button type="button" role="radio" aria-checked={mode === 'month'} className={'seg-btn' + (mode === 'month' ? ' on' : '')} onClick={() => go('/reports?m=' + month)}>
          Month
        </button>
        <button type="button" role="radio" aria-checked={mode === 'all'} className={'seg-btn' + (mode === 'all' ? ' on' : '')} onClick={() => go('/reports?m=all')}>
          All time
        </button>
      </div>

      {mode === 'month' && (
        <div className="month-switch">
          <button type="button" className="ms-btn" aria-label="Previous month" disabled={month <= firstMonth} onClick={() => go('/reports?m=' + addMonths(month, -1))}>
            <IconBack size={20} />
          </button>
          <div className="ms-label">
            <strong>{monthName(month)}</strong>
            <span>{month === thisMonth ? 'This month' : month < thisMonth ? 'Closed month' : ''}</span>
          </div>
          <button type="button" className="ms-btn" aria-label="Next month" disabled={month >= thisMonth} onClick={() => go('/reports?m=' + addMonths(month, 1))}>
            <IconNext size={20} />
          </button>
        </div>
      )}

      <section className="hero">
        <div className="stat3">
          <div>
            <span>In</span>
            <b className="in">
              <Num v={sum.in} sign />
            </b>
          </div>
          <div>
            <span>Out</span>
            <b className="out">
              <Num v={-sum.out} sign />
            </b>
          </div>
          <div>
            <span>Net</span>
            <b>
              <Num v={sum.in - sum.out} sign />
            </b>
          </div>
        </div>
        <div className="start-end-line">
          <div>
            <span>{mode === 'all' ? 'Start' : 'Start · 1 ' + monthShort(month).split(' ')[0]}</span>
            <b>
              <Num v={sum.start} />
            </b>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <div className="right">
            <span>{mode === 'all' || month === thisMonth ? 'Now' : 'End of month'}</span>
            <b>
              <Num v={sum.end} />
            </b>
          </div>
        </div>
      </section>

      <div className="section-head">
        <h2>By category</h2>
        <button type="button" className="link-btn small" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      <section className="card table">
        <div className="trow th">
          <span>Category</span>
          <span>In</span>
          <span>Out</span>
          <span>{mode === 'all' || month === thisMonth ? 'Balance' : 'End bal.'}</span>
        </div>
        {catList.map((c) => {
          const t = cats.get(c.id)!;
          return (
            <a key={c.id} href={'#/c/' + c.id} className="trow">
              <span className="tname">
                <b>{c.name}</b>
                <small>
                  {db.accounts.find((a) => a.id === c.accountId)?.name}
                  {t.movedIn || t.movedOut ? ` · ⇄ ${hide ? '' : signed(t.movedIn - t.movedOut)}` : ''}
                </small>
              </span>
              <span className="in">{t.in ? m(t.in) : '–'}</span>
              <span className="out">{t.out ? m(t.out) : '–'}</span>
              <b className={t.end < 0 ? 'out' : ''}>{m(t.end)}</b>
            </a>
          );
        })}
        <div className="trow total">
          <span>Total</span>
          <span className="in">{m(sum.in)}</span>
          <span className="out">{m(sum.out)}</span>
          <b>{m(sum.end)}</b>
        </div>
      </section>

      <div className="section-head">
        <h2>By account</h2>
      </div>
      <section className="card table">
        <div className="trow th">
          <span>Account</span>
          <span>In</span>
          <span>Out</span>
          <span>{mode === 'all' || month === thisMonth ? 'Balance' : 'End bal.'}</span>
        </div>
        {accList.map((a) => {
          const t = accs.get(a.id)!;
          return (
            <a key={a.id} href={'#/entries?a=' + a.id} className="trow">
              <span className="tname">
                <b>{a.name}</b>
              </span>
              <span className="in">{t.in ? m(t.in) : '–'}</span>
              <span className="out">{t.out ? m(t.out) : '–'}</span>
              <b className={t.end < 0 ? 'out' : ''}>{m(t.end)}</b>
            </a>
          );
        })}
      </section>

      <div className="section-head">
        <h2>Top spending by note</h2>
      </div>
      <section className="card">
        {notes.length === 0 && <p className="empty small">No spending with a note in this period.</p>}
        {notes.map((n, i) => (
          <a key={n.key} href={'#/entries?q=' + encodeURIComponent(n.note) + (mode === 'month' ? '&m=' + month : '')} className={'bar-row' + (i === notes.length - 1 ? ' last' : '')}>
            <div className="bar-top">
              <span>{n.note}</span>
              <small>{n.countOut}×</small>
              <b>{m(n.out)}</b>
            </div>
            <div className="bar">
              <div className="out" style={{ width: `${(n.out / noteMax) * 100}%` }} />
            </div>
          </a>
        ))}
      </section>

      <div className="section-head">
        <h2>Month by month</h2>
      </div>
      <section className="card list">
        {monthRows.map((r, i) => (
          <button key={r.key} type="button" className={'month-row' + (i === monthRows.length - 1 ? ' last' : '') + (mode === 'month' && r.key === month ? ' current' : '')} onClick={() => go('/reports?m=' + r.key)}>
            <span className="mr-main">
              <b>{monthName(r.key)}</b>
              <small>
                In {hide ? '•••' : money(r.in)} · Out {hide ? '•••' : money(r.out)}
              </small>
            </span>
            <b className={r.net < 0 ? 'out' : 'in'}>{s(r.net)}</b>
          </button>
        ))}
      </section>
      </main>
    </>
  );
}
