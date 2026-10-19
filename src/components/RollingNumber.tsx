import { useEffect, useState } from 'react';
import { money, signed } from '../format';
import { useUI } from '../ui';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Odometer-style text: every digit is a 0–9 strip that rolls to its value.
 * Rolls up from 0 when it first appears and to the new digit whenever the number changes.
 */
export function Rolling({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const chars = text.split('');
  return (
    <span className="roll">
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const fromRight = chars.length - i; // keyed from the right so ones stay ones when the length changes
        if (!/\d/.test(ch)) {
          return (
            <span key={'s' + fromRight} className="roll-sym" aria-hidden="true">
              {ch}
            </span>
          );
        }
        const d = shown ? Number(ch) : 0;
        return (
          <span key={'d' + fromRight} className="roll-col" aria-hidden="true">
            <span className="roll-strip" style={{ transform: `translateY(${-d * 10}%)`, transitionDelay: `${Math.min(fromRight, 12) * 25}ms` }}>
              {DIGITS.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** A kyat amount that rolls, respecting "hide balances". */
export function Num({ v, sign }: { v: number; sign?: boolean }) {
  const { hide } = useUI();
  if (hide) return <>•••••</>;
  return <Rolling text={sign ? signed(v) : money(v)} />;
}
