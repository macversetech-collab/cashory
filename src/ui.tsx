import { createContext, useContext } from 'react';
import type { EntryType } from './types';
import { money } from './format';

export interface SheetPreset {
  type?: EntryType;
  categoryId?: string;
  entryId?: string; // edit an existing entry
}

export interface ToastMsg {
  text: string;
  action?: { label: string; run: () => void };
}

export interface UI {
  hide: boolean;
  toggleHide(): void;
  openSheet(p: SheetPreset): void;
  toast(t: ToastMsg): void;
  go(path: string): void;
  /** Go back in history, or to `fallback` when there is nothing to go back to. */
  back(fallback: string): void;
  confirm(opts: { title: string; body?: string; ok: string; danger?: boolean }): Promise<boolean>;
}

export const UICtx = createContext<UI | null>(null);

export function useUI(): UI {
  const u = useContext(UICtx);
  if (!u) throw new Error('UI missing');
  return u;
}

/** Amount text that respects "hide balances". */
export function useMoney() {
  const { hide } = useUI();
  return (n: number) => (hide ? '•••••' : money(n));
}
