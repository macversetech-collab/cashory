-- Cashory: card colour for each account (Home bank cards). Safe to run more than once.
alter table public.cashory_accounts add column if not exists color text;
notify pgrst, 'reload schema';
