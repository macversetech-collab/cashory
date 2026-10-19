import { useState } from 'react';

/** File name the app looks for in public/logos/ — "AYA Pay" → "ayapay". */
export function logoSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const EXTS = ['png', 'jpg', 'webp', 'svg'];

const TONES: Record<string, string> = { kbz: 'blue', aya: 'red', kpay: 'sky', ayapay: 'rose', cash: 'green' };

/** Brand colour class for an account's tag ("tone-blue" for KBZ, "tone-red" for AYA …). */
export function accountTone(name: string | undefined): string {
  const t = name ? TONES[logoSlug(name)] : undefined;
  return t ? 'tone-' + t : '';
}

/** Shows public/logos/<slug>.png (or .jpg/.webp/.svg). Falls back to initials when no file exists. */
export function AccountLogo({ name, size = 40 }: { name: string; size?: number }) {
  const [i, setI] = useState(0);
  const slug = logoSlug(name);
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.3) };
  if (i >= EXTS.length || !slug) {
    return (
      <span className="acc-logo initials" style={{ ...style, fontSize: Math.round(size * 0.32) }} aria-hidden="true">
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <img className="acc-logo" style={style} src={`./logos/${slug}.${EXTS[i]}`} alt="" onError={() => setI((n) => n + 1)} />;
}
