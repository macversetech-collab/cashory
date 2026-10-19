import { IconChart, IconHome, IconList, IconMinus, IconPlus } from './Icons';

const TABS = [
  { path: '/', label: 'Home', Icon: IconHome },
  { path: '/reports', label: 'Reports', Icon: IconChart },
  { path: '/entries', label: 'Entries', Icon: IconList },
];

export function tabIndex(path: string): number {
  if (path.startsWith('/reports')) return 1;
  if (path.startsWith('/entries')) return 2;
  return 0;
}

interface Props {
  current: string;
  /** Shown on Home (and a category page): − Out and + In pills. */
  actions?: { onOut(): void; onIn(): void; outLabel: string; inLabel: string };
}

/** Floating Liquid Glass bar: icon-only tabs with a sliding lens, plus glowing −/+ pills on Home. */
export function TabBar({ current, actions }: Props) {
  const idx = tabIndex(current);
  return (
    <>
      <div className="tabbar-fade" aria-hidden="true" />
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-row">
          <div className="glass tabs">
            <span className="lens" style={{ transform: `translateX(${idx * 100}%)`, width: `calc((100% - 8px) / ${TABS.length})` }} />
            {TABS.map(({ path, label, Icon }, i) => (
              <a key={path} href={'#' + path} className={'tab' + (i === idx ? ' on' : '')} aria-label={label} aria-current={i === idx ? 'page' : undefined}>
                <Icon filled={i === idx} strokeWidth={i === idx ? 2.2 : 1.9} />
              </a>
            ))}
          </div>
          {actions && (
            <div className="pills">
              <button type="button" className="pill-btn out" onClick={actions.onOut} aria-label={actions.outLabel}>
                <IconMinus />
              </button>
              <button type="button" className="pill-btn in" onClick={actions.onIn} aria-label={actions.inLabel}>
                <IconPlus />
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
