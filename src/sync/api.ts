// Tiny Supabase client (auth + REST) — no SDK, so the app stays small and fast (same approach as Proflo).
// The publishable key is public by design; every row is protected by sign-in + row level security.

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '');
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
export const cloudEnabled = !!(SUPABASE_URL && KEY);

const SESSION_KEY = 'cashory.session';
const TIMEOUT_MS = 20000;

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // seconds
  user_id: string;
  email: string;
}

export class ApiError extends Error {
  status: number;
  offline: boolean;
  constructor(message: string, opts: { status?: number; offline?: boolean } = {}) {
    super(message);
    this.status = opts.status ?? 0;
    this.offline = opts.offline ?? false;
  }
}

// ---------------------------------------------------------------- session

let session: Session | null = readSession();
const listeners = new Set<(s: Session | null) => void>();

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: session lives in memory only */
  }
  listeners.forEach((fn) => fn(s));
}

export const getSession = () => session;
export function onSessionChange(fn: (s: Session | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSession(data: any): Session {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user_id: data.user?.id || session?.user_id || '',
    email: data.user?.email || session?.email || '',
  };
}

// ---------------------------------------------------------------- fetch

async function request(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response> {
  if (!SUPABASE_URL || !KEY) throw new ApiError('Cloud is not set up');
  const headers = new Headers(init.headers);
  headers.set('apikey', KEY);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (init.auth !== false && session) headers.set('Authorization', `Bearer ${session.access_token}`);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(SUPABASE_URL + path, { ...init, headers, signal: ctl.signal });
  } catch {
    throw new ApiError(navigator.onLine === false ? 'You are offline' : 'Could not reach the server', { offline: true });
  } finally {
    clearTimeout(timer);
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  let msg = `Server error ${res.status}`;
  try {
    const j = await res.json();
    msg = j.error_description || j.msg || j.message || j.error || msg;
  } catch {
    /* not JSON */
  }
  return new ApiError(msg, { status: res.status });
}

// ---------------------------------------------------------------- auth

export async function signIn(email: string, password: string): Promise<Session> {
  const res = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!res.ok) {
    const e = await errorFrom(res);
    if (res.status === 400) e.message = 'Wrong email or password';
    throw e;
  }
  const s = toSession(await res.json());
  writeSession(s);
  return s;
}

let refreshing: Promise<Session | null> | null = null;

async function refresh(): Promise<Session | null> {
  if (!session) return null;
  if (!refreshing) {
    refreshing = (async () => {
      const res = await request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ refresh_token: session!.refresh_token }),
      });
      if (res.ok) {
        const s = toSession(await res.json());
        writeSession(s);
        return s;
      }
      // Refresh token no longer valid: the person has to sign in again.
      if (res.status === 400 || res.status === 401) writeSession(null);
      throw await errorFrom(res);
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function signOut() {
  const s = session;
  writeSession(null);
  if (s) {
    try {
      await request('/auth/v1/logout', { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}` }, auth: false });
    } catch {
      /* already signed out locally */
    }
  }
}

/** REST call with a fresh token; retries once after a refresh on 401. */
export async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  if (!session) throw new ApiError('Not signed in', { status: 401 });
  if (session.expires_at - Date.now() / 1000 < 90) await refresh();
  let res = await request('/rest/v1' + path, init);
  if (res.status === 401) {
    await refresh();
    res = await request('/rest/v1' + path, init);
  }
  if (!res.ok) throw await errorFrom(res);
  return res;
}
