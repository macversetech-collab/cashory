import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Account } from '../types';
import { accountGradient, accountTitle } from '../accountColors';
import { AccountLogo } from './AccountLogo';
import { IconEye, IconEyeOff } from './Icons';
import { Num } from './RollingNumber';

interface Props {
  accounts: Account[];
  index: number;
  onIndex: (i: number) => void;
  balance: (id: string) => number;
  catCount: (id: string) => number;
  hide: boolean;
  onToggleHide: () => void;
  onOpen: (id: string) => void;
}

const PEEK = 11; // px of each card showing under the one in front
const FLY_MS = 260;

/** A deck of bank cards. Swipe (or tap the dots) to bring the next account to the front. */
export function BankCards({ accounts, index, onIndex, balance, catCount, hide, onToggleHide, onOpen }: Props) {
  const n = accounts.length;
  const [drag, setDrag] = useState(0);
  const [flying, setFlying] = useState<{ id: string; dx: number } | null>(null);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const moved = useRef(false);

  function go(step: 1 | -1) {
    if (n < 2 || flying) return;
    setFlying({ id: accounts[index].id, dx: step === 1 ? -1 : 1 });
    setDrag(0);
    window.setTimeout(() => {
      onIndex((index + step + n) % n);
      setFlying(null);
    }, FLY_MS);
  }

  function down(e: PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY, horizontal: null };
    moved.current = false;
  }
  function move(e: PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.horizontal = Math.abs(dx) > Math.abs(dy);
    if (s.horizontal) {
      moved.current = true;
      setDrag(n > 1 ? dx : dx / 4);
    }
  }
  function up() {
    const wasDrag = start.current?.horizontal;
    start.current = null;
    if (!wasDrag) return;
    if (Math.abs(drag) > 70 && n > 1) go(drag < 0 ? 1 : -1);
    else setDrag(0);
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Enter') onOpen(accounts[index].id);
  }

  const visible = Math.min(n, 3);
  return (
    <section className="bank-deck" aria-label="Accounts" aria-roledescription="carousel">
      <div className="bank-stack" style={{ height: `calc(var(--bank-h) + ${(visible - 1) * PEEK}px)` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {accounts.map((a, i) => {
          const pos = (i - index + n) % n;
          const g = accountGradient(a);
          const isFront = pos === 0;
          const fly = flying?.id === a.id;
          let transform = `translateY(${pos * PEEK}px) scale(${1 - pos * 0.05})`;
          if (fly) transform = `translateX(${flying!.dx * 120}%) rotate(${flying!.dx * 8}deg)`;
          else if (isFront && drag) transform = `translateX(${drag}px) rotate(${drag / 22}deg)`;
          const bal = balance(a.id);
          const cats = catCount(a.id);
          return (
            <div
              key={a.id}
              className={'bank-card' + (isFront && drag && !fly ? ' dragging' : '')}
              style={{ background: g.grad, boxShadow: isFront ? `0 18px 32px -16px ${g.shadow}` : 'none', transform, zIndex: fly ? n + 1 : n - pos, opacity: pos < 3 || fly ? 1 : 0 }}
              role={isFront ? 'button' : undefined}
              tabIndex={isFront ? 0 : -1}
              aria-hidden={!isFront}
              aria-label={isFront ? `${accountTitle(a.name)}, open this month` : undefined}
              onClick={() => {
                if (isFront && !moved.current) onOpen(a.id);
              }}
              onKeyDown={isFront ? key : undefined}
            >
              <span className="bc-top">
                <AccountLogo name={a.name} size={36} />
                <b>{accountTitle(a.name)}</b>
                {isFront && (
                  <button
                    type="button"
                    className="hero-eye"
                    aria-label={hide ? 'Show balances' : 'Hide balances'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHide();
                    }}
                  >
                    {hide ? <IconEyeOff /> : <IconEye />}
                  </button>
                )}
              </span>
              <span className="bc-label">Balance</span>
              <span className={'bc-num' + (bal < 0 ? ' neg' : '')}>
                <Num v={bal} />
              </span>
              <span className="bc-foot">
                <span>{cats === 1 ? '1 category' : `${cats} categories`}</span>
                <span>This month ›</span>
              </span>
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <div className="bank-dots" role="tablist" aria-label="Choose account">
          {accounts.map((a, i) => (
            <button key={a.id} type="button" role="tab" aria-selected={i === index} aria-label={accountTitle(a.name)} className={i === index ? 'on' : ''} onClick={() => !flying && onIndex(i)} />
          ))}
        </div>
      )}
    </section>
  );
}
