// SEQUENS staff activation emails -> Resend
// Runs on Vercel. The Resend API key lives in an environment variable, never in the page.
//
// The admin screen calls this AFTER writing invitation rows to the database.
// This function only sends the "set your password" email. It does not create
// accounts and holds no database credentials, so even if it were abused the
// worst it could do is send an email telling someone to visit the sign-in page.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const FROM   = process.env.SEQUENS_FROM || 'SEQUENS <activate@send.sequens.education>';
  const SIGNIN = process.env.SEQUENS_SIGNIN_URL || 'https://sequens.education/sequens-signin.html';

  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(503).json({ error: 'not_configured' });
  }

  const { people, schoolName } = req.body || {};

  if (!Array.isArray(people) || people.length === 0) {
    return res.status(400).json({ error: 'No people to email.' });
  }
  if (people.length > 200) {
    return res.status(400).json({ error: 'Too many at once. Send 200 or fewer per batch.' });
  }

  const school = (typeof schoolName === 'string' && schoolName.trim()) || 'your school';
  const activateUrl = SIGNIN + '#signup';

  // Send one at a time so one bad address does not sink the whole batch,
  // and so we can report exactly who did and did not get through.
  const sent = [];
  const failed = [];

  for (const p of people) {
    const email = (p && typeof p.email === 'string') ? p.email.trim().toLowerCase() : '';
    const name  = (p && typeof p.name === 'string' && p.name.trim()) ? p.name.trim() : 'there';

    if (!email || !email.includes('@')) {
      failed.push({ email: email || '(missing)', reason: 'invalid address' });
      continue;
    }

    const subject = `Activate your SEQUENS account`;

    const text =
`Hi ${name},

${school} has set up a SEQUENS account for you.

To finish, choose a password:
${activateUrl}

Use this email address (${email}) when you activate. Your role has already been
set for you, so there is nothing to fill in beyond a password.

If you were not expecting this, you can ignore it. Nothing happens until you set
a password.

SEQUENS`;

    const html = activationHtml({ name, school, email, activateUrl });

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject,
          text,
          html,
        }),
      });

      if (!r.ok) {
        const detail = await r.text();
        console.error('Resend error', r.status, detail);
        failed.push({ email, reason: 'send failed' });
      } else {
        sent.push(email);
      }
    } catch (err) {
      console.error('send threw', err);
      failed.push({ email, reason: 'send failed' });
    }
  }

  return res.status(200).json({ ok: true, sent, failed });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function activationHtml({ name, school, email, activateUrl }) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#F2F7F9;font-family:'Segoe UI',system-ui,sans-serif;color:#3D5A6E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F7F9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #D7E4EA;">
        <tr><td style="background:#0A3D62;padding:20px 28px;">
          <span style="font-family:Arial,sans-serif;font-weight:800;letter-spacing:.05em;color:#fff;font-size:18px;">SEQUENS</span>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#0A3D62;font-family:Arial,sans-serif;">Activate your account</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hi ${esc(name)},</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${esc(school)} has set up a SEQUENS account for you. To finish, choose a password.</p>
        </td></tr>
        <tr><td style="padding:6px 28px 20px;">
          <a href="${esc(activateUrl)}" style="display:inline-block;background:#0C8F79;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">Choose your password</a>
        </td></tr>
        <tr><td style="padding:0 28px 24px;">
          <p style="margin:0 0 10px;font-size:13.5px;line-height:1.6;color:#5B7A90;">Use this email address when you activate: <b style="color:#0A3D62;">${esc(email)}</b>. Your role has already been set, so there is nothing to fill in beyond a password.</p>
          <p style="margin:0;font-size:13.5px;line-height:1.6;color:#5B7A90;">If you were not expecting this, you can ignore it. Nothing happens until you set a password.</p>
        </td></tr>
        <tr><td style="background:#F8FBFC;padding:16px 28px;border-top:1px solid #E9F1F5;">
          <p style="margin:0;font-size:12px;color:#7C97AB;">If the button does not work, paste this into your browser:<br><span style="color:#0C8F79;">${esc(activateUrl)}</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
