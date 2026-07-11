// SEQUENS waiting list -> MailerLite
// Runs on Vercel. The API key lives in an environment variable, never in the page.

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, group } = req.body || {};

  // Basic validation
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  // Map the page's group name to the MailerLite group ID.
  // These IDs are set in Vercel environment variables.
  const GROUPS = {
    coaching: process.env.ML_GROUP_COACHING,
    teacher: process.env.ML_GROUP_TEACHER,
    home: process.env.ML_GROUP_HOME,
  };

  const groupId = GROUPS[group];
  const apiKey = process.env.MAILERLITE_API_KEY;

  if (!apiKey) {
    console.error('MAILERLITE_API_KEY is not set');
    return res.status(500).json({ error: 'Server not configured.' });
  }

  // Fail loudly rather than silently filing someone into the wrong group.
  if (!groupId) {
    console.error(`No group ID configured for "${group}". Check the ML_GROUP_* environment variables in Vercel.`);
    return res.status(500).json({ error: 'Server not configured for this list.' });
  }

  try {
    const payload = {
      email: email.trim().toLowerCase(),
      status: 'active',
    };
    payload.groups = [groupId];

    const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('MailerLite error', r.status, detail);
      // Don't leak internals to the visitor
      return res.status(502).json({ error: 'Could not add you just now. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe failed', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
