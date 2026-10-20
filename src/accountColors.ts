import type { Account } from './types';
import { logoSlug } from './components/AccountLogo';

/** Card gradients for accounts: fresh ones first, then the calm ones. White text stays readable on all. */
export const ACCOUNT_GRADIENTS: { id: string; name: string; grad: string; shadow: string }[] = [
  { id: 'ocean', name: 'Ocean', grad: 'linear-gradient(135deg, #22c3e6 0%, #3b82f6 50%, #4f46e5 100%)', shadow: 'rgba(59, 99, 230, 0.5)' },
  { id: 'aurora', name: 'Aurora', grad: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 55%, #9333ea 100%)', shadow: 'rgba(99, 82, 230, 0.5)' },
  { id: 'azure', name: 'Azure', grad: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 45%, #0369a1 100%)', shadow: 'rgba(3, 105, 161, 0.5)' },
  { id: 'mint', name: 'Mint', grad: 'linear-gradient(135deg, #34d399 0%, #10b981 45%, #0f766e 100%)', shadow: 'rgba(15, 118, 110, 0.5)' },
  { id: 'lime', name: 'Lime', grad: 'linear-gradient(135deg, #84cc16 0%, #22c55e 50%, #15803d 100%)', shadow: 'rgba(21, 128, 61, 0.5)' },
  { id: 'sunset', name: 'Sunset', grad: 'linear-gradient(135deg, #fb923c 0%, #f43f5e 55%, #be185d 100%)', shadow: 'rgba(225, 29, 72, 0.5)' },
  { id: 'mango', name: 'Mango', grad: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #dc2626 100%)', shadow: 'rgba(234, 88, 12, 0.5)' },
  { id: 'berry', name: 'Berry', grad: 'linear-gradient(135deg, #f472b6 0%, #db2777 50%, #9d174d 100%)', shadow: 'rgba(190, 24, 93, 0.5)' },
  { id: 'lavender', name: 'Lavender', grad: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 45%, #6d28d9 100%)', shadow: 'rgba(109, 40, 217, 0.5)' },
  { id: 'midnight', name: 'Midnight', grad: 'linear-gradient(135deg, #4f46e5 0%, #312e81 55%, #0f172a 100%)', shadow: 'rgba(30, 27, 75, 0.6)' },
  { id: 'navy', name: 'Navy', grad: 'linear-gradient(140deg, #4166c9 0%, #24499e 52%, #19336f 100%)', shadow: 'rgba(25, 51, 111, 0.55)' },
  { id: 'maroon', name: 'Maroon', grad: 'linear-gradient(140deg, #bc4b55 0%, #922c3d 52%, #611d2c 100%)', shadow: 'rgba(97, 29, 44, 0.55)' },
  { id: 'sky', name: 'Sky', grad: 'linear-gradient(140deg, #4b9bcf 0%, #2d74a8 52%, #1f527c 100%)', shadow: 'rgba(31, 82, 124, 0.55)' },
  { id: 'rose', name: 'Rose', grad: 'linear-gradient(140deg, #c95f83 0%, #a03c63 52%, #6e2847 100%)', shadow: 'rgba(110, 40, 71, 0.55)' },
  { id: 'forest', name: 'Forest', grad: 'linear-gradient(140deg, #5e9160 0%, #357f6f 50%, #24656a 100%)', shadow: 'rgba(36, 101, 106, 0.55)' },
  { id: 'teal', name: 'Teal', grad: 'linear-gradient(140deg, #3f9f9a 0%, #257b80 52%, #1b5a63 100%)', shadow: 'rgba(27, 90, 99, 0.55)' },
  { id: 'violet', name: 'Violet', grad: 'linear-gradient(140deg, #7d6fdb 0%, #5a4bb8 52%, #3b3088 100%)', shadow: 'rgba(59, 48, 136, 0.55)' },
  { id: 'amber', name: 'Amber', grad: 'linear-gradient(140deg, #c79145 0%, #9d6b2b 52%, #6b4920 100%)', shadow: 'rgba(107, 73, 32, 0.55)' },
  { id: 'graphite', name: 'Graphite', grad: 'linear-gradient(140deg, #6b7a90 0%, #4a5568 52%, #2d3748 100%)', shadow: 'rgba(45, 55, 72, 0.55)' },
];

/** Decoration drawn over the gradient. */
export const CARD_PATTERNS: { id: string; name: string }[] = [
  { id: 'rings', name: 'Rings' },
  { id: 'waves', name: 'Waves' },
  { id: 'glow', name: 'Glow' },
  { id: 'lines', name: 'Lines' },
  { id: 'dots', name: 'Dots' },
  { id: 'plain', name: 'Plain' },
];

const DEFAULTS: Record<string, string> = { kbz: 'navy', aya: 'maroon', kpay: 'sky', ayapay: 'rose', cash: 'forest' };

/** The account's chosen gradient, or a sensible one from its name. */
// Stored as "gradient:pattern" in the account's colour field, e.g. "ocean:waves".
export function accountGradient(a: Pick<Account, 'name' | 'color'>) {
  const id = (a.color || '').split(':')[0] || DEFAULTS[logoSlug(a.name)] || 'teal';
  return ACCOUNT_GRADIENTS.find((g) => g.id === id) ?? ACCOUNT_GRADIENTS.find((g) => g.id === 'teal')!;
}

export function accountPattern(a: Pick<Account, 'color'>): string {
  const p = (a.color || '').split(':')[1];
  return CARD_PATTERNS.some((x) => x.id === p) ? p : 'rings';
}

export const packCardStyle = (gradient: string, pattern: string) => `${gradient}:${pattern}`;

/** "KBZ" → "KBZ Bank", "AYA" → "AYA Bank"; wallets and cash keep their name. */
export function accountTitle(name: string): string {
  return ['kbz', 'aya', 'cb', 'yoma', 'agd', 'mab', 'uab'].includes(logoSlug(name)) ? name + ' Bank' : name;
}
