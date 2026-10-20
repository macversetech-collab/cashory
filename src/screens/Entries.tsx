import { useMemo, useState } from 'react';
import { ALL_TIME, accountTotals, byDateAsc, categoryTotals, liveEntries, monthRange, recentEntries, recordedDay, statement, type Range, type Totals } from '../calc';
import { addMonths, dayLabel, money, monthKey, monthName, noteKey, signed, todayISO } from '../format';
import type { Entry } from '../types';
import { useDB } from '../store';
import { useUI } from '../ui';
import { EntryRow } from '../components/EntryRow';
import { AccountLogo, accountTone } from '../components/AccountLogo';
import { IconBack, IconNext, IconSearch, IconX } from '../components/Icons';
import { Num } from '../components/RollingNumber';
import { TopBar } from '../components/TopBar';

const PAGE = 120;
const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1 Oct" for the first day, "31 Oct" for the last day of a month key. */
function firstDay(m: string) {
  return `1 ${MONTHS3[Number(m.slice(5, 7)) - 1]}`;
}
function lastDay(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return `${new Date(y, mo, 0).getDate()} ${MONTHS3[mo - 1]}`;
}

/**
 * Entries = a monthly statement.
 * - Nothing picked: one row per category (or account): opening → In / Out → closing.
 * - A category or account picked: its statement card, then the month's In, Out and moves.
 * URL: m=YYYY-MM (default this month, "all" for every month), by=acc, c=category, a=account, q=search.
 */
/** Entries tab: Recent (every record, newest first, with its time) or the monthly statement. */
export function Entries({ query }: { query: URLSearchParams }) {
  return query.get('v') === 'recent' ? <RecentEntries query={query} /> : <Statement query={query} />;
}

function ViewSeg({ view }: { view: 'recent' | 'cat' | 'acc' }) {
  const { go } = useUI();
  const btn = (v: typeof view, label: string, to: string) => (
    <button type="button" role="radio" aria-checked={view === v} className={'seg-btn' + (view === v ? ' on' : '')} onClick={() => go(to)}>
      {label}
    </button>
  );
  return (
    <div className="seg" role="radiogroup" aria-label="Show">
      {btn('recent', 'Recent', '/entries?v=recent')}
      {btn('cat', 'Categories', '/entries')}
      {btn('acc', 'Accounts', '/entries?by=acc')}
    </div>
  );
}

const RECENT_PAGE = 60;

function RecentEntries({ query }: { query: URLSearchParams }) {
  const db = useDB();
  const { go } = useUI();
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(RECENT_PAGE);
  const catId = query.get('c');
  const qKey = noteKey(q);
  const list = useMemo(
    () => recentEntries(db).filter((e) => (!catId || e.categoryId === catId || e.toCategoryId === catId) && (!qKey || noteKey(e.note).includes(qKey))),
    [db, catId, qKey],
  );
  const shown = list.slice(0, limit);
  const cats = db.categories.filter((c) => !c.archived || c.id === catId).sort((a, b) => a.sort - b.sort);

  return (
    <>
      <TopBar title="Entries" subtitle="Recent" />
      <main className="page">
        <ViewSeg view="recent" />
        <div className="chips scroll" role="radiogroup" aria-label="Category">
          <button type="button" role="radio" aria-checked={!catId} className={'chip' + (!catId ? ' on' : '')} onClick={() => go('/entries?v=recent')}>
            All
          </button>
          {cats.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={catId === c.id} className={'chip' + (catId === c.id ? ' on' : '')} onClick={() => go('/entries?v=recent&c=' + c.id)}>
              <span className="dot" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
        <label className="search">
          <IconSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" enterKeyHint="search" />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ('')}>
              <IconX />
            </button>
          )}
        </label>
        {list.length === 0 && <p className="empty">{q ? `Nothing matches “${q}”.` : 'No entries yet.'}</p>}
        {shown.length > 0 && (
          <section className="card list">
            {shown.map((e, i) => {
              const day = recordedDay(e);
              return (
                <div key={e.id} className="dated">
                  {(i === 0 || recordedDay(shown[i - 1]) !== day) && <div className="date-tag">{dayLabel(day)}</div>}
                  <EntryRow db={db} entry={e} categoryId={catId ?? undefined} recorded last={i === shown.length - 1} />
                </div>
              );
            })}
          </section>
        )}
        {list.length > limit && (
          <button type="button" className="more-btn block" onClick={() => setLimit((l) => l + RECENT_PAGE)}>
            Show older ({list.length - limit} more)
          </button>
        )}
      </main>
    </>
  );
}

