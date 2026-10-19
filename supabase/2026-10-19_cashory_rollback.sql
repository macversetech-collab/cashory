-- Removes everything 2026-10-19_cashory.sql created. ALL Cashory data in this project is deleted.
drop function if exists public.cashory_ping();
drop table if exists public.cashory_entries;
drop table if exists public.cashory_categories;
drop table if exists public.cashory_accounts;
drop function if exists public.cashory_touch_synced();
