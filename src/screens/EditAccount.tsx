import { useState } from 'react';
import { entryCountFor } from '../calc';
import { uid } from '../format';
import { useDB, useStore } from '../store';
import { useUI } from '../ui';
import { TopBar } from '../components/TopBar';
import { AccountLogo, logoSlug } from '../components/AccountLogo';
import { ACCOUNT_GRADIENTS, CARD_PATTERNS, accountGradient, accountPattern, accountTitle, packCardStyle } from '../accountColors';

export function EditAccount({ id }: { id: string }) {
  const db = useDB();
  const { saveAccount } = useStore();
  const { back, toast } = useUI();
  const existing = db.accounts.find((a) => a.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? '');
  const grad = accountGradient({ name: name || 'x', color });
  const pattern = accountPattern({ color });

  const clash = db.accounts.some((a) => a.id !== id && !a.archived && a.name.trim().toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim().length > 0 && !clash;
  const cats = existing ? db.categories.filter((c) => c.accountId === existing.id && !c.archived) : [];
  const count = existing ? entryCountFor(db, { accountId: existing.id }) : 0;
  const done = () => back('/settings/accounts');

  function save() {
    if (!valid) return;
    saveAccount({ id: existing?.id ?? uid(), name: name.trim(), sort: existing?.sort ?? 0, archived: existing?.archived ?? false, color: packCardStyle(grad.id, pattern) });
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
        <section className={'bank-card preview pat-' + pattern} style={{ background: grad.grad, boxShadow: `0 16px 30px -16px ${grad.shadow}` }}>
          <span className="bc-top">
            <AccountLogo key={logoSlug(name)} name={name || '?'} size={36} />
            <b>{accountTitle(name.trim() || 'Account')}</b>
          </span>
          <span className="bc-label">Logo file: public/logos/{logoSlug(name) || 'name'}.png</span>
        </section>

        <div className="field">
          <span>Card colour</span>
          <div className="swatches grad" role="radiogroup" aria-label="Card colour">
            {ACCOUNT_GRADIENTS.map((g) => (
              <button key={g.id} type="button" role="radio" aria-label={g.name} aria-checked={grad.id === g.id} className={'swatch' + (grad.id === g.id ? ' on' : '')} style={{ background: g.grad }} onClick={() => setColor(packCardStyle(g.id, pattern))} />
            ))}
          </div>
        </div>

        <div className="field">
          <span>Card design</span>
          <div className="patterns" role="radiogroup" aria-label="Card design">
            {CARD_PATTERNS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={pattern === p.id} className={'pattern-opt' + (pattern === p.id ? ' on' : '')} onClick={() => setColor(packCardStyle(grad.id, p.id))}>
                <span className={'bank-card mini pat-' + p.id} style={{ background: grad.grad }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

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
