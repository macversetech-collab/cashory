import { useMemo } from 'react';
import { balancesNow, monthRange, summary } from '../calc';
import { longToday, monthKey, todayISO } from '../format';
import { useDB } from '../store';
import { useUI } from '../ui';
import { cloudEnabled } from '../sync/api';
import { engine } from '../sync/engine';
import { syncLabel, useSyncState } from '../sync/hooks';
import { IconEye, IconEyeOff, IconNext, IconSettings } from '../components/Icons';
import { TopBar } from '../components/TopBar';
import { AccountLogo, accountTone } from '../components/AccountLogo';
import { Num } from '../components/RollingNumber';

export function Home() {
  const db = useDB();
  const { hide, toggleHide } = useUI();
  const label = syncLabel(useSyncState());

  const { categories: catBal, accounts: accBal } = useMemo(() => balancesNow(db), [db]);
  const month = monthKey(todayISO());
  const sum = useMemo(() => summary(db, monthRange(month)), [db, month]);

  const cats = db.categories.filter((c) => !c.archived).sort((a, b) => a.sort - b.sort);
  // Accounts with no money in them stay off Home (they are still in Settings and Reports).
  const accounts = db.accounts
    .filter((a) => !a.archived && (accBal.get(a.id)?.end ?? 0) !== 0)
    .sort((a, b) => a.sort - b.sort);
  const hiddenCount = db.accounts.filter((a) => !a.archived).length - accounts.length;
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
        <section className="hero" aria-labelledby="acc-h">
          <div className="hero-top">
            <h2 id="acc-h">Accounts</h2>
            <button type="button" className="hero-eye" aria-label={hide ? 'Show balances' : 'Hide balances'} onClick={toggleHide}>
              {hide ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
          {accounts.length === 0 && <p className="hero-empty">No money in any account yet.</p>}
          {accounts.map((a) => {
            const names = cats.filter((c) => c.accountId === a.id).map((c) => c.name);
            const bal = accBal.get(a.id)?.end ?? 0;
            return (
              <a key={a.id} href={'#/entries?a=' + a.id} className="acc-row">
                <AccountLogo name={a.name} size={42} />
                <span className="acc-main">
                  <span className="acc-name">{a.name}</span>
                  {names.length > 0 && <span className="acc-cats">{names.join(' · ')}</span>}
                </span>
                <span className={'acc-bal' + (bal < 0 ? ' neg' : '')}>
                  <Num v={bal} />
                </span>
              </a>
            );
          })}
          {hiddenCount > 0 && (
            <a href="#/settings/accounts" className="hero-foot">
              {hiddenCount} empty {hiddenCount === 1 ? 'account' : 'accounts'} hidden
            </a>
          )}
        </section>

        <div className="section-head">
          <h2>Categories</h2>
          <a href="#/settings/categories">Manage</a>
        </div>
        <div className="cat-grid">
          {cats.map((c) => {
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
