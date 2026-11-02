# SEQUENS Lesson Engine · buy-in stack · switch-on runbook

What this adds: individual teachers sign up, pay by Stripe subscription, and get
their own data walled from every other teacher. Separate from the school side.

## Files in this drop
- `sql/engine-saas-backend.sql`  · per-user tables, entitlement, row-level security. Tested against Postgres: the wall and the gate both hold.
- `api/create-checkout.js`       · starts a Stripe Checkout session for the signed-in teacher.
- `api/stripe-webhook.js`        · verifies Stripe's signature (unit-tested) and writes the subscription.
- `app/signup.html`              · self-serve account creation.
- `app/upgrade.html`             · monthly / annual pricing, sends to checkout.

## What is already tested, and what only you can test
Tested here: the database isolation (teacher A cannot see or write teacher B's data),
the entitlement gate (active/trialing = on, cancelled = off), and the webhook signature
check (valid accepted, tampered/wrong-secret/garbage rejected).
Only you can test, because they need your live accounts: a real Stripe checkout, a real
webhook delivery, and re-proving the RLS in your own Supabase.

## Switch-on order

### 1. Supabase
Paste `sql/engine-saas-backend.sql` into the SQL editor and run it. Then run the
verification block at the bottom of that file with two real auth user ids to see the
wall hold in your own project (the editor bypasses RLS, so the impersonation block is
how you prove it).

### 2. Stripe (test mode first)
- Create one Product, "SEQUENS Lesson Engine".
- Add two recurring Prices on it: one monthly, one annual. Copy both price IDs (price_...).
- Developers > Webhooks > Add endpoint: URL `https://sequens.education/api/stripe-webhook`,
  events: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`. Copy the signing secret (whsec_...).

### 3. Vercel environment variables
```
STRIPE_SECRET_KEY            = sk_test_...   (then sk_live_... when ready)
STRIPE_WEBHOOK_SECRET        = whsec_...
STRIPE_PRICE_MONTHLY         = price_...     (your monthly price id)
STRIPE_PRICE_ANNUAL          = price_...     (your annual price id)
STRIPE_TRIAL_DAYS            = 0             (leave 0 until generation works, then set it)
SUPABASE_URL                 = https://ezilsbplvmuomdrkzdsh.supabase.co
SUPABASE_ANON_KEY            = sb_publishable_i4Mc6yA4b3a-e6TYRWd-xQ__7pA2A8x
SUPABASE_SERVICE_ROLE_KEY    = (Supabase > Settings > API > service_role. NEVER put this in the repo.)
SITE_URL                     = https://sequens.education
```

### 4. Test the money path (Stripe test mode)
Create an account at `/app/signup.html`, go to `/app/upgrade.html`, choose a plan,
pay with Stripe's test card `4242 4242 4242 4242`, any future date, any CVC. Then check
Supabase: `engine_subscriptions` has a row for that user with status `active` (or
`trialing` if you set trial days), and `engine_entitled()` returns true for them.

### 5. Trial timing
Keep `STRIPE_TRIAL_DAYS = 0` until lesson generation actually works (the 30 August key
and the stress-test). Starting trials before the engine can generate burns them on a
product that cannot yet do its main job. Set the trial length the day generation is live.

## The tenant-engine cutover (do this LAST, on a copy)
Your working `app/lesson-engine.html` carries one embedded seed, your Y6D class. Do not
touch it. It is your September tool and it works.

To make a buyable version, copy it to `app/lesson-engine-cloud.html` and change one thing:
replace the embedded `const DATA = {...}` with a load of the signed-in teacher's own map.
The shape:

```
// require a session, else send to signup
const {data:{session}} = await sb.auth.getSession();
if(!session){ location.href='/app/signup.html'; }
// their profile + their map
await sb.from('engine_accounts').upsert({user_id:session.user.id,email:session.user.email},{onConflict:'user_id'});
const {data:rows} = await sb.from('engine_maps').select('data').eq('user_id',session.user.id).limit(1);
const DATA = rows && rows.length ? rows[0].data : null;   // null = show "set up your curriculum"
// entitlement gates generation only
const {data:sub} = await sb.from('engine_subscriptions').select('status').eq('user_id',session.user.id).maybeSingle();
const entitled = sub && ['trialing','active'].includes(sub.status);
```

Everything else in the engine already reads `DATA`, so once it is loaded the rest runs
unchanged. Gate the Generate button on `entitled`. Seed a teacher's first map by inserting
their `objective-map.json` into `engine_maps` (as that user), or build the upload path.

This step must be tested live, signed in as two different teachers, before you sell it.
That is the one thing I could not test from here, and I will not pretend otherwise.
