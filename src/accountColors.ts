import type { Account } from './types';
import { logoSlug } from './components/AccountLogo';

/** Card gradients for accounts. Deep and calm, never neon. */
export const ACCOUNT_GRADIENTS: { id: string; name: string; grad: string; shadow: string }[] = [
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

const DEFAULTS: Record<string, string> = { kbz: 'navy', aya: 'maroon', kpay: 'sky', ayapay: 'rose', cash: 'forest' };

/** The account's chosen gradient, or a sensible one from its name. */
export function accountGradient(a: Pick<Account, 'name' | 'color'>) {
  const id = a.color || DEFAULTS[logoSlug(a.name)] || 'teal';
  return ACCOUNT_GRADIENTS.find((g) => g.id === id) ?? ACCOUNT_GRADIENTS[5];
}

/** "KBZ" → "KBZ Bank", "AYA" → "AYA Bank"; wallets and cash keep their name. */
export function accountTitle(name: string): string {
  return ['kbz', 'aya', 'cb', 'yoma', 'agd', 'mab', 'uab'].includes(logoSlug(name)) ? name + ' Bank' : name;
}
