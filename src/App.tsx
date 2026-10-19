import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHideBalances, useStore } from './store';
import { UICtx, type SheetPreset, type ToastMsg, type UI } from './ui';
import { TabBar } from './components/TabBar';
import { EntrySheet } from './components/EntrySheet';
import { Home } from './screens/Home';
import { CategoryScreen } from './screens/CategoryScreen';
import { Reports } from './screens/Reports';
import { Entries } from './screens/Entries';
import { About, SettingsAccounts, SettingsCategories, SettingsData, SettingsHome } from './screens/Settings';
import { EditCategory } from './screens/EditCategory';
import { EditAccount } from './screens/EditAccount';
import { Welcome } from './screens/Welcome';
import { Loading, Login } from './screens/Login';
import { cloudEnabled } from './sync/api';
import { engine } from './sync/engine';
import { useSession, useSyncState } from './sync/hooks';

function readHash() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  return { path: path || '/', query: new URLSearchParams(qs || '') };
}

interface ConfirmState {
  title: string;
  body?: string;
  ok: string;
  danger?: boolean;
  resolve(v: boolean): void;
}

export default function App() {
  const { db, saveError } = useStore();
  const [route, setRoute] = useState(readHash);
  const [hide, toggleHide] = useHideBalances();
  const [sheet, setSheet] = useState<SheetPreset | null>(null);
  const [toastMsg, setToastMsg] = useState<ToastMsg | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const toastTimer = useRef<number>();
  const session = useSession();
  const sync = useSyncState();

  // Start syncing once signed in; sync again when the app comes back, goes online, and every minute.
  useEffect(() => {
    if (!cloudEnabled || !session) return;
    engine.begin(session.user_id);
    void engine.sync();
    const kick = () => {
      if (document.visibilityState === 'visible') void engine.sync();
    };
    const timer = window.setInterval(kick, 60000);
    document.addEventListener('visibilitychange', kick);
    window.addEventListener('online', kick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', kick);
      window.removeEventListener('online', kick);
    };
  }, [session?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = () => {
      try {
        sessionStorage.setItem('cashory.nav', '1');
      } catch {
        /* ignore */
      }
      setRoute(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const toast = useCallback((t: ToastMsg) => {
    setToastMsg(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), t.action ? 6000 : 2600);
  }, []);

  const ui = useMemo<UI>(
    () => ({
      hide,
      toggleHide,
      openSheet: (p) => setSheet(p),
      toast,
      go: (p) => {
        window.location.hash = '#' + p;
      },
      back: (fallback) => {
        let inApp = false;
        try {
          inApp = sessionStorage.getItem('cashory.nav') === '1';
        } catch {
          /* ignore */
        }
        if (inApp && window.history.length > 1) window.history.back();
        else window.location.hash = '#' + fallback;
      },
      confirm: (opts) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    }),
    [hide, toggleHide, toast],
  );

  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  let screen: JSX.Element;
  const { path, query } = route;
  const seg = path.split('/').filter(Boolean);
  let tabs = true;
  let actions: { onOut(): void; onIn(): void; outLabel: string; inLabel: string } | undefined;
  if (cloudEnabled && !session) {
    screen = <Login />;
    tabs = false;
  } else if (!db && cloudEnabled && !sync.ready) {
    screen =
      sync.status === 'offline' || sync.status === 'error' ? (
        <Loading message={sync.status === 'offline' ? 'Connect to the internet to load your data the first time.' : sync.error || 'Could not load your data.'} onRetry={() => void engine.sync()} />
      ) : (
        <Loading message="Loading your data…" />
      );
    tabs = false;
  } else if (!db) {
    screen = <Welcome />;
    tabs = false;
  } else if (seg[0] === 'c' && seg[1]) {
    const cat = db.categories.find((c) => c.id === seg[1]);
    screen = <CategoryScreen key={seg[1]} id={seg[1]} />;
    if (cat && !cat.archived)
      actions = {
        onOut: () => setSheet({ type: 'out', categoryId: cat.id }),
        onIn: () => setSheet({ type: 'in', categoryId: cat.id }),
        outLabel: `Money out of ${cat.name}`,
        inLabel: `Money into ${cat.name}`,
      };
  } else if (seg[0] === 'reports') screen = <Reports query={query} />;
  else if (seg[0] === 'entries') screen = <Entries key={query.toString()} query={query} />;
  else if (seg[0] === 'settings') {
    tabs = false;
    if (seg[1] === 'c' && seg[2]) screen = <EditCategory key={seg[2]} id={seg[2]} />;
    else if (seg[1] === 'a' && seg[2]) screen = <EditAccount key={seg[2]} id={seg[2]} />;
    else if (seg[1] === 'accounts') screen = <SettingsAccounts />;
    else if (seg[1] === 'categories') screen = <SettingsCategories />;
    else if (seg[1] === 'data') screen = <SettingsData />;
    else if (seg[1] === 'about') screen = <About />;
    else screen = <SettingsHome />;
  } else {
    screen = <Home />;
    actions = { onOut: () => setSheet({ type: 'out' }), onIn: () => setSheet({ type: 'in' }), outLabel: 'Money out', inLabel: 'Money in' };
  }

  return (
    <UICtx.Provider value={ui}>
      <div className="app">
        {saveError && <div className="save-error">Couldn't save on this device. Storage may be full or blocked — export a backup.</div>}
        {screen}
        {tabs && db && <TabBar current={path} actions={actions} />}
        {sheet && db && <EntrySheet key={sheet.entryId ?? 'new'} db={db} preset={sheet} onClose={() => setSheet(null)} />}
        {toastMsg && (
          <div className={'toast' + (tabs ? '' : ' low')} role="status">
            <span>{toastMsg.text}</span>
            {toastMsg.action && (
              <button
                type="button"
                onClick={() => {
                  toastMsg.action!.run();
                  setToastMsg(null);
                }}
              >
                {toastMsg.action.label}
              </button>
            )}
          </div>
        )}
        {confirmState && (
          <div className="sheet-backdrop center" onClick={() => closeConfirm(false)}>
            <div className="dialog" role="alertdialog" aria-modal="true" aria-label={confirmState.title} onClick={(e) => e.stopPropagation()}>
              <h2>{confirmState.title}</h2>
              {confirmState.body && <p>{confirmState.body}</p>}
              <div className="dialog-btns">
                <button type="button" onClick={() => closeConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className={confirmState.danger ? 'danger' : 'strong'} onClick={() => closeConfirm(true)} autoFocus>
                  {confirmState.ok}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UICtx.Provider>
  );
}
