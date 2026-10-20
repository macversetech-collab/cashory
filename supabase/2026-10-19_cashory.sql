-- Cashory — Supabase schema (new, separate project)
-- Run once in Supabase → SQL Editor. Safe to run again.
-- Every row belongs to the signed-in user (RLS). The app works offline and syncs:
--   updated_at  = when the row was last changed (set by the app; newest change wins)
--   synced_at   = when the server received it (set here; the app pulls rows newer than its last pull)
--   deleted_at  = tombstone, so a delete on one device reaches the others

create table if not exists public.cashory_accounts (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         text not null,
  name       text not null,
  sort       int  not null default 0,
  archived   boolean not null default false,
  color      text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at  timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.cashory_accounts add column if not exists color text;

create table if not exists public.cashory_categories (
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id               text not null,
  name             text not null,
  account_id       text not null,
  starting_balance bigint not null default 0,
  color            text,
  sort             int  not null default 0,
  archived         boolean not null default false,
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  synced_at        timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.cashory_entries (
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id             text not null,
  date           date not null,
  type           text not null check (type in ('in', 'out', 'move')),
  amount         bigint not null check (amount > 0),
  category_id    text not null,
  account_id     text not null,
  to_category_id text,
  to_account_id  text,
  note           text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  synced_at      timestamptz not null default now(),
  primary key (user_id, id),
  constraint cashory_entries_move_ok check (type <> 'move' or (to_category_id is not null and to_account_id is not null))
);

create index if not exists cashory_accounts_synced_idx   on public.cashory_accounts   (user_id, synced_at);
create index if not exists cashory_categories_synced_idx on public.cashory_categories (user_id, synced_at);
create index if not exists cashory_entries_synced_idx    on public.cashory_entries    (user_id, synced_at);

-- synced_at is always the server's clock, whatever the app sends
create or replace function public.cashory_touch_synced() returns trigger
language plpgsql as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['cashory_accounts', 'cashory_categories', 'cashory_entries'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_synced', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.cashory_touch_synced()', t || '_synced', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_own', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Daily keep-alive from Vercel (see api/keepalive.js): returns the time only, reads no data.
create or replace function public.cashory_ping() returns timestamptz
language sql stable security definer set search_path = '' as $$ select now() $$;
revoke all on function public.cashory_ping() from public;
grant execute on function public.cashory_ping() to anon, authenticated;
