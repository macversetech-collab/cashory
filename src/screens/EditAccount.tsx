import { useState } from 'react';
import { entryCountFor } from '../calc';
import { uid } from '../format';
import { useDB, useStore } from '../store';
import { useUI } from '../ui';
import { TopBar } from '../components/TopBar';
import { AccountLogo, logoSlug } from '../components/AccountLogo';

export function EditAccount({ id }: { id: string }) {
  const db = useDB();
  const { saveAccount } = useStore();
  const { back, toast } = useUI();
  const existing = db.accounts.find((a) => a.id === id);
  const [name, setName] = useState(existing?.name ?? '');

  const clash = db.accounts.some((a) => a.id !== id && !a.archived && a.name.trim().toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim().length > 0 && !clash;
  const cats = existing ? db.categories.filter((c) => c.accountId === existing.id && !c.archived) : [];
  const count = existing ? entryCountFor(db, { accountId: existing.id }) : 0;
  const done = () => back('/settings/accounts');

  function save() {
    if (!valid) return;
    saveAccount({ id: existing?.id ?? uid(), name: name.trim(), sort: existing?.sort ?? 0, archived: existing?.archived ?? false });
    toast({ text: existing ? 'Account saved' : `Added ${name.trim()}` });
    done();
  }

  function toggleArchive() {
    if (!existing) return;
    saveAccount({ ...existing, archived: !existing.archived });
    done();
  }

  return (
    <>
      <TopBar
        title={existing ? 'Edit account' : 'New account'}
        back="#/settings/accounts"
        backLabel="Accounts"
        right={
          <button type="button" className="text-btn strong" disabled={!valid} onClick={save}>
            Save
          </button>
        }
      />
      <main className="page form">
        <section className="card logo-preview">
          <AccountLogo key={logoSlug(name)} name={name || '?'} size={64} />
          <small>
            Logo file: <b>public/logos/{logoSlug(name) || 'name'}.png</b>
          </small>
        </section>

        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CB Bank, Wave Pay" autoFocus={!existing} />
          {clash && <small className="warn">You already have an account with this name.</small>}
        </label>

        {existing && (
          <div className="form-foot">
            {existing.archived ? (
              <button type="button" className="btn ghost block" onClick={toggleArchive}>
                Bring back account
              </button>
            ) : cats.length > 0 ? (
              <p className="note center">
                {cats.map((c) => c.name).join(', ')} {cats.length === 1 ? 'lives' : 'live'} here. Move {cats.length === 1 ? 'it' : 'them'} to another account before archiving.
              </p>
            ) : (
              <button type="button" className="btn ghost block" onClick={toggleArchive}>
                Archive account
              </button>
            )}
            {count > 0 && <p className="note center">{count} entries use this account.</p>}
          </div>
        )}
      </main>
    </>
  );
}
