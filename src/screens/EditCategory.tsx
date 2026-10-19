import { useState } from 'react';
import type { Category } from '../types';
import { entryCountFor } from '../calc';
import { money, uid } from '../format';
import { PALETTE, useDB, useStore } from '../store';
import { useUI } from '../ui';
import { TopBar } from '../components/TopBar';
import { AccountLogo } from '../components/AccountLogo';
import { IconCheck } from '../components/Icons';

export function EditCategory({ id }: { id: string }) {
  const db = useDB();
  const { saveCategory, deleteCategory } = useStore();
  const { back, go, toast, confirm } = useUI();
  const existing = db.categories.find((c) => c.id === id);
  const isNew = !existing;
  const accounts = db.accounts.filter((a) => !a.archived || a.id === existing?.accountId).sort((a, b) => a.sort - b.sort);

  const [name, setName] = useState(existing?.name ?? '');
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '');
  const [neg, setNeg] = useState((existing?.startingBalance ?? 0) < 0);
  const [start, setStart] = useState(existing && existing.startingBalance ? String(Math.abs(existing.startingBalance)) : '');
  const [color, setColor] = useState(existing?.color ?? PALETTE[db.categories.length % PALETTE.length]);

  const count = existing ? entryCountFor(db, { categoryId: existing.id }) : 0;
  const clash = db.categories.some((c) => c.id !== id && !c.archived && c.name.trim().toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim().length > 0 && !!accountId && !clash;
  const startNum = Number(start.replace(/[^\d]/g, '') || '0') * (neg ? -1 : 1);
  const fallback = existing ? '/c/' + existing.id : '/settings/categories';

  function save() {
    if (!valid) return;
    const c: Category = {
      id: existing?.id ?? uid(),
      name: name.trim(),
      accountId,
      startingBalance: startNum,
      color,
      sort: existing?.sort ?? 0,
      archived: existing?.archived ?? false,
    };
    saveCategory(c);
    toast({ text: isNew ? `Added ${c.name}` : `Saved ${c.name}` });
    back(fallback);
  }

  async function archive() {
    if (!existing) return;
    if (existing.archived) {
      saveCategory({ ...existing, archived: false });
      toast({ text: `${existing.name} is back` });
      return;
    }
    const ok = await confirm({ title: `Archive ${existing.name}?`, body: 'It disappears from Home and Add. Its entries stay in reports and you can bring it back from Settings.', ok: 'Archive' });
    if (ok) {
      saveCategory({ ...existing, archived: true });
      go('/settings/categories');
    }
  }

  async function remove() {
    if (!existing || count > 0) return;
    const ok = await confirm({ title: `Delete ${existing.name}?`, ok: 'Delete', danger: true });
    if (ok) {
      deleteCategory(existing.id);
      go('/settings/categories');
    }
  }

  return (
    <>
      <TopBar
        title={isNew ? 'New category' : 'Edit category'}
        back={'#' + fallback}
        backLabel="Back"
        right={
          <button type="button" className="text-btn strong" disabled={!valid} onClick={save}>
            Save
          </button>
        }
      />
      <main className="page form">
        <section className="card cat-preview" style={{ ['--cat' as string]: color }}>
          <span className="dot xl" style={{ background: color }} />
          <b>{name.trim() || 'Category name'}</b>
        </section>

        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Showline" autoFocus={isNew} />
          {clash && <small className="warn">You already have a category with this name.</small>}
        </label>

        <div className="field">
          <span>Color</span>
          <div className="swatches" role="radiogroup" aria-label="Color">
            {PALETTE.map((p) => (
              <button key={p} type="button" role="radio" aria-label={'Color ' + p} aria-checked={color === p} className={'swatch' + (color === p ? ' on' : '')} style={{ background: p }} onClick={() => setColor(p)}>
                {color === p && <IconCheck size={18} />}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Lives in account</span>
          <div className="grid2" role="radiogroup" aria-label="Account">
            {accounts.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={accountId === a.id} className={'opt' + (accountId === a.id ? ' on' : '')} onClick={() => setAccountId(a.id)}>
                <AccountLogo name={a.name} size={26} />
                {a.name}
              </button>
            ))}
          </div>
          {!isNew && <small className="help">Changing this moves only new entries. Past entries keep the account they were saved with.</small>}
        </div>

        <div className="field">
          <span>Starting balance</span>
          <div className="start-row">
            <button type="button" className={'sign' + (neg ? ' neg' : '')} onClick={() => setNeg((n) => !n)} aria-label={neg ? 'Minus. Tap for plus' : 'Plus. Tap for minus'}>
              {neg ? '−' : '+'}
            </button>
            <input inputMode="numeric" value={start ? money(Number(start.replace(/[^\d]/g, ''))) : ''} onChange={(e) => setStart(e.target.value.replace(/[^\d]/g, '').slice(0, 12))} placeholder="0" aria-label="Starting balance" />
          </div>
          <small className="help">Money already in this pot before your first entry. Leave 0 if all its history is entered.</small>
        </div>

        {existing && (
          <div className="form-foot">
            <button type="button" className="btn ghost block" onClick={archive}>
              {existing.archived ? 'Bring back category' : 'Archive category'}
            </button>
            {count === 0 ? (
              <button type="button" className="btn danger block" onClick={remove}>
                Delete category
              </button>
            ) : (
              <p className="note center">{count} entries use it, so it can be archived but not deleted.</p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
