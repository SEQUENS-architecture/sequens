// SEQUENS -> generate a SEQUENSed lesson, in pieces so nothing is ever truncated.
// Reads ANTHROPIC_API_KEY (and optional ANTHROPIC_MODEL) from Vercel env.
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const BASE = `You are an expert primary teacher and instructional coach. You output STRICT JSON only: no prose, no markdown, no code fences. Never use an em-dash. Never use: vibes, empower, unlock, leverage, seamless, revolutionary, amazing, game-changing. No pupil-facing ability labels. Never reproduce a published scheme's materials; generate original teaching aligned to its step order.`;

async function ask(key, system, user, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] })
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || 'model error');
  let text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(text); }
  catch (e) {
    const s = text.indexOf('{'), en = text.lastIndexOf('}');
    if (s !== -1 && en > s) return JSON.parse(text.slice(s, en + 1));
    throw new Error('not valid JSON');
  }
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
    // PASS 1: the lesson core (small, always finishes)
    const coreSys = BASE + ` Return this JSON: {"title_question":"","frame":"one of nest,iceberg,keystone,spokes,loop,scales,track,turn,chain,weigh,bound,or null","objective":"","curriculum_source":"","year":"","subject":"","duration_mins":0,"steps_to_success":["","",""],"sequence":{"prior":"","next":""},"teacher_key":{"k1":{"label":"","text":""},"k2":{"label":"","text":""},"k3":{"label":"","text":""},"k4":{"label":"","text":""}},"steps":[{"name":"First thing","timing_mins":0,"teach":["what the teacher does"],"say":["optional say-aloud line"],"modelling_space":{"purpose":"","detail":[""],"examples":{"label":"What usually comes up","items":["",""]},"warn":""},"misconception":null,"hinge":null}]}. There are exactly 6 steps in this order: ${SPINE.join(', ')}. Only Quick check has "hinge":{"misconception_caught":"","why_diagnostic":""}. A step has "misconception":{"title":"","body":""} only where one truly bites, else null. Maths: First thing carries a Flashback 4. The 3 steps to success are named, modelled, prompted, self-checked and TESTED by the exit.`;
    const lesson = await ask(key, coreSys, ctx + '\nGenerate the lesson core now. JSON only.', 4000);

    // PASS 2: the layers for each step, in parallel, each small
    const laySys = BASE + ` For ONE lesson step, return the teacher-support layers as JSON: {"script":{"lines":["words you might say"],"note":""},"ta":{"todos":[{"when":"Before","what":""},{"when":"During","what":""},{"when":"Watch for","what":""}],"note":""},"ai":{"could":["a real AI use"],"dont":["where AI must not go and why"]},"barriers":{"doing":[{"label":"What they are doing","text":""},{"label":"What might stop them","text":""},{"label":"What actually helps","text":""},{"label":"What does not help","text":""}],"same":""},"going_further":{"items":[{"label":"On the slide","text":""},{"label":"If they are quick","text":""}],"warn":"never name a stretch group"},"send":{"needs":[{"who":"Reading or writing is the barrier","what":""},{"who":"Sustained attention is the barrier","what":""},{"who":"Time to think is the barrier","what":""}],"eal":""}}. Be specific and concrete, real classroom moves, not filler.`;
    const steps = Array.isArray(lesson.steps) ? lesson.steps : [];
    await Promise.all(steps.map(async (st) => {
      try {
        st.layers = await ask(key, laySys, ctx + `\nStep: ${st.name}\nWhat happens: ${(st.teach || []).join(' ')}\nReturn the layers for THIS step. JSON only.`, 2500);
      } catch (e) { st.layers = null; }
    }));

    const checks = {};
    checks.six_steps = steps.length === 6;
    checks.three_steps = Array.isArray(lesson.steps_to_success) && lesson.steps_to_success.length === 3;
    const qc = steps.find(s => s && /quick/i.test(s.name || ''));
    checks.one_hinge = !!(qc && qc.hinge && qc.hinge.misconception_caught);
    checks.layers_filled = steps.length > 0 && steps.every(s => s && s.layers && s.layers.script);
    const joined = JSON.stringify(lesson);
    checks.no_em_dash = !joined.includes('\u2014');
    checks.clean_words = !['vibes','empower','unlock','leverage','seamless','revolutionary','amazing','game-changing'].some(w => joined.toLowerCase().includes(w));

    return res.status(200).json({ lesson, checks, model: MODEL() });
  } catch (err) {
    console.error('generate failed', err);
    return res.status(500).json({ error: err.message || 'Generation failed.' });
  }
}
