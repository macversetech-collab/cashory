import type { DB, Entry } from '../types';
import { clock12, dayOf, shortDate, signed, whenLabel } from '../format';
import { isImported } from '../calc';
import { useUI } from '../ui';

interface Props {
  db: DB;
  entry: Entry;
  /** When shown inside a category, the sign of a move follows that category. */
  categoryId?: string;
  /** Inside an account statement, the sign of a move follows that account. */
  accountId?: string;
  balanceAfter?: number;
  showDate?: boolean;
  /** Show when it was recorded (right side), plus "for <date>" and "edited" when they apply. */
  recorded?: boolean;
  last?: boolean;
}

export function EntryRow({ db, entry: e, categoryId, accountId, balanceAfter, showDate, recorded, last }: Props) {
  const { openSheet, hide } = useUI();
  const cat = (id: string | null) => db.categories.find((c) => c.id === id)?.name ?? '—';
  const acc = (id: string | null) => db.accounts.find((a) => a.id === id)?.name ?? '—';

  let delta = e.type === 'in' ? e.amount : -e.amount;
  if (e.type === 'move' && categoryId && e.toCategoryId === categoryId) delta = e.amount;
  if (e.type === 'move' && !categoryId && accountId && e.toAccountId === accountId) delta = e.amount;
  const signedMove = !!(categoryId || accountId);
  const kind = e.type === 'move' ? 'move' : e.type;
  const badge = e.type === 'move' ? '⇄' : e.type === 'in' ? '+' : '−';

  const title = e.note || (e.type === 'move' ? `${cat(e.categoryId)} → ${cat(e.toCategoryId)}` : 'No note');
  const muted = !e.note && e.type !== 'move';
  const parts: string[] = [];
  if (showDate) parts.push(shortDate(e.date));
  if (e.type === 'move') {
    if (e.note) parts.push(`${cat(e.categoryId)} → ${cat(e.toCategoryId)}`);
    else parts.push(e.accountId === e.toAccountId ? acc(e.accountId) : `${acc(e.accountId)} → ${acc(e.toAccountId)}`);
  } else {
    if (!categoryId) parts.push(cat(e.categoryId));
    parts.push(acc(e.accountId));
  }

  let when = '';
  if (recorded) {
    if (isImported(e)) when = shortDate(e.date);
    else {
      when = whenLabel(e.createdAt);
      if (dayOf(e.createdAt) !== e.date) parts.push('for ' + shortDate(e.date));
      if (e.updatedAt && Date.parse(e.updatedAt) - Date.parse(e.createdAt) > 60_000) parts.push('edited ' + clock12(new Date(e.updatedAt)));
    }
  }

  const amountText = hide ? '•••••' : e.type === 'move' && !signedMove ? e.amount.toLocaleString('en-US') : signed(delta);
  const color = e.type === 'move' && !signedMove ? 'var(--muted)' : delta > 0 ? 'var(--in)' : 'var(--out)';

  return (
    <button type="button" className={'entry-row' + (last ? ' last' : '')} onClick={() => openSheet({ entryId: e.id })}>
      <span className={'badge ' + kind}>{badge}</span>
      <span className="entry-main">
        <span className={'entry-title' + (muted ? ' muted' : '')}>{title}</span>
        <span className="entry-sub">{parts.join(' · ')}</span>
      </span>
      <span className="entry-right">
        <span className="entry-amt" style={{ color }}>{amountText}</span>
        {when && <span className="entry-when">{when}</span>}
        {balanceAfter !== undefined && <span className="entry-bal">{hide ? '•••••' : signed(balanceAfter).replace('+', '')}</span>}
      </span>
    </button>
  );
}
