import { useMemo, useState } from 'react';
import { balancesNow, monthRange, recentEntries, summary } from '../calc';
import { EntryRow } from '../components/EntryRow';
import { BankCards } from '../components/BankCards';
import { longToday, monthKey, todayISO } from '../format';
import { useDB } from '../store';
import { useUI } from '../ui';
import { cloudEnabled } from '../sync/api';
import { engine } from '../sync/engine';
import { syncLabel, useSyncState } from '../sync/hooks';
import { IconNext, IconSettings } from '../components/Icons';
import { TopBar } from '../components/TopBar';
import { accountTone } from '../components/AccountLogo';
import { Num } from '../components/RollingNumber';

export function Home() {
  const db = useDB();
  const { hide, toggleHide, go } = useUI();
  const label = syncLabel(useSyncState());

  const { categories: catBal, accounts: accBal } = useMemo(() => balancesNow(db), [db]);
  const month = monthKey(todayISO());
  const sum = useMemo(() => summary(db, monthRange(month)), [db, month]);
  const recent = useMemo(() => recentEntries(db).slice(0, 5), [db]);

  const cats = db.categories.filter((c) => !c.archived).sort((a, b) => a.sort - b.sort);
  // Accounts with no money in them stay off Home (they are still in Settings and Reports).
  const open = db.accounts.filter((a) => !a.archived).sort((a, b) => a.sort - b.sort);
  const withMoney = open.filter((a) => (accBal.get(a.id)?.end ?? 0) !== 0);
  const accounts = withMoney.length ? withMoney : open;
  const hiddenCount = open.length - accounts.length;
  const [cardIdx, setCardIdx] = useState(0);
  const current = accounts[Math.min(cardIdx, Math.max(0, accounts.length - 1))];
  const shownCats = current ? cats.filter((c) => c.accountId === current.id) : cats;
  const accName = (id: string) => db.accounts.find((a) => a.id === id)?.name;
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });

  return (
    <>
      <TopBar
        logo
        title="Cashory"
        subtitle={
          <>
            {longToday()}
            {cloudEnabled && (
              <button type="button" className={'sync-dot ' + label.tone} onClick={() => void engine.sync()} aria-label={'Sync status: ' + label.text}>
                {label.text}
              </button>
            )}
          </>
        }
        right={
          <a href="#/settings" className="icon-btn" aria-label="Settings">
            <IconSettings />
          </a>
        }
      />
      <main className="page">
        {accounts.length > 0 ? (
          <BankCards
            accounts={accounts}
            index={Math.min(cardIdx, accounts.length - 1)}
            onIndex={setCardIdx}
            balance={(id) => accBal.get(id)?.end ?? 0}
            catCount={(id) => cats.filter((c) => c.accountId === id).length}
            hide={hide}
            onToggleHide={toggleHide}
            onOpen={(id) => go('/entries?a=' + id)}
          />
        ) : (
          <p className="hero-empty">Add an account in Settings to start.</p>
        )}
        {hiddenCount > 0 && (
          <a href="#/settings/accounts" className="deck-note">
            {hiddenCount} empty {hiddenCount === 1 ? 'account' : 'accounts'} hidden
          </a>
        )}

        <div className="section-head">
          <h2>Categories</h2>
          <a href="#/settings/categories">Manage</a>
        </div>
        <div className="cat-grid">
          {shownCats.map((c) => {
            const bal = catBal.get(c.id)?.end ?? 0;
            return (
              <a key={c.id} href={'#/c/' + c.id} className="cat-card" style={{ ['--cat' as string]: c.color }}>
                <span className="cat-name">
                  <span className="dot" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className={'cat-bal' + (bal < 0 ? ' neg' : '')}>
                  <Num v={bal} />
                </span>
                <span className={'tag ' + accountTone(accName(c.accountId))}>{accName(c.accountId)}</span>
              </a>
            );
          })}
        </div>

        {recent.length > 0 && (
          <>
            <div className="section-head">
              <h2>Recent</h2>
              <a href="#/entries?v=recent">See all</a>
            </div>
            <section className="card list">
              {recent.map((e, i) => (
                <EntryRow key={e.id} db={db} entry={e} recorded last={i === recent.length - 1} />
              ))}
            </section>
          </>
        )}

        <a href={'#/reports?m=' + month} className="card month-card">
          <div className="card-head">
            <h2>{monthName} so far</h2>
            <span className="link">
              Report <IconNext size={15} />
            </span>
          </div>
          <div className="facts">
            <div>
              <span>In</span>
              <b className="in"><Num v={sum.in} sign /></b>
            </div>
            <div>
              <span>Out</span>
              <b className="out"><Num v={-sum.out} sign /></b>
            </div>
            <div>
              <span>Net</span>
              <b><Num v={sum.in - sum.out} sign /></b>
            </div>
          </div>
        </a>
      </main>
    </>
  );
}