function Statement({ query }: { query: URLSearchParams }) {
  const db = useDB();
  const { go, hide } = useUI();
  const [q, setQ] = useState(query.get('q') ?? '');
  const [limit, setLimit] = useState(PAGE);

  const thisMonth = monthKey(todayISO());
  const mParam = query.get('m');
  const allTime = mParam === 'all';
  const month = mParam && /^\d{4}-\d{2}$/.test(mParam) ? mParam : thisMonth;
  const range: Range = allTime ? ALL_TIME : monthRange(month);
  const catId = query.get('c');
  const accId = query.get('a');
  const byAcc = !catId && (!!accId || query.get('by') === 'acc');

  const cat = catId ? db.categories.find((c) => c.id === catId) : undefined;
  const acc = accId && byAcc ? db.accounts.find((a) => a.id === accId) : undefined;
  const accName = (id: string) => db.accounts.find((a) => a.id === id)?.name ?? '';

  const nav = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(query);
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (q) p.set('q', q);
    else p.delete('q');
    if (p.get('m') === thisMonth) p.delete('m');
    setLimit(PAGE);
    const s = p.toString();
    go('/entries' + (s ? '?' + s : ''));
  };

  const firstMonth = useMemo(() => {
    const ds = liveEntries(db)
      .map((e) => e.date)
      .sort();
    return ds.length ? monthKey(ds[0]) : thisMonth;
  }, [db, thisMonth]);

  const qKey = noteKey(q);
  const match = (e: Entry) => !qKey || noteKey(e.note).includes(qKey);

  const st = useMemo(() => {
    if (cat) return statement(db, range, { categoryId: cat.id });
    if (acc) return statement(db, range, { accountId: acc.id });
    return null;
  }, [db, cat, acc, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    if (st) return null;
    const totals = byAcc ? accountTotals(db, range) : categoryTotals(db, range);
    const items = byAcc
      ? db.accounts
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((a) => ({ id: a.id, name: a.name, account: a.name, color: '', archived: a.archived, t: totals.get(a.id)! }))
      : db.categories
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((c) => ({ id: c.id, name: c.name, account: accName(c.accountId), color: c.color, archived: c.archived, t: totals.get(c.id)! }));
    return items.filter((r) => r.t.start || r.t.end || r.t.in || r.t.out || r.t.movedIn || r.t.movedOut || !r.archived);
  }, [db, st, byAcc, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  // Searching from the overview: a flat list of matching entries in the period.
  const found = useMemo(() => {
    if (st || !qKey) return null;
    return liveEntries(db)
      .filter((e) => e.date >= range.from && e.date < range.to && match(e))
      .sort(byDateAsc)
      .reverse();
  }, [db, st, qKey, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtitle = allTime ? 'All time' : monthName(month);
  const openLabel = allTime ? 'Start' : 'Opening · ' + firstDay(month);
  const closeLabel = allTime || month === thisMonth ? 'Today · ' + todayShort() : 'Closing · ' + lastDay(month);

  return (
    <>
      <TopBar title="Entries" subtitle={subtitle} />
      <main className="page">
        {allTime ? (
          <div className="filters">
            <button type="button" className="filter-pill" onClick={() => nav({ m: null })}>
              All time <IconX size={14} />
            </button>
          </div>
        ) : (
          <div className="month-switch">
            <button type="button" className="ms-btn" aria-label="Previous month" disabled={month <= firstMonth} onClick={() => nav({ m: addMonths(month, -1) })}>
              <IconBack size={20} />
            </button>
            <div className="ms-label">
              <strong>{monthName(month)}</strong>
              <span>{month === thisMonth ? 'This month' : month < thisMonth ? 'Closed month' : 'Upcoming'}</span>
            </div>
            <button type="button" className="ms-btn" aria-label="Next month" disabled={month >= thisMonth} onClick={() => nav({ m: addMonths(month, 1) })}>
              <IconNext size={20} />
            </button>
          </div>
        )}

        <ViewSeg view={byAcc ? 'acc' : 'cat'} />

        <div className="chips scroll" role="radiogroup" aria-label={byAcc ? 'Account' : 'Category'}>
          <button type="button" role="radio" aria-checked={!st} className={'chip' + (!st ? ' on' : '')} onClick={() => nav(byAcc ? { a: null } : { c: null })}>
            All
          </button>
          {byAcc
            ? db.accounts
                .filter((a) => !a.archived || a.id === accId)
                .sort((a, b) => a.sort - b.sort)
                .map((a) => (
                  <button key={a.id} type="button" role="radio" aria-checked={accId === a.id} className={'chip' + (accId === a.id ? ' on' : '')} onClick={() => nav({ a: a.id, c: null })}>
                    {a.name}
                  </button>
                ))
            : db.categories
                .filter((c) => !c.archived || c.id === catId)
                .sort((a, b) => a.sort - b.sort)
                .map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={catId === c.id} className={'chip' + (catId === c.id ? ' on' : '')} onClick={() => nav({ c: c.id, a: null })}>
                    <span className="dot" style={{ background: c.color }} />
                    {c.name}
                  </button>
                ))}
        </div>

        {st && (cat || acc) && (
          <section className="hero stmt">
            <div className="hero-top">
              <h2>
                {cat ? <span className="dot ring" style={{ background: cat.color }} /> : <AccountLogo name={acc!.name} size={26} />}
                {cat ? cat.name : acc!.name}
              </h2>
              {cat ? <span className="hero-chip">{accName(cat.accountId)}</span> : <span className="hero-chip">{subtitle}</span>}
            </div>
            <StatementLines t={st.totals} counts={{ in: st.ins.length, out: st.outs.length, moves: st.moves.length }} openLabel={openLabel} closeLabel={closeLabel} />
          </section>
        )}

        <label className="search">
          <IconSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={st ? 'Search this statement' : 'Search notes (Flour, Lashio…)'} aria-label="Search notes" enterKeyHint="search" />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ('')}>
              <IconX />
            </button>
          )}
        </label>

        {st && (
          <>
            <Group title="In" kind="in" entries={st.ins.filter(match)} total={st.totals.in} hide={hide} catId={cat?.id} accId={acc?.id} />
            <Group title="Out" kind="out" entries={st.outs.filter(match)} total={-st.totals.out} hide={hide} catId={cat?.id} accId={acc?.id} />
            {st.moves.length > 0 && (
              <Group
                title="Moved"
                kind="move"
                entries={st.moves.map((m) => m.entry).filter(match)}
                total={st.totals.movedIn - st.totals.movedOut}
                hide={hide}
                catId={cat?.id}
                accId={acc?.id}
              />
            )}
            {qKey && !st.ins.some(match) && !st.outs.some(match) && !st.moves.some((m) => match(m.entry)) && <p className="empty">Nothing matches “{q}”.</p>}
          </>
        )}

        {rows && !found && (
          <>
            <div className="section-head">
              <h2>{byAcc ? 'By account' : 'By category'}</h2>
              <span className="hint">{allTime ? 'Start → today' : month === thisMonth ? firstDay(month) + ' → today' : firstDay(month) + ' → ' + lastDay(month)}</span>
            </div>
            <section className="card list">
              {rows.map((r, i) => (
                <button key={r.id} type="button" className={'st-row' + (i === rows.length - 1 ? ' last' : '')} onClick={() => nav(byAcc ? { a: r.id } : { c: r.id })}>
                  <span className="st-top">
                    <span className="st-name">
                      {byAcc ? <AccountLogo name={r.name} size={22} /> : <span className="dot" style={{ background: r.color }} />}
                      <b>{r.name}</b>
                      {!byAcc && <span className={'tag ' + accountTone(r.account)}>{r.account}</span>}
                    </span>
                    <b className={'st-end' + (r.t.end < 0 ? ' out' : '')}>{hide ? '•••••' : money(r.t.end)}</b>
                  </span>
                  <span className="st-sub">
                    <span>{hide ? 'From •••••' : 'From ' + money(r.t.start)}</span>
                    <span>
                      {r.t.in || r.t.out || r.t.movedIn !== r.t.movedOut ? (
                        <>
                          {r.t.in > 0 && <em className="in">{hide ? '•••' : signed(r.t.in)}</em>}
                          {r.t.out > 0 && <em className="out">{hide ? '•••' : signed(-r.t.out)}</em>}
                          {r.t.movedIn !== r.t.movedOut && <em className="mv">⇄ {hide ? '•••' : signed(r.t.movedIn - r.t.movedOut)}</em>}
                        </>
                      ) : (
                        <em>No change</em>
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          </>
        )}

        {found && (
          <>
            <div className="result-line">
              <span>{found.length} entries</span>
              {!hide && (
                <span>
                  <b className="in">{signed(found.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0))}</b> ·{' '}
                  <b className="out">{signed(-found.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0))}</b>
                </span>
              )}
            </div>
            {found.length === 0 && <p className="empty">Nothing matches “{q}”.</p>}
            {found.length > 0 && (
              <section className="card list">
                {found.slice(0, limit).map((e, i, shown) => (
                  <div key={e.id} className="dated">
                    {(i === 0 || shown[i - 1].date !== e.date) && <div className="date-tag">{dayLabel(e.date)}</div>}
                    <EntryRow db={db} entry={e} last={i === shown.length - 1} />
                  </div>
                ))}
              </section>
            )}
            {found.length > limit && (
              <button type="button" className="more-btn block" onClick={() => setLimit((l) => l + PAGE)}>
                Show more ({found.length - limit})
              </button>
            )}
            {!allTime && (
              <button type="button" className="link-btn small center" onClick={() => nav({ m: 'all' })}>
                Search every month
              </button>
            )}
          </>
        )}
      </main>
    </>
  );
}

function todayShort() {
  const t = todayISO();
  return `${Number(t.slice(8, 10))} ${MONTHS3[Number(t.slice(5, 7)) - 1]}`;
}

function StatementLines({ t, counts, openLabel, closeLabel }: { t: Totals; counts: { in: number; out: number; moves: number }; openLabel: string; closeLabel: string }) {
  const moved = t.movedIn - t.movedOut;
  return (
    <div className="stmt-lines">
      <div className="stmt-line">
        <span>{openLabel}</span>
        <b>
          <Num v={t.start} />
        </b>
      </div>
      <div className="stmt-line">
        <span>In · {counts.in}</span>
        <b className="in">
          <Num v={t.in} sign />
        </b>
      </div>
      <div className="stmt-line">
        <span>Out · {counts.out}</span>
        <b className="out">
          <Num v={-t.out} sign />
        </b>
      </div>
      {counts.moves > 0 && (
        <div className="stmt-line">
          <span>⇄ Moved · {counts.moves}</span>
          <b>
            <Num v={moved} sign />
          </b>
        </div>
      )}
      <div className="stmt-close">
        <span>{closeLabel}</span>
        <b className={t.end < 0 ? 'out' : ''}>
          <Num v={t.end} />
        </b>
      </div>
    </div>
  );
}

function Group({ title, kind, entries, total, hide, catId, accId }: { title: string; kind: 'in' | 'out' | 'move'; entries: Entry[]; total: number; hide: boolean; catId?: string; accId?: string }) {
  const db = useDB();
  if (entries.length === 0 && kind === 'move') return null;
  return (
    <>
      <div className="section-head">
        <h2>
          {title} <span className="count">{entries.length}</span>
        </h2>
        <b className={'group-total ' + kind}>{hide ? '•••••' : signed(total)}</b>
      </div>
      {entries.length === 0 ? (
        <p className="empty small">{kind === 'in' ? 'No money in.' : 'No money out.'}</p>
      ) : (
        <section className="card list">
          {entries.map((e, i) => (
            <EntryRow key={e.id} db={db} entry={e} categoryId={catId} accountId={accId} showDate last={i === entries.length - 1} />
          ))}
        </section>
      )}
    </>
  );
}
