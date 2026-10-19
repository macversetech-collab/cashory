import { useSyncExternalStore } from 'react';
import { getSession, onSessionChange, type Session } from './api';
import { engine, type SyncState } from './engine';

export function useSession(): Session | null {
  return useSyncExternalStore(onSessionChange, getSession);
}

export function useSyncState(): SyncState {
  return useSyncExternalStore((fn) => engine.subscribe(fn), engine.getState);
}

function ago(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

/** Short status for the top bar, e.g. "Synced just now", "Offline · 2 waiting". */
export function syncLabel(s: SyncState): { text: string; tone: 'ok' | 'busy' | 'warn' | 'off' } {
  if (s.status === 'off') return { text: 'On this device only', tone: 'off' };
  if (s.status === 'syncing') return { text: 'Syncing…', tone: 'busy' };
  if (s.status === 'offline') return { text: s.pending ? `Offline · ${s.pending} waiting` : 'Offline', tone: 'warn' };
  if (s.status === 'error') return { text: 'Sync problem · tap to retry', tone: 'warn' };
  if (s.pending) return { text: `${s.pending} waiting to sync`, tone: 'busy' };
  return { text: s.lastSyncAt ? `Synced ${ago(s.lastSyncAt)}` : 'Synced', tone: 'ok' };
}
