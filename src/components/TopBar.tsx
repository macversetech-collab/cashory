import type { ReactNode } from 'react';
import { IconBack } from './Icons';

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** "#/path" to show a back button instead of the logo. */
  back?: string;
  backLabel?: string;
  logo?: boolean;
  right?: ReactNode;
}

/** Sticky blurred top bar (Proflo style). */
export function TopBar({ title, subtitle, back, backLabel, logo, right }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-in">
        {back && (
          <a href={back} className="icon-btn" aria-label={backLabel ?? 'Back'}>
            <IconBack />
          </a>
        )}
        {logo && <img className="logo" src="./logo-mark.png" alt="" width="38" height="38" />}
        <div className="topbar-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
