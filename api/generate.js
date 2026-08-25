// SEQUENS -> generate one SEQUENSed lesson from an objective.
// Server-side only. Reads ANTHROPIC_API_KEY (and optional ANTHROPIC_MODEL) from Vercel env.
// The key never reaches the browser. Your console spend cap is the backstop on misuse
// until the engine moves behind login and per-user entitlement.
const SYSTEM = `You are an expert primary teacher and instructional coach. You generate ONE lesson that a non-specialist could teach with no further planning. You return STRICT JSON only: no prose, no markdown, no code fences.

THE SPINE (fixed order, every lesson):
first_thing (retrieve and set up) -> show_them_how (model) -> build_it_together (we do) -> quick_check (THE hinge) -> their_turn (independent) -> last_thing (close and check).

STEPS TO SUCCESS: exactly 3, child-friendly. They are load-bearing: named in first_thing, modelled in show_them_how, prompted in build_it_together, self-checked in their_turn, and TESTED DIRECTLY by the exit in last_thing.

HINGE: exactly one, only on quick_check. It names the misconception it catches and why a wrong answer is diagnostic. No other step has a hinge.

MATHS lessons: first_thing includes a Flashback 4 (four retrieval questions - last lesson, last week, last term, arithmetic - each with answer and a likely misconception). Explicit I do, we do, you do. their_turn progresses fluency then reasoning then problem solving. Going further is deeper reasoning or proving, offered to all, allocated to none. Follow the White Rose step order; small steps.

WRITING lessons: first_thing runs Do Now, then objective and steps, then reads a NAMED passage of the class novel (name the passage; never reproduce the book's text). Children gather ideas from that reading (left page) before modelling. Model one sentence live, build one together, then independent writing (right page). Each modelled chunk names its lens family: Detail (sensory and feeling), Grammar (structure and accuracy), or Impact (figurative and poetic).

ALWAYS: no pupil-facing ability labels (grouping is teacher-only, in teacher_key); never reproduce White Rose or any scheme's materials, generate original teaching aligned to the step order; weave a school value ONLY where the content genuinely affords it, else none; give timings, teacher script, board notes, expected pupil responses, and differentiation; nothing vague. NEVER use an em-dash. NEVER use these words: vibes, empower, unlock, leverage, seamless, revolutionary, amazing, game-changing.

Return exactly this JSON shape, filled richly. Every step carries its teaching moves AND its layers. The layers are where the real help lives, fill them with specific, concrete guidance a real teacher would give, not generic filler:

{"title_question":"","frame":"nest|iceberg|keystone|spokes|loop|scales|track|turn|chain|weigh|bound|null","objective":"","curriculum_source":"","year":"","subject":"","duration_mins":0,"steps_to_success":["","",""],"steps":[{"name":"First thing","timing_mins":0,"teach":["a paragraph of what the teacher does"],"say":["an optional say-aloud line"],"modelling_space":{"purpose":"what the blank space or model is for","detail":["a paragraph of how to fill it"],"examples":{"label":"What usually comes up","items":["","",""]},"warn":"an optional do-it-your-way note"},"misconception":null,"hinge":null,"layers":{"script":{"lines":["words you might actually say","and another"],"note":"a why-it-matters note"},"ta":{"todos":[{"when":"Before","what":""},{"when":"During","what":""},{"when":"Watch for","what":""}],"note":""},"ai":{"could":["a genuine AI use",""],"dont":["where AI must NOT go and why"]},"barriers":{"doing":[{"label":"What they are doing","text":""},{"label":"What might stop them","text":""},{"label":"What actually helps","text":""},{"label":"What does not help","text":""}],"same":"one line: everyone does the real task, nobody is given the answer"},"going_further":{"items":[{"label":"On the slide","text":""},{"label":"If they are quick","text":""}],"warn":"never name a stretch group; the challenge is asked to the room"},"send":{"needs":[{"who":"Reading or writing is the barrier","what":""},{"who":"Sustained attention is the barrier","what":""},{"who":"Uncertainty is the barrier","what":""},{"who":"Time to think is the barrier","what":""}],"eal":"EAL is not a learning difficulty: accept the idea in any language, add the English word beside it"}}}],"teacher_key":{"k1":{"label":"","text":""},"k2":{"label":"","text":""},"k3":{"label":"","text":""},"k4":{"label":"","text":""}},"sequence":{"prior":"","next":""}}

There are exactly 6 steps, in spine order: First thing, Show them how, Build it together, Quick check, Their turn, Last thing. Only the Quick check step has a "hinge" object {"misconception_caught","why_diagnostic"}; the others have "hinge":null. A step has a "misconception" object {"title","body"} only where one genuinely bites, else null. Fill every layer on every step with real, specific content.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in the environment.' });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  const b = req.body || {};
  const objective = (b.objective || '').toString().slice(0, 600);
  if (!objective) return res.status(400).json({ error: 'No objective given.' });
  const subject = (b.subject || '').toString().slice(0, 40);
  const year = (b.year || 'Year 6').toString().slice(0, 20);
  const prior = (b.prior || '').toString().slice(0, 200);
  const next = (b.next || '').toString().slice(0, 200);
  const values = Array.isArray(b.values) ? b.values.slice(0, 8).join(', ') : '';

  const userMsg =
    `Subject: ${subject}\nYear: ${year}\nObjective: ${objective}\n` +
    (prior ? `Prior lesson: ${prior}\n` : '') +
    (next ? `Likely next lesson: ${next}\n` : '') +
    (values ? `School values to weave only where genuinely afforded: ${values}\n` : '') +
    `\nGenerate the lesson now. Output ONLY the JSON object, starting with { and ending with }. No preamble, no explanation, no markdown fences.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }]
      })
    });
    const data = await r.json();
    if (!r.ok) { console.error('anthropic error', data); return res.status(502).json({ error: (data.error && data.error.message) || 'Generation failed.' }); }

    let text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let lesson, parseError = null;
    try {
      lesson = JSON.parse(text);
    } catch (e1) {
      // salvage: take from the first { to the last } and try again
      var s = text.indexOf('{'), e = text.lastIndexOf('}');
      if (s !== -1 && e !== -1 && e > s) {
        try { lesson = JSON.parse(text.slice(s, e + 1)); } catch (e2) { parseError = 'Model reply was not valid JSON (it may have been cut off).'; }
      } else { parseError = 'Model reply was not valid JSON.'; }
    }

    // light spec checks so bad output does not render as if fine
    const checks = {};
    if (lesson) {
      const steps = Array.isArray(lesson.steps) ? lesson.steps : [];
      checks.six_steps = steps.length === 6;
      checks.three_steps = Array.isArray(lesson.steps_to_success) && lesson.steps_to_success.length === 3;
      const qc = steps.find(s => s && /quick/i.test(s.name || ''));
      checks.one_hinge = !!(qc && qc.hinge && qc.hinge.misconception_caught);
      checks.layers_filled = steps.every(s => s && s.layers && s.layers.script && s.layers.barriers);
      const joined = JSON.stringify(lesson);
      checks.no_em_dash = !joined.includes('\u2014');
      checks.no_banned = !['vibes','empower','unlock','leverage','seamless','revolutionary','amazing','game-changing'].some(w => joined.toLowerCase().includes(w));
    }
    return res.status(200).json({ lesson: lesson || null, raw: lesson ? undefined : text, parseError, checks, model });
  } catch (err) {
    console.error('generate failed', err);
    return res.status(500).json({ error: 'Something went wrong calling the model.' });
  }
}
