// SEQUENS Lesson Engine -> start a Stripe Checkout (subscription).
// No SDK, no secrets in the repo. Set these in Vercel env:
//   STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
//   STRIPE_TRIAL_DAYS (optional, keep 0 until generation works),
//   SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SITE_URL = process.env.SITE_URL || 'https://sequens.education';
  if (!secret || !SUPABASE_URL) return res.status(500).json({ error: 'Server not configured.' });

  // Identify the caller from their Supabase access token (never trust a client-sent id).
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sign in first.' });

  let user;
  try {
    const ur = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY || '' }
    });
    if (!ur.ok) return res.status(401).json({ error: 'Session invalid.' });
    user = await ur.json();
  } catch (e) { return res.status(401).json({ error: 'Session check failed.' }); }

  const userId = user && user.id;
  const email = user && user.email;
  if (!userId) return res.status(401).json({ error: 'No account.' });

  const plan = (req.body && req.body.plan) === 'annual' ? 'annual' : 'monthly';
  const price = plan === 'annual' ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (!price) return res.status(500).json({ error: 'Price not configured.' });
  const trialDays = parseInt(process.env.STRIPE_TRIAL_DAYS || '0', 10);

  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('line_items[0][price]', price);
  form.set('line_items[0][quantity]', '1');
  form.set('client_reference_id', userId);
  if (email) form.set('customer_email', email);
  form.set('subscription_data[metadata][user_id]', userId);
  if (trialDays > 0) form.set('subscription_data[trial_period_days]', String(trialDays));
  form.set('allow_promotion_codes', 'true');
  form.set('success_url', `${SITE_URL}/app/lesson-engine.html?upgraded=1`);
  form.set('cancel_url', `${SITE_URL}/app/upgrade.html?cancelled=1`);

  try {
    const sr = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const session = await sr.json();
    if (!sr.ok) { console.error('stripe checkout error', session); return res.status(502).json({ error: 'Could not start checkout.' }); }
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('checkout failed', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
