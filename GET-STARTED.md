# SEQUENS - get it running, step by step

Four phases, in order. Do Phase A now. Phase B when you want generation. Phase C only when
you sell the buy-in product. Phase D before any real pupil name goes in.

Project: Supabase `ezilsbplvmuomdrkzdsh`. Site: sequens.education. Host: Vercel.

=====================================================================
PHASE A - LIVE AND USABLE (do now)
=====================================================================

1. GitHub. Open your `sequens-main` repo. Upload the contents of
   `sequens-main-FULL.zip` (the files at the top level, not a nested folder), replacing
   what's there, and commit. The host redeploys on push. Wait a minute.

2. Supabase objectives (once). SQL editor, paste all of `tracker-feed.sql`, run. You get
   "success, no rows returned". Only re-run this if your objectives change, not for engine
   updates. (You have already done this.)

3. Supabase login settings (once). Authentication > URL Configuration. Site URL =
   `https://sequens.education`. Redirect URLs, add `https://sequens.education/**`. Save.
   This is what stopped the localhost login error. (You have already done this.)

4. Log in. Go to `sequens.education/app`. Use email and PASSWORD (the passwords you set on
   the test accounts in the dashboard), not the email-code option. Password login avoids
   the magic-link expiry entirely.

5. Upload your classes. Class data screen. Upload your year-group sheet with a class
   column. It splits into 6A to 6D, codes each class, and bands each GL score 1 to 5 on the
   school boundaries, all on your device. Keep UPN in the sheet if you can; it is the
   reliable key for matching pupils across assessment points.

At this point the tracker, progress, reports, map, library, pacing and writing sheets all
work. Note: data lives in the browser session until Phase D wires persistence.

=====================================================================
PHASE B - THE API KEY AND GENERATION (when you want lessons generated)
=====================================================================

The API is a SEPARATE product from the Claude chat app. Same login identity, different
site. Paying for chat does not enable the API.

1. Console. Go to console.anthropic.com and sign in with your usual identity.

2. Billing FIRST. Billing section, add a payment method or credit. Without billing set up,
   any key errors with a quota message. This step is what actually enables generation.

3. Spend cap. Set a monthly usage limit in the console. A cap means a bug or a long test
   costs pennies, not your month.

4. Create the key. API keys > Create key, name it "sequens-generation", create, and copy
   it now, it is shown once. It starts `sk-ant-`.

5. Put it in Vercel, never in the repo. Vercel > your project > Settings > Environment
   Variables. Add `ANTHROPIC_API_KEY` = the key. It is read only by a serverless function
   in /api, never by the page. A key in front-end code can be stolen and spent.

6. Tell me it is in. I build the generation endpoint against the locked specs (spine, maths
   spec, writing spec, values spec).

7. Stress-test, the real gate. We generate a batch across your real objectives and check
   every one against the specs: spine intact, three steps hit by the exit, one named hinge,
   White Rose order held, lenses named, values only where they fit, nothing vague, nothing
   reproduced from a scheme. Reliably, not once.

8. Only then switch generation on for your class. And set the free-trial days (Phase C)
   only after this passes, or you start trials on an unproven generator.

=====================================================================
PHASE C - THE BUY-IN PRODUCT (only when you sell to others)
=====================================================================

1. Supabase. SQL editor, paste and run `engine-saas-backend.sql`. Then run the
   verification block at its foot with two real user ids to see the wall hold.

2. Stripe. Create one product "SEQUENS Lesson Engine" with two recurring prices, monthly
   and annual. Copy both price ids. Developers > Webhooks > add endpoint
   `https://sequens.education/api/stripe-webhook` for events checkout.session.completed,
   customer.subscription.updated, customer.subscription.deleted. Copy the signing secret.

3. Vercel env vars:
   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
   STRIPE_TRIAL_DAYS (0 until generation is proven), SUPABASE_URL, SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY (service role, Vercel only, never the repo), SITE_URL.

4. Test the money path in Stripe test mode with card 4242 4242 4242 4242, then confirm an
   engine_subscriptions row appears and engine_entitled() reads true.

=====================================================================
PHASE D - BEFORE REAL PUPIL NAMES
=====================================================================

1. ICO registration. Legally required before real named pupils enter the tracker. Coded
   (Y6D-01) is fine until then.

2. Roll the exposed service key in Supabase, Settings, API. The front end uses only the
   publishable key, so nothing breaks.

3. Database cutover. Wire the engine to read and write the per-user tables instead of
   browser memory, so uploads, marks and assessment points persist across reloads and
   devices. This is the build that makes everything remembered. Ask me when ready; it is
   done on a copy so your working class tool is never at risk.

=====================================================================
WHAT IS LIVE VS WAITING
=====================================================================

Live now: the site, login, class upload with banding, the map, library, pacing, writing
sheets, daily five-point tracking, progress over time, per-pupil reports, editable
settings (scale, boundaries, values, vision, mission).

Waiting on the API key + stress-test: lesson generation, the morning board, comprehension
and its marking screen, the SpaG starter, the aimed catch-up advice.

Waiting on the database cutover: everything you enter being saved rather than session-only.

Waiting on you: ICO before real names; your own-plans upload (English novels term by term,
your adapted Write Stuff scheme); your book list for the library.
