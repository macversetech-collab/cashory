import { useRef, useState } from 'react';
import { parseImport, starterDB, useStore } from '../store';

export function Welcome() {
  const { replace } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  async function onFile(f: File) {
    try {
      replace(parseImport(await f.text()));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="welcome">
      <img src="./icon-192.png" alt="" width="88" height="88" />
      <h1>Cashory</h1>
      <p>Money in and out, by category and by account.</p>
      <button type="button" className="btn primary block" onClick={() => fileRef.current?.click()}>
        Load my data file
      </button>
      <button type="button" className="btn ghost block" onClick={() => replace(starterDB())}>
        Start empty
      </button>
      {error && <p className="warn">{error}</p>}
      <small>
        Your data file is <b>cashory-import.json</b> in the app's <b>data</b> folder. Load it once; after that your data lives in your account.
      </small>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
