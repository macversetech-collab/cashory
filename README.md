# Cashory

Personal money tracker: money in and out by category (Showline, Birthday Cake, Fund …),
each category living in one account (KBZ, AYA, KPay, AYA Pay, Cash).
Works offline on the phone and syncs through Supabase.

## Go live — one time

### 1. Supabase (new project)

1. supabase.com → **New project** → name `cashory`, region **Singapore**, save the database password.
2. **SQL Editor** → paste all of `supabase/2026-10-19_cashory.sql` → **Run**.
3. **Authentication → Users → Add user → Create new user**: your email + a password, tick **Auto Confirm User**.
4. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up"
   (only you can use it; everyone else just sees the sign-in page).
5. **Project Settings → API**: copy the **Project URL** and the **publishable (anon) key**.

### 2. Run it on the Mac with the cloud

```bash
cd "/Users/aungthuhtet/Downloads/application TEST/Cashory"
cp .env.example .env.local      # then paste the two values into .env.local
npm install
npm run dev
```

Sign in → **Load my data file** → pick `data/cashory-import.json`. The 602 entries go up to Supabase
(Settings → Data & backup shows "Synced").

### 3. GitHub + Vercel (like Proflo)

1. github.com → **New repository** → `cashory`, **Private**, no README.
2. On the Mac:
   ```bash
   cd "/Users/aungthuhtet/Downloads/application TEST/Cashory"
   git init && git add -A && git commit -m "Cashory v0.3"
   git branch -M main
   git remote add origin https://github.com/<your-user>/cashory.git
   git push -u origin main
   ```
   `data/`, `*.numbers`, `design/` and `.env.local` are in `.gitignore`, so your money data and keys never go to GitHub.
3. vercel.com → **Add New → Project** → import `cashory` → **Environment Variables**:
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (same values as `.env.local`) → **Deploy**.
4. Optional: Project → Settings → Domains → e.g. `cashory.flovaone.com`.

### 4. iPhone

Open the Vercel address in **Safari** → sign in → your data loads → **Share → Add to Home Screen**.
After the first load it opens offline too; changes made offline sync when the phone is online again.

## How sync works

- Every change is saved on the device first, then sent to Supabase (status under the date on Home).
- Other devices pick changes up when the app opens, comes back to the front, goes online, and every minute.
- If the same entry is changed on two devices, the later change wins.
- Deleting an entry or category reaches the other devices too.
- Rows are private to your login (row level security). The publishable key in the app is meant to be public.
- Supabase free projects pause after a week without use; `api/keepalive.js` (a daily Vercel cron) prevents that.

## Account logos

Logos live in `public/logos/`, named after the account in lower case without spaces:
`kbz.png`, `aya.png`, `kpay.png`, `ayapay.png`, `cash.png` (.png/.jpg/.webp/.svg). Without a file the
app shows initials. Originals are kept in `design/logos-original/` (not deployed).

## Your data file

- `data/cashory-import.json` — made from `💵 Bank Statement.numbers` (602 entries);
  every category balance and both bank totals match the sheet.
- Rebuild it after changing the sheet:
  ```bash
  pip3 install numbers-parser
  python3 tools/import_numbers.py "💵 Bank Statement.numbers" data/cashory-import.json
  ```
  It stops without writing if any total does not match the sheet.

## How the numbers work

- Category balance = starting balance + In − Out ± Move.
- Account balance = starting balances of its categories + every entry booked to that account.
- **Move** (⇄) shifts money between categories; it is not counted as In or Out in reports.

## Checks

```bash
npm test        # calculations, real data file, sync merge rules
npm run build   # type-check + production build into dist/
```

Database undo: `supabase/2026-10-19_cashory_rollback.sql` removes the Cashory tables (and their data).
