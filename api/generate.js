// SEQUENS -> generate a lesson as many SMALL pieces, so no single JSON object is ever
// big enough to break. Reads ANTHROPIC_API_KEY (and optional ANTHROPIC_MODEL) from env.
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const BASE = `You are an expert primary teacher and instructional coach. Output STRICT JSON only: no prose, no markdown, no code fences. Never use an em-dash. Never use: vibes, empower, unlock, leverage, seamless, revolutionary, amazing, game-changing. No pupil-facing ability labels; grouping is teacher-only. Never reproduce a published scheme's materials; generate original teaching aligned to its step order. CRITICAL: inside any JSON string, use SINGLE quotes for speech or emphasis; never put a double-quote or a raw line break inside a string value.`;

async function callOnce(key, system, user, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] })
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || 'model error');
  let t = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  return t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}
function parseLoose(text) {
  let t = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ');
  try { return JSON.parse(t); } catch (e) {}
  const s = t.indexOf('{'), en = t.lastIndexOf('}');
  if (s !== -1 && en > s) return JSON.parse(t.slice(s, en + 1));
  throw new Error('not valid JSON');
}
async function ask(key, system, user, maxTokens) {
  try { return parseLoose(await callOnce(key, system, user, maxTokens)); }
  catch (e) { return parseLoose(await callOnce(key, system, user + '\nReturn ONLY valid JSON. Single quotes for any speech; no double quotes inside strings.', maxTokens)); }
}

const SPINE = ['First thing','Show them how','Build it together','Quick check','Their turn','Last thing'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in the environment.' });

  const b = req.body || {};
  const objective = (b.objective || '').toString().slice(0, 600);
  if (!objective) return res.status(400).json({ error: 'No objective given.' });
  const subject = (b.subject || '').toString().slice(0, 40);
  const year = (b.year || 'Year 6').toString().slice(0, 20);
  const prior = (b.prior || '').toString().slice(0, 200);
  const next = (b.next || '').toString().slice(0, 200);
  const values = Array.isArray(b.values) ? b.values.slice(0, 8).join(', ') : '';
  const ctx = `Subject: ${subject}\nYear: ${year}\nObjective: ${objective}\n` + (prior ? `Prior: ${prior}\n` : '') + (next ? `Next: ${next}\n` : '') + (values ? `Values to weave only where genuinely afforded: ${values}\n` : '');

  try {
    // PASS 0: small metadata only
    const meta = await ask(key, BASE + ` Return: {"title_question":"","frame":"one of nest,iceberg,keystone,spokes,loop,scales,track,turn,chain,weigh,bound,or null","objective":"","curriculum_source":"","year":"","subject":"","duration_mins":0,"steps_to_success":["","",""],"sequence":{"prior":"","next":""},"teacher_key":{"k1":{"label":"","text":""},"k2":{"label":"","text":""},"k3":{"label":"","text":""},"k4":{"label":"","text":""}}}. The 3 steps to success are child-friendly, named, and will be tested by the exit.`, ctx + '\nGenerate the lesson metadata only. JSON only.', 1500);

    const s2s = (meta.steps_to_success || []).join(' | ');

    // PASS 1: each step's teaching core, as its own small call (parallel)
    const coreSys = BASE + ` For ONE named step of a lesson, return a SMALL JSON object: {"teach":["a short paragraph of what the teacher does"],"say":["an optional say-aloud line"],"modelling_space":{"purpose":"","detail":[""],"examples":{"label":"What usually comes up","items":["",""]},"warn":""},"misconception":null,"hinge":null}. Only the 'Quick check' step has "hinge":{"misconception_caught":"","why_diagnostic":""}. A step has "misconception":{"title":"","body":""} only where one truly bites, else null. For 'First thing' in maths, include a Flashback 4 in teach.`;
    const layerSys = BASE + ` For ONE lesson step, return SMALL JSON: {"script":{"lines":["words to say"],"note":""},"ta":{"todos":[{"when":"Before","what":""},{"when":"During","what":""},{"when":"Watch for","what":""}],"note":""},"ai":{"could":["a real AI use"],"dont":["where AI must not go"]},"barriers":{"doing":[{"label":"What they are doing","text":""},{"label":"What might stop them","text":""},{"label":"What actually helps","text":""}],"same":""},"going_further":{"items":[{"label":"On the slide","text":""}],"warn":"never name a stretch group"},"send":{"needs":[{"who":"Reading or writing is the barrier","what":""},{"who":"Sustained attention is the barrier","what":""}],"eal":""}}. Specific classroom moves, not filler.`;

    const steps = await Promise.all(SPINE.map(async (name) => {
      const stepCtx = ctx + `Steps to success: ${s2s}\nThis step: ${name}\n`;
      let core = { teach: [], say: [] }, layers = null;
      try { core = await ask(key, coreSys, stepCtx + 'Return this step\'s core. JSON only.', 1600); } catch (e) { core = { teach: ['(this step did not generate cleanly, regenerate)'], say: [] }; }
      try { layers = await ask(key, layerSys, stepCtx + `What happens: ${(core.teach || []).join(' ')}\nReturn this step's layers. JSON only.`, 2000); } catch (e) { layers = null; }
      return Object.assign({ name, timing_mins: 0 }, core, { layers });
    }));

    const lesson = Object.assign({}, meta, { steps });

    const checks = {};
    checks.six_steps = steps.length === 6;
    checks.three_steps = Array.isArray(lesson.steps_to_success) && lesson.steps_to_success.length === 3;
    const qc = steps.find(s => /quick/i.test(s.name || ''));
    checks.one_hinge = !!(qc && qc.hinge && qc.hinge.misconception_caught);
    checks.layers_filled = steps.every(s => s.layers && s.layers.script);
    const joined = JSON.stringify(lesson);
    checks.no_em_dash = !joined.includes('\u2014');
    checks.clean_words = !['vibes','empower','unlock','leverage','seamless','revolutionary','amazing','game-changing'].some(w => joined.toLowerCase().includes(w));

    return res.status(200).json({ lesson, checks, model: MODEL() });
  } catch (err) {
    console.error('generate failed', err);
    return res.status(500).json({ error: err.message || 'Generation failed.' });
  }
}
