// SEQUENS Lesson Engine -> Stripe webhook. Verifies the signature, then writes
// the subscription to engine_subscriptions using the Supabase service role.
// Set in Vercel env: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// NOTE: the webhook needs the RAW request body to verify the signature.
import crypto from 'node:crypto';

export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let d = ''; req.on('data', c => (d += c)); req.on('end', () => resolve(d)); req.on('error', reject);
  });
}

export function verifySignature(raw, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = {};
  sigHeader.split(',').forEach(kv => { const [k, v] = kv.split('='); parts[k] = v; });
  const t = parts.t;
  if (!t) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  const provided = sigHeader.split(',').filter(s => s.startsWith('v1=')).map(s => s.slice(3));
  return provided.some(p => {
    try { return crypto.timingSafeEqual(Buffer.from(p), Buffer.from(expected)); } catch { return false; }
  });
}

async function upsertSub(sub, userId) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const interval = sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price
    && sub.items.data[0].price.recurring && sub.items.data[0].price.recurring.interval;
  const row = {
    user_id: userId,
    stripe_customer_id: sub.customer || null,
    stripe_subscription_id: sub.id || null,
    plan: interval === 'year' ? 'annual' : 'monthly',
    status: sub.status || 'none',
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  };
  await fetch(`${SUPABASE_URL}/rest/v1/engine_subscriptions?on_conflict=user_id`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(row)
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await readRaw(req);
  const sig = req.headers['stripe-signature'] || '';
  if (!secret || !verifySignature(raw, sig, secret)) return res.status(400).json({ error: 'bad signature' });

  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).end(); }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const userId = s.client_reference_id || (s.metadata && s.metadata.user_id);
      if (s.subscription && userId) {
        const sr = await fetch(`https://api.stripe.com/v1/subscriptions/${s.subscription}`, {
          headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
        });
        const sub = await sr.json();
        await upsertSub(sub, userId);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const userId = sub.metadata && sub.metadata.user_id;
      if (userId) await upsertSub(sub, userId);
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('webhook handler error', err);
    return res.status(500).end();
  }
}
