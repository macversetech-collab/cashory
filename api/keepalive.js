// Daily keep-alive (Vercel Cron, see vercel.json): one tiny database call so the Supabase
// free project never pauses for being "inactive". cashory_ping() only returns the time.
export default async function handler(req, res) {
  const url = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.VITE_SUPABASE_KEY || '';
  if (!url || !key) return res.status(500).json({ ok: false, error: 'Supabase env vars missing' });
  try {
    const r = await fetch(`${url}/rest/v1/rpc/cashory_ping`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: '{}',
    });
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e) });
  }
}
