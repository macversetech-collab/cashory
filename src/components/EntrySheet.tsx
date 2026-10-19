import { useEffect, useMemo, useRef, useState } from 'react';
import type { DB, Entry, EntryType } from '../types';
import { noteSuggestions } from '../calc';
import { dayLabel, money, todayISO, uid } from '../format';
import { useStore } from '../store';
import { useUI, type SheetPreset } from '../ui';
import { IconBackspace, IconCalendar, IconWallet } from './Icons';

interface Props {
  db: DB;
  preset: SheetPreset;
  onClose(): void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

export function EntrySheet({ db, preset, onClose }: Props) {
  const { saveEntry, deleteEntry, restoreEntry } = useStore();
  const { toast, confirm } = useUI();
  const editing = preset.entryId ? db.entries.find((e) => e.id === preset.entryId) : undefined;

  const cats = useMemo(() => db.categories.filter((c) => !c.archived || c.id === editing?.categoryId || c.id === editing?.toCategoryId).sort((a, b) => a.sort - b.sort), [db, editing]);
  const accounts = useMemo(() => db.accounts.filter((a) => !a.archived || a.id === editing?.accountId || a.id === editing?.toAccountId).sort((a, b) => a.sort - b.sort), [db, editing]);

  const [type, setType] = useState<EntryType>(editing?.type ?? preset.type ?? 'out');
  const [digits, setDigits] = useState(editing ? String(editing.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? preset.categoryId ?? null);
  const [toCategoryId, setToCategoryId] = useState<string | null>(editing?.toCategoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(editing?.accountId ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(editing?.toAccountId ?? null);
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? '');
  const [noteFocus, setNoteFocus] = useState(false);
  const [pickAccount, setPickAccount] = useState<'from' | 'to' | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const catOf = (id: string | null) => db.categories.find((c) => c.id === id);
  const accName = (id: string | null) => db.accounts.find((a) => a.id === id)?.name ?? '—';

  // The account follows the category unless the person picked one.
  const fromAcc = accountId ?? catOf(categoryId)?.accountId ?? null;
  const toAcc = toAccountId ?? catOf(toCategoryId)?.accountId ?? null;

  const amount = Number(digits || '0');
  const valid = amount > 0 && !!categoryId && !!fromAcc && (type !== 'move' || (!!toCategoryId && toCategoryId !== categoryId && !!toAcc));

  const suggestions = useMemo(() => noteSuggestions(db, categoryId, type, note), [db, categoryId, type, note]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function press(k: string) {
    if (k === 'del') return setDigits((d) => d.slice(0, -1));
    setDigits((d) => {
      const next = (d + k).replace(/^0+/, '');
      return next.length > 12 ? d : next;
    });
  }

  function chooseCategory(id: string) {
    setCategoryId(id);
    setAccountId(null);
    setPickAccount(null);
  }

  function save() {
    if (!valid) return;
    const now = new Date().toISOString();
    const e: Entry = {
      id: editing?.id ?? uid(),
      date,
      type,
      amount,
      categoryId: categoryId!,
      accountId: fromAcc!,
      toCategoryId: type === 'move' ? toCategoryId : null,
      toAccountId: type === 'move' ? toAcc : null,
      note: note.replace(/\s+/g, ' ').trim(),
      createdAt: editing?.createdAt ?? now,
    };
    saveEntry(e);
    const sign = type === 'in' ? '+' : type === 'out' ? '−' : '';
    const where = type === 'move' ? `${catOf(categoryId)?.name} → ${catOf(toCategoryId)?.name}` : catOf(categoryId)?.name;
    toast({ text: `${editing ? 'Updated' : 'Saved'} · ${where} ${sign}${money(amount)}` });
    onClose();
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirm({ title: 'Delete this entry?', body: `${money(editing.amount)} · ${editing.note || 'No note'}`, ok: 'Delete', danger: true });
    if (!ok) return;
    deleteEntry(editing.id);
    toast({ text: 'Entry deleted', action: { label: 'Undo', run: () => restoreEntry(editing.id) } });
    onClose();
  }

  const amountColor = type === 'in' ? 'var(--in)' : type === 'out' ? 'var(--out)' : 'var(--ink)';

  const accountPicker = (which: 'from' | 'to') => (
    <div className="chips" role="radiogroup" aria-label="Account">
      {accounts.map((a) => {
        const on = (which === 'from' ? fromAcc : toAcc) === a.id;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={'chip' + (on ? ' on' : '')}
            onClick={() => {
              if (which === 'from') setAccountId(a.id);
              else setToAccountId(a.id);
              setPickAccount(null);
            }}
          >
            {a.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={editing ? 'Edit entry' : 'New entry'} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="sheet-head">
          <button type="button" className="link-btn" onClick={onClose}>
            Cancel
          </button>
          <h1>{editing ? 'Edit entry' : 'New entry'}</h1>
          <button type="button" className="link-btn strong" disabled={!valid} onClick={save}>
            Save
          </button>
        </div>

        <div className="sheet-body">
          <div className="seg" role="radiogroup" aria-label="Entry type">
            {(['out', 'in', 'move'] as EntryType[]).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} className={'seg-btn' + (type === t ? ' on ' + t : '')} onClick={() => setType(t)}>
                {t === 'out' ? '− Out' : t === 'in' ? '+ In' : '⇄ Move'}
              </button>
            ))}
          </div>

          <div className="amount" style={{ color: amountColor }} aria-live="polite">
            <span className={digits ? '' : 'placeholder'}>{digits ? money(amount) : '0'}</span>
            <small>Ks</small>
          </div>

          {type === 'move' && <div className="field-label">FROM</div>}
          <div className="chips" role="radiogroup" aria-label={type === 'move' ? 'From category' : 'Category'}>
            {cats.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={categoryId === c.id} className={'chip' + (categoryId === c.id ? ' on' : '')} onClick={() => chooseCategory(c.id)}>
                <span className="dot" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>

          {categoryId && (
            <div className="acc-line">
              <IconWallet />
              <span>
                {type === 'in' ? 'Into ' : 'From '}
                <b>{accName(fromAcc)}</b>
                {accountId && accountId !== catOf(categoryId)?.accountId ? '' : ` (${catOf(categoryId)?.name}'s account)`}
              </span>
              <button type="button" className="link-btn small" onClick={() => setPickAccount(pickAccount === 'from' ? null : 'from')}>
                {pickAccount === 'from' ? 'Done' : 'Change'}
              </button>
            </div>
          )}
          {pickAccount === 'from' && accountPicker('from')}

          {type === 'move' && (
            <>
              <div className="field-label">TO</div>
              <div className="chips" role="radiogroup" aria-label="To category">
                {cats
                  .filter((c) => c.id !== categoryId)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={toCategoryId === c.id}
                      className={'chip' + (toCategoryId === c.id ? ' on' : '')}
                      onClick={() => {
                        setToCategoryId(c.id);
                        setToAccountId(null);
                      }}
                    >
                      <span className="dot" style={{ background: c.color }} />
                      {c.name}
                    </button>
                  ))}
              </div>
              {toCategoryId && (
                <div className="acc-line">
                  <IconWallet />
                  <span>
                    Into <b>{accName(toAcc)}</b>
                  </span>
                  <button type="button" className="link-btn small" onClick={() => setPickAccount(pickAccount === 'to' ? null : 'to')}>
                    {pickAccount === 'to' ? 'Done' : 'Change'}
                  </button>
                </div>
              )}
              {pickAccount === 'to' && accountPicker('to')}
            </>
          )}

          <div className="row-2">
            <label className="date-btn">
              <IconCalendar />
              <span>{dayLabel(date)}</span>
              <input
                ref={dateRef}
                type="date"
                value={date}
                max="2100-12-31"
                onChange={(e) => e.target.value && setDate(e.target.value)}
                aria-label="Date"
              />
            </label>
          </div>

          <div className="note-wrap">
            <label className={'note' + (noteFocus ? ' focus' : '')}>
              <span>Note</span>
              <input
                value={note}
                placeholder="What was it for?"
                onChange={(e) => setNote(e.target.value)}
                onFocus={() => setNoteFocus(true)}
                onBlur={() => setTimeout(() => setNoteFocus(false), 150)}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), valid && save())}
                enterKeyHint="done"
                autoCapitalize="sentences"
              />
              {note && (
                <button type="button" className="clear" aria-label="Clear note" onClick={() => setNote('')}>
                  ×
                </button>
              )}
            </label>
            {suggestions.length > 0 && (
              <div className="suggest" aria-label="Suggestions">
                {suggestions.map((s) => (
                  <button key={s.note} type="button" className="sugg" onMouseDown={(e) => e.preventDefault()} onClick={() => setNote(s.note)}>
                    {s.note}
                    <small>· {s.uses}×</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          {editing && (
            <button type="button" className="danger-btn" onClick={remove}>
              Delete entry
            </button>
          )}
        </div>

        {!noteFocus && (
          <div className="keypad">
            {KEYS.map((k) => (
              <button key={k} type="button" aria-label={k === 'del' ? 'Delete digit' : k} onClick={() => press(k)}>
                {k === 'del' ? <IconBackspace /> : k}
              </button>
            ))}
          </div>
        )}
        <button type="button" className={'save-big ' + type} disabled={!valid} onClick={save}>
          {editing ? 'Save changes' : type === 'in' ? 'Save In' : type === 'out' ? 'Save Out' : 'Save Move'}
        </button>
      </div>
    </div>
  );
}
