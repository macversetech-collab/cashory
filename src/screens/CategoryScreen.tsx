import { useMemo, useState } from 'react';
import { ALL_TIME, categoryTotals, monthRange, noteTotals, running } from '../calc';
import { monthKey, monthName, shortDate, signed, todayISO } from '../format';
import { useDB } from '../store';
import { useMoney, useUI } from '../ui';
import { EntryRow } from '../components/EntryRow';
import { TopBar } from '../components/TopBar';
import { Num } from '../components/RollingNumber';

const PAGE = 80;

export function CategoryScreen({ id }: { id: string }) {
  const db = useDB();
  const { hide } = useUI();
  const m = useMoney();
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [noteSide, setNoteSide] = useState<'out' | 'in'>('out');
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const cat = db.categories.find((c) => c.id === id);
  const month = monthKey(todayISO());
  const range = period === 'month' ? monthRange(month) : ALL_TIME;

  const now = useMemo(() => (cat ? categoryTotals(db, ALL_TIME).get(cat.id) : undefined), [db, cat]);
  const per = useMemo(() => (cat ? categoryTotals(db, range).get(cat.id) : undefined), [db, cat, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const notes = useMemo(() => (cat ? noteTotals(db, range, cat.id) : []), [db, cat, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => (cat ? running(db, cat).reverse() : []), [db, cat]);

  if (!cat || !now || !per) {
    return (
      <>
        <TopBar title="Category" back="#/" backLabel="Home" />
        <main className="page">
          <p className="empty">This category no longer exists.</p>
        </main>
      </>
    );
  }

  const accName = db.accounts.find((a) => a.id === cat.accountId)?.name;
  const noteRows = notes
    .filter((n) => (noteSide === 'out' ? n.out > 0 : n.in > 0))
    .sort((a, b) => (noteSide === 'out' ? b.out - a.out : b.in - a.in));
  const noteMax = Math.max(1, ...noteRows.map((n) => (noteSide === 'out' ? n.out : n.in)));
  const shownNotes = showAllNotes ? noteRows : noteRows.slice(0, 6);

  // group rows by month for headers
  const shown = rows.slice(0, limit);
  const groups: { key: string; items: typeof shown }[] = [];
  for (const r of shown) {
    const k = monthKey(r.entry.date);
    if (!groups.length || groups[groups.length - 1].key !== k) groups.push({ key: k, items: [] });
    groups[groups.length - 1].items.push(r);
  }

  return (
    <>
      <TopBar
        title={cat.name}
        subtitle={<>Lives in {accName}</>}
        back="#/"
        backLabel="Home"
        right={
          <a href={'#/settings/c/' + cat.id} className="text-btn">
            Edit
          </a>
        }
      />
      <main className="page">
      <section className="hero">
        <div className="hero-top">
          <h2>
            <span className="dot ring" style={{ background: cat.color }} /> Balance now
          </h2>
          <span className="hero-chip">{accName}</span>
        </div>
        <div className={'hero-num' + (now.end < 0 ? ' neg' : '')}>
          <Num v={now.end} />
          <small>Ks</small>
        </div>
      </section>

      <div className="seg" role="radiogroup" aria-label="Period">
        <button type="button" role="radio" aria-checked={period === 'month'} className={'seg-btn' + (period === 'month' ? ' on' : '')} onClick={() => setPeriod('month')}>
          {new Date().toLocaleString('en-US', { month: 'long' })}
        </button>
        <button type="button" role="radio" aria-checked={period === 'all'} className={'seg-btn' + (period === 'all' ? ' on' : '')} onClick={() => setPeriod('all')}>
          All time
        </button>
      </div>

      <section className="card stat-grid">
        <div>
          <span>In</span>
          <b className="in"><Num v={per.in} sign /></b>
        </div>
        <div>
          <span>Out</span>
          <b className="out"><Num v={-per.out} sign /></b>
        </div>
        {(per.movedIn > 0 || per.movedOut > 0) && (
          <>
            <div>
              <span>Moved in</span>
              <b><Num v={per.movedIn} sign /></b>
            </div>
            <div>
              <span>Moved out</span>
              <b><Num v={-per.movedOut} sign /></b>
            </div>
          </>
        )}
        {period === 'month' && (
          <div className="span2 start-end">
            <span>
              Start of month <b>
                <Num v={per.start} />
              </b>
            </span>
            <span>
              Now <b>
                <Num v={per.end} />
              </b>
            </span>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>By note</h2>
          <div className="mini-seg" role="radiogroup" aria-label="Side">
            <button type="button" role="radio" aria-checked={noteSide === 'out'} className={noteSide === 'out' ? 'on' : ''} onClick={() => setNoteSide('out')}>
              Out
            </button>
            <button type="button" role="radio" aria-checked={noteSide === 'in'} className={noteSide === 'in' ? 'on' : ''} onClick={() => setNoteSide('in')}>
              In
            </button>
          </div>
        </div>
        {noteRows.length === 0 && <p className="empty small">Nothing {noteSide === 'out' ? 'went out' : 'came in'} {period === 'month' ? 'this month' : 'yet'}.</p>}
        {shownNotes.map((n, i) => {
          const amt = noteSide === 'out' ? n.out : n.in;
          const cnt = noteSide === 'out' ? n.countOut : n.countIn;
          return (
            <div key={n.key} className={'bar-row' + (i === shownNotes.length - 1 ? ' last' : '')}>
              <div className="bar-top">
                <span className={n.note ? '' : 'muted'}>{n.note || 'No note'}</span>
                <small>{cnt}×</small>
                <b>{m(amt)}</b>
              </div>
              <div className="bar">
                <div className={noteSide} style={{ width: `${(amt / noteMax) * 100}%` }} />
              </div>
            </div>
          );
        })}
        {noteRows.length > 6 && (
          <button type="button" className="more-btn" onClick={() => setShowAllNotes((s) => !s)}>
            {showAllNotes ? 'Show less' : `Show all ${noteRows.length}`}
          </button>
        )}
      </section>

      <div className="section-head">
        <h2>Entries</h2>
        <span className="hint">Balance after each</span>
      </div>
      {rows.length === 0 && <p className="empty">No entries yet. Tap + below to add the first one.</p>}
      {groups.map((g) => {
        const net = g.items.reduce((s, r) => s + r.delta, 0);
        return (
          <section key={g.key} className="card list">
            <div className="list-head">
              <span>{monthName(g.key)}</span>
              <span>{hide ? '' : signed(net)}</span>
            </div>
            {g.items.map((r, i) => (
              <div key={r.entry.id} className="dated">
                {(i === 0 || g.items[i - 1].entry.date !== r.entry.date) && <div className="date-tag">{shortDate(r.entry.date)}</div>}
                <EntryRow db={db} entry={r.entry} categoryId={cat.id} balanceAfter={r.balanceAfter} last={i === g.items.length - 1} />
              </div>
            ))}
          </section>
        );
      })}
      {rows.length > limit && (
        <button type="button" className="more-btn block" onClick={() => setLimit((l) => l + PAGE)}>
          Show older ({rows.length - limit} more)
        </button>
      )}

      </main>
    </>
  );
}
