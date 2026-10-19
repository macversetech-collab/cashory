import { useState, type FormEvent } from 'react';
import { signIn } from '../sync/api';
import { BUILD_LINE } from '../build';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <img src="./icon-192.png" alt="" width="76" height="76" />
        <h1>Cashory</h1>
        <p className="login-sub">Sign in to see your money on every device.</p>
        {error && <p className="login-msg">{error}</p>}
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" className="btn primary block" disabled={busy || !email.trim() || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="login-foot">Stays signed in on this device.</p>
      </form>
      <p className="build-line">{BUILD_LINE}</p>
    </div>
  );
}

export function Loading({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="login">
      <div className="login-card center">
        <img src="./icon-192.png" alt="" width="64" height="64" />
        <p className="login-sub">{message}</p>
        {onRetry && (
          <button type="button" className="btn ghost block" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
