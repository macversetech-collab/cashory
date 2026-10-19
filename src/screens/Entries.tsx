import { useMemo, useState } from 'react';
import { byDateAsc, liveEntries, monthRange } from '../calc';
import { dayLabel, monthName, noteKey, signed } from '../format';
import { useDB } from '../store';
import { useUI } from '../ui';
import { EntryRow } from '../components/EntryRow';
import { IconSearch, IconX } from '../components/Icons';
import { TopBar } from '../components/TopBar';

const PAGE = 120;

export function Entries({ query }: { query: URLSearchParams }) {
  const db = useDB();
  const { go, hide } = useUI();
  const [q, setQ] = useState(query.get('q') ?? '');
  const [limit, setLimit] = useState(PAGE);
  const catId = query.get('c');
  const accId = query.get('a');
  const month = query.get('m');

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(query);
    if (v) p.set(k, v);
    else p.delete(k);
    if (q) p.set('q', q);
    else p.delete('q');
    const s = p.toString();
    go('/entries' + (s ? '?' + s : ''));
  };

  const list = useMemo(() => {
    const key = noteKey(q);
    const r = month ? monthRange(month) : null;
    return liveEntries(db)
      .filter((e) => (!catId || e.categoryId === catId || e.toCategoryId === catId) && (!accId || e.accountId === accId || e.toAccountId === accId) && (!r || (e.date >= r.from && e.date < r.to)) && (!key || noteKey(e.note).includes(key)))
      .sort(byDateAsc)
      .reverse();
  }, [db, q, catId, accId, month]);

  const totals = useMemo(() => {
    let i = 0,
      o = 0;
    for (const e of list) {
      if (e.type === 'in') i += e.amount;
      else if (e.type === 'out') o += e.amount;
    }
    return { i, o };
  }, [list]);

  const shown = list.slice(0, limit);
  const cats = db.categories.slice().sort((a, b) => a.sort - b.sort);
  const accName = accId ? db.accounts.find((a) => a.id === accId)?.name : null;

  return (
    <>
      <TopBar title="Entries" subtitle={`${list.length} entries`} />
      <main className="page">

      <label className="search">
        <IconSearch />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes (Flour, Lashio…)" aria-label="Search notes" enterKeyHint="search" />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => setQ('')}>
            <IconX />
          </button>
        )}
      </label>

      <div className="chips scroll" role="radiogroup" aria-label="Category filter">
        <button type="button" role="radio" aria-checked={!catId} className={'chip' + (!catId ? ' on' : '')} onClick={() => setParam('c', null)}>
          All
        </button>
        {cats.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={catId === c.id} className={'chip' + (catId === c.id ? ' on' : '')} onClick={() => setParam('c', c.id)}>
            <span className="dot" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {(accName || month) && (
        <div className="filters">
          {accName && (
            <button type="button" className="filter-pill" onClick={() => setParam('a', null)}>
              Account: {accName} <IconX size={14} />
            </button>
          )}
          {month && (
            <button type="button" className="filter-pill" onClick={() => setParam('m', null)}>
              {monthName(month)} <IconX size={14} />
            </button>
          )}
        </div>
      )}

      <div className="result-line">
        <span>{list.length} entries</span>
        {!hide && (
          <span>
            <b className="in">{signed(totals.i)}</b> · <b className="out">{signed(-totals.o)}</b>
          </span>
        )}
      </div>

      {list.length === 0 && <p className="empty">Nothing matches.</p>}
      {shown.length > 0 && (
        <section className="card list">
          {shown.map((e, i) => (
            <div key={e.id} className="dated">
              {(i === 0 || shown[i - 1].date !== e.date) && <div className="date-tag">{dayLabel(e.date)}</div>}
              <EntryRow db={db} entry={e} categoryId={catId ?? undefined} last={i === shown.length - 1} />
            </div>
          ))}
        </section>
      )}
      {list.length > limit && (
        <button type="button" className="more-btn block" onClick={() => setLimit((l) => l + PAGE)}>
          Show older ({list.length - limit} more)
        </button>
      )}
      </main>
    </>
  );
}
