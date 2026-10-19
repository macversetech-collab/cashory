import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

/** The commit being built: Vercel gives it as an env var; locally ask git. */
function buildSha(): string {
  const env = process.env.VERCEL_GIT_COMMIT_SHA;
  if (env) return env.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'local';
  } catch {
    return 'local';
  }
}

/** Build time in Myanmar time, e.g. "19 Oct 2026 19:05". */
function buildTime(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Yangon', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.day} ${p.month} ${p.year} ${p.hour}:${p.minute}`;
}

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha()),
    __BUILD_TIME__: JSON.stringify(buildTime()),
  },
});
