-- =====================================================================
-- SEQUENS LESSON ENGINE - standalone (buy-in) backend
-- Individual teacher accounts, their own data, Stripe entitlement, RLS-isolated.
-- Separate tenancy from the school coaching/tracker side (people, schools).
-- No pupil names: outcomes are coded (Y6D-01 style), the same wall as the school side.
-- Run in Supabase. Idempotent, safe to re-run.
-- =====================================================================

-- 1. PROFILE: one row per individual teacher account
create table if not exists engine_accounts (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

-- 2. SUBSCRIPTION: written ONLY by the Stripe webhook (service role, bypasses RLS).
--    Teachers may read their own row to see their status.
create table if not exists engine_subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text,                          -- 'monthly' | 'annual'
  status                 text not null default 'none',  -- Stripe: trialing, active, past_due, canceled, none
  trial_end              timestamptz,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

-- 3. CURRICULUM MAP: the teacher's own objective map. The engine loads THIS
--    instead of the embedded seed. Same shape as objective-map.json.
create table if not exists engine_maps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'My curriculum',
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists engine_maps_user on engine_maps(user_id);

-- 4. OUTCOMES: coded daily-layer judgements. pupil_code is always a code, never a name.
create table if not exists engine_outcomes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  objective_code text not null,
  pupil_code     text not null,
  judgement      text,                         -- 'met' | 'wt' | 'ny'
  taught         boolean not null default false,
  updated_at     timestamptz not null default now(),
  unique (user_id, objective_code, pupil_code)
);
create index if not exists engine_outcomes_user on engine_outcomes(user_id);

-- 5. LESSONS: saved generated lessons (the library). Paid feature; the generate
--    endpoint checks engine_entitled() before writing here.
create table if not exists engine_lessons (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  objective_code text,
  title          text,
  lesson         jsonb not null,
  created_at     timestamptz not null default now()
);
create index if not exists engine_lessons_user on engine_lessons(user_id);

-- 6. ENTITLEMENT: is the current user on an active or trialing subscription?
create or replace function engine_entitled() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from engine_subscriptions
    where user_id = auth.uid()
      and status in ('trialing','active')
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- 7. ROW LEVEL SECURITY: own-rows-only on every table
alter table engine_accounts      enable row level security;
alter table engine_subscriptions enable row level security;
alter table engine_maps          enable row level security;
alter table engine_outcomes      enable row level security;
alter table engine_lessons       enable row level security;

drop policy if exists eacc_rw on engine_accounts;
create policy eacc_rw on engine_accounts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- subscription: teachers read their own; no client writes (webhook uses the service role)
drop policy if exists esub_read on engine_subscriptions;
create policy esub_read on engine_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists emap_rw on engine_maps;
create policy emap_rw on engine_maps for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists eout_rw on engine_outcomes;
create policy eout_rw on engine_outcomes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists eles_rw on engine_lessons;
create policy eles_rw on engine_lessons for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Supabase default grants (present in a real project; harmless if re-run)
grant usage on schema public to authenticated;
grant all on engine_accounts, engine_subscriptions, engine_maps, engine_outcomes, engine_lessons to authenticated;

-- =====================================================================
-- VERIFY THE WALL IN YOUR OWN PROJECT
-- The SQL editor runs as a superuser and BYPASSES RLS, so to prove the
-- isolation you must impersonate real users. Run each block as ONE block
-- (the identity is transaction-local). Replace the two UUIDs with real
-- auth user ids:  select id, email from auth.users limit 5;
-- This exact pattern was run against Postgres and passed.
-- =====================================================================
--
-- -- Teacher A writes and reads their own:
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"UUID_A"}';
--   insert into engine_maps(user_id,name,data) values ('UUID_A','A curriculum','{"who":"A"}');
--   select count(*) from engine_maps;           -- expect 1
-- commit;
--
-- -- Teacher B sees none of A's, and cannot write as A:
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"UUID_B"}';
--   select count(*) from engine_maps;           -- expect 0
--   insert into engine_maps(user_id,name,data) values ('UUID_A','stolen','{}');  -- expect: RLS error
-- commit;
--
-- -- Entitlement (simulate the webhook as superuser, then check as the user):
-- insert into engine_subscriptions(user_id,plan,status,current_period_end)
--   values ('UUID_A','monthly','trialing', now()+interval '14 days');
-- begin;
--   set local role authenticated; set local request.jwt.claims = '{"sub":"UUID_A"}';
--   select engine_entitled();                   -- expect true
-- commit;
