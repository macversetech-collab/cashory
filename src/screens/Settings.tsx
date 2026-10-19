import { useRef, useState, type ReactNode } from 'react';
import { balancesNow, entryCountFor, liveEntries } from '../calc';
import { shortDate, todayISO } from '../format';
import { downloadFile, parseImport, useDB, useStore } from '../store';
import { useMoney, useUI } from '../ui';
import { IconDatabase, IconDown, IconInfo, IconLayers, IconNext, IconPlus, IconTag, IconUp, IconWallet } from '../components/Icons';
import { TopBar } from '../components/TopBar';
import type { DB } from '../types';
import { cloudEnabled, signOut } from '../sync/api';
import { engine } from '../sync/engine';
import { syncLabel, useSession, useSyncState } from '../sync/hooks';
import { AccountLogo, accountTone, logoSlug } from '../components/AccountLogo';

declare const __APP_VERSION__: string;
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const BACKUP_KEY = 'cashory.lastBackup';
function lastBackup(): string | null {
  try {
    return localStorage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
}

function MenuRow({ href, icon, title, detail, tone }: { href: string; icon: ReactNode; title: string; detail?: string; tone: string }) {
  return (
    <a href={href} className="menu-row">
      <span className={'menu-ico ' + tone}>{icon}</span>
      <span className="menu-main">
        <b>{title}</b>
        {detail && <small>{detail}</small>}
      </span>
      <IconNext size={17} />
    </a>
  );
}

/** Settings home: one row per section; details open on their own page. */
export function SettingsHome() {
  const db = useDB();
  const sync = useSyncState();
  const accounts = db.accounts.filter((a) => !a.archived);
  const cats = db.categories.filter((c) => !c.archived);
  const lb = lastBackup();
  return (
    <>
      <TopBar title="Settings" back="#/" backLabel="Home" />
      <main className="page">
        <section className="card menu">
          <MenuRow href="#/settings/accounts" icon={<IconWallet size={20} />} tone="indigo" title="Accounts" detail={accounts.map((a) => a.name).join(', ')} />
          <MenuRow href="#/settings/categories" icon={<IconTag />} tone="amber" title="Categories" detail={`${cats.length} active${db.categories.length > cats.length ? ` · ${db.categories.length - cats.length} archived` : ''}`} />
        </section>
        <section className="card menu">
          <MenuRow href="#/settings/data" icon={<IconDatabase />} tone="teal" title="Data & backup" detail={cloudEnabled ? syncLabel(sync).text : lb ? `Last backup ${shortDate(lb.slice(0, 10))}` : 'No backup yet'} />
          <MenuRow href="#/settings/about" icon={<IconInfo />} tone="slate" title="About Cashory" detail={`Version ${APP_VERSION}`} />
        </section>
      </main>
    </>
  );
}

export function SettingsAccounts() {
  const db = useDB();
  const m = useMoney();
  const bal = balancesNow(db);
  const accounts = db.accounts.slice().sort((a, b) => a.sort - b.sort);
  const active = db.categories.filter((c) => !c.archived);
  return (
    <>
      <TopBar title="Accounts" back="#/settings" backLabel="Settings" />
      <main className="page">
        <section className="card group">
          {accounts.map((a) => {
            const n = active.filter((c) => c.accountId === a.id).length;
            return (
              <a key={a.id} href={'#/settings/a/' + a.id} className={'set-row' + (a.archived ? ' dim' : '')}>
                <AccountLogo name={a.name} size={36} />
                <span className="set-main">
                  <b>{a.name}</b>
                  <small>
                    {a.archived ? 'Archived' : n === 1 ? '1 category' : `${n} categories`} · {m(bal.accounts.get(a.id)?.end ?? 0)}
                  </small>
                </span>
                <IconNext size={17} />
              </a>
            );
          })}
          <a href="#/settings/a/new" className="set-row add">
            <span className="add-ico">
              <IconPlus size={18} />
            </span>
            Add account
          </a>
        </section>
        <p className="group-note">
          Accounts with a 0 balance are hidden on Home. Logos come from <b>public/logos/</b>: {accounts.map((a) => logoSlug(a.name) + '.png').join(', ')}.
        </p>
      </main>
    </>
  );
}

export function SettingsCategories() {
  const db = useDB();
  const { moveCategory } = useStore();
  const cats = db.categories.slice().sort((a, b) => a.sort - b.sort);
  const active = cats.filter((c) => !c.archived);
  const archived = cats.filter((c) => c.archived);
  const acc = (id: string) => db.accounts.find((a) => a.id === id)?.name;
  return (
    <>
      <TopBar title="Categories" back="#/settings" backLabel="Settings" />
      <main className="page">
        <section className="card group">
          {active.map((c, i) => (
            <div key={c.id} className="set-row">
              <div className="reorder">
                <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => moveCategory(c.id, -1)}>
                  <IconUp />
                </button>
                <button type="button" aria-label={`Move ${c.name} down`} disabled={i === active.length - 1} onClick={() => moveCategory(c.id, 1)}>
                  <IconDown />
                </button>
              </div>
              <a href={'#/settings/c/' + c.id} className="set-link">
                <span className="dot lg" style={{ background: c.color }} />
                <span className="set-main">
                  <b>{c.name}</b>
                  <small>{entryCountFor(db, { categoryId: c.id })} entries</small>
                </span>
                <span className={'tag ' + accountTone(acc(c.accountId))}>{acc(c.accountId)}</span>
                <IconNext size={17} />
              </a>
            </div>
          ))}
          <a href="#/settings/c/new" className="set-row add">
            <span className="add-ico">
              <IconPlus size={18} />
            </span>
            Add category
          </a>
        </section>
        <p className="group-note">Each category lives in one account. New entries go to that account unless you change it on the entry.</p>

        {archived.length > 0 && (
          <>
            <div className="group-label">Archived</div>
            <section className="card group">
              {archived.map((c) => (
                <a key={c.id} href={'#/settings/c/' + c.id} className="set-row dim">
                  <span className="dot lg" style={{ background: c.color }} />
                  <span className="set-main">
                    <b>{c.name}</b>
                    <small>{entryCountFor(db, { categoryId: c.id })} entries · kept in reports</small>
                  </span>
                  <IconNext size={17} />
                </a>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}

export function SettingsData() {
  const db = useDB();
  const { replace, clearLocal } = useStore();
  const { confirm, toast, go } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lb, setLb] = useState(lastBackup);
  const session = useSession();
  const sync = useSyncState();
  const label = syncLabel(sync);

  function exportBackup() {
    downloadFile(`cashory-backup-${todayISO()}.json`, JSON.stringify(db), 'application/json');
    const now = new Date().toISOString();
    try {
      localStorage.setItem(BACKUP_KEY, now);
    } catch {
      /* ignore */
    }
    setLb(now);
  }

  async function onImport(file: File) {
    try {
      const next = parseImport(await file.text());
      const n = next.entries.filter((e) => !e.deletedAt).length;
      const ok = await confirm(
        cloudEnabled
          ? { title: 'Add this file to your data?', body: `${n} entries in ${next.categories.length} categories. Rows with the same id are updated, everything else is added. Nothing is deleted.`, ok: 'Import' }
          : { title: 'Replace all data?', body: `This file has ${n} entries in ${next.categories.length} categories. What is in the app now (${liveEntries(db).length} entries) will be replaced.`, ok: 'Replace', danger: true },
      );
      if (!ok) return;
      replace(cloudEnabled ? mergeBooks(db, next) : next);
      toast({ text: 'Data imported' });
    } catch (e) {
      toast({ text: (e as Error).message });
    }
  }

  async function eraseAll() {
    const ok = await confirm({ title: 'Erase everything?', body: 'All accounts, categories and entries on this device will be removed. This cannot be undone.', ok: 'Erase', danger: true });
    if (ok) replace(null);
  }

  async function logOut() {
    const waiting = sync.pending;
    const ok = await confirm({
      title: 'Sign out?',
      body: waiting
        ? `${waiting} changes have not reached the cloud yet and will be lost. Connect to the internet and sync first.`
        : 'Your data stays in the cloud. This device forgets it until you sign in again.',
      ok: 'Sign out',
      danger: waiting > 0,
    });
    if (!ok) return;
    await signOut();
    engine.reset();
    clearLocal();
    go('/');
  }

  return (
    <>
      <TopBar title="Data & backup" back="#/settings" backLabel="Settings" />
      <main className="page">
        {cloudEnabled && (
          <section className="card">
            <div className="card-head">
              <h2>Cloud sync</h2>
              <span className={'sync-pill ' + label.tone}>{label.text}</span>
            </div>
            <div className="kv">
              <span>Signed in as</span>
              <b>{session?.email || '—'}</b>
            </div>
            <div className="kv">
              <span>Waiting to send</span>
              <b>{sync.pending}</b>
            </div>
            {sync.error && <p className="note warn-note">{sync.error}</p>}
            <button type="button" className="btn primary block" disabled={sync.status === 'syncing'} onClick={() => void engine.sync()}>
              {sync.status === 'syncing' ? 'Syncing…' : 'Sync now'}
            </button>
            <button type="button" className="btn ghost block" onClick={logOut}>
              Sign out
            </button>
          </section>
        )}
        <section className="card">
          <div className="kv">
            <span>Entries</span>
            <b>{liveEntries(db).length.toLocaleString('en-US')}</b>
          </div>
          <div className="kv">
            <span>Saved on</span>
            <b>{cloudEnabled ? 'Cloud + this device' : 'This device only'}</b>
          </div>
          <div className="kv">
            <span>Last backup file</span>
            <b>{lb ? shortDate(lb.slice(0, 10)) : 'Never'}</b>
          </div>
          <button type="button" className="btn primary block" onClick={exportBackup}>
            Export backup (.json)
          </button>
          <button type="button" className="btn ghost block" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <p className="note">{cloudEnabled ? 'A backup file is an extra copy you keep yourself. Import adds or updates rows; it never deletes.' : 'Import replaces everything in the app with the file.'}</p>
        </section>
        {!cloudEnabled && (
          <section className="card">
            <button type="button" className="btn danger block" onClick={eraseAll}>
              Erase all data on this device
            </button>
          </section>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
      </main>
    </>
  );
}

/** Rows from `add` win over rows with the same id in `base`; nothing is removed. */
function mergeBooks(base: DB, add: DB): DB {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => {
    const m = new Map(a.map((x) => [x.id, x]));
    for (const x of b) m.set(x.id, x);
    return [...m.values()];
  };
  return { ...base, accounts: merge(base.accounts, add.accounts), categories: merge(base.categories, add.categories), entries: merge(base.entries, add.entries) };
}

export function About() {
  const db = useDB();
  const es = liveEntries(db);
  const dates = es.map((e) => e.date).sort();
  return (
    <>
      <TopBar title="About" back="#/settings" backLabel="Settings" />
      <main className="page">
        <section className="card about">
          <img src="./icon-192.png" alt="" width="84" height="84" />
          <h2>Cashory</h2>
          <p>Money in and out, by category and by account.</p>
        </section>
        <section className="card">
          <div className="kv">
            <span>Version</span>
            <b>{APP_VERSION}</b>
          </div>
          <div className="kv">
            <span>Entries</span>
            <b>{es.length.toLocaleString('en-US')}</b>
          </div>
          <div className="kv">
            <span>First entry</span>
            <b>{dates.length ? shortDate(dates[0]) : '—'}</b>
          </div>
          <div className="kv">
            <span>Accounts · Categories</span>
            <b>
              {db.accounts.filter((a) => !a.archived).length} · {db.categories.filter((c) => !c.archived).length}
            </b>
          </div>
          <div className="kv">
            <span>Storage</span>
            <b>{cloudEnabled ? 'Supabase cloud + this device' : 'This device (browser)'}</b>
          </div>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>
              <IconLayers size={17} /> How it adds up
            </h2>
          </div>
          <p className="note top">Category balance = starting balance + In − Out ± Move.</p>
          <p className="note top">Account balance = everything booked to that account.</p>
          <p className="note top">Move (⇄) shifts money between categories and is not counted as In or Out.</p>
        </section>
      </main>
    </>
  );
}
