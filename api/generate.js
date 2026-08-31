// SEQUENS generation. Writing uses a fixed Write Stuff scaffold (3 chunks); the model only
// fills content slots, so the shape never drifts. Other subjects use the generic step flow.
// Reads ANTHROPIC_API_KEY (and optional ANTHROPIC_MODEL) from env.
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const BASE = `You are an expert primary teacher. Output STRICT JSON only: no prose, no markdown, no fences. Never use an em-dash. Never use: vibes, empower, unlock, leverage, seamless, revolutionary, amazing, game-changing. No pupil-facing ability labels. Never reproduce a novel's or scheme's text; name it and teach original content. CRITICAL: inside any JSON string use SINGLE quotes for speech; never a double-quote or raw line break inside a string.`;

async function callOnce(key, system, user, max) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST',
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},
    body: JSON.stringify({ model:MODEL(), max_tokens:max, system, messages:[{role:'user',content:user}] }) });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error&&data.error.message)||'model error');
  let t=(data.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n').trim();
  return t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
}
function parseLoose(t){ t=t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' '); try{return JSON.parse(t);}catch(e){} var s=t.indexOf('{'),e=t.lastIndexOf('}'); if(s!==-1&&e>s)return JSON.parse(t.slice(s,e+1)); throw new Error('not valid JSON'); }
async function ask(key,sys,user,max){ try{return parseLoose(await callOnce(key,sys,user,max));}catch(e){return parseLoose(await callOnce(key,sys,user+'\nReturn ONLY valid JSON. Single quotes for speech.',max));} }

async function writingFlow(key, ctx, novel){
  const metaSys = BASE + ` A Write Stuff style writing lesson, built in THREE chunks. Return SMALL JSON: {"kind":"writing","title_question":"a pupil-facing question","novel":"","objective":"","do_now":{"prompt":"a show-not-tell instruction","sentence":"a telling sentence to rewrite"},"steps_to_success":["","",""],"read":{"book":"novel title and author","passage":"name the exact moment to read, do NOT quote the book","listen":"what to catch while listening"},"chunk_plan":[{"name":"short chunk title","lens":"Detail lens or Impact lens","focus":"what this chunk captures"},{"name":"","lens":"","focus":""},{"name":"","lens":"","focus":""}],"hinge":{"optionA":"a TELLING sentence","optionB":"a SHOWING sentence","answer":"B","why":"why B shows and A tells"},"going_further":"a short extension for pupils ready to go further, on the same moment, original and not from the book","close":"a share-and-check instruction,","teacher_key":{"k1":{"label":"The method","text":"three chunks: record, model, write, each time"},"k2":{"label":"","text":""},"k3":{"label":"","text":""},"k4":{"label":"Hinge answer","text":""}}}. The three chunks form an arc across the moment (for example setting and senses, then the body, then the emotional turn). Lenses: Detail for sensory and body, Impact for the turn.`;
  const meta = await ask(key, metaSys, ctx + `Novel: ${novel}\nGenerate the writing lesson frame. JSON only.`, 2000);
  const plan = Array.isArray(meta.chunk_plan) ? meta.chunk_plan.slice(0,3) : [];
  const chunkSys = BASE + ` For ONE chunk of a Write Stuff writing lesson, return SMALL JSON: {"record":[{"key":"a short label like He sees"},{"key":""},{"key":""}],"word_bank":["five vivid words"],"model":[{"text":"a SHORT model sentence the teacher writes live","note":"why short here"},{"text":"a LONGER model sentence","note":"why long here"}],"write_task":"the pupil write instruction for this chunk","stems":["two or three sentence starters"],"layers":{"script":{"lines":["a teacher line"]},"ta":{"todos":[{"when":"During","what":""}]},"barriers":{"doing":[{"label":"What actually helps","text":""}],"same":"everyone writes this chunk; the scaffold supports, it does not write it"},"send":{"needs":[{"who":"Writing is the barrier","what":""}],"eal":""}}. The record labels are the ACTUAL things pupils jot before writing. Models are original, never from the book.`;
  const chunks = await Promise.all(plan.map(async (cp)=>{
    const cctx = ctx + `Novel: ${novel}\nChunk: ${cp.name}\nLens: ${cp.lens}\nThis chunk captures: ${cp.focus}\n`;
    let c={record:[],word_bank:[],model:[],stems:[],write_task:''};
    try{ c = await ask(key, chunkSys, cctx+'Return this chunk. JSON only.', 1600); }catch(e){}
    return Object.assign({ name:cp.name, lens:cp.lens }, c);
  }));
  const lesson = Object.assign({}, meta, { chunks });
  const checks = {};
  checks.three_chunks = chunks.length===3;
  checks.record_slots = chunks.every(c=>Array.isArray(c.record)&&c.record.length);
  checks.model_and_write = chunks.every(c=>Array.isArray(c.model)&&c.model.length&&c.write_task);
  checks.one_hinge = !!(meta.hinge&&meta.hinge.optionB);
  const j=JSON.stringify(lesson);
  checks.no_em_dash = !j.includes('\u2014');
  checks.clean_words = !['vibes','empower','unlock','leverage','seamless','revolutionary','amazing','game-changing'].some(w=>j.toLowerCase().includes(w));
  return { lesson, checks, model: MODEL() };
}

const SPINE=['First thing','Show them how','Build it together','Quick check','Their turn','Last thing'];
async function genericFlow(key, ctx){
  const meta = await ask(key, BASE+` Return: {"kind":"generic","title_question":"","frame":"one of nest,iceberg,keystone,spokes,loop,scales,track,turn,chain,weigh,bound,or null","objective":"","curriculum_source":"","year":"","subject":"","duration_mins":0,"steps_to_success":["","",""],"sequence":{"prior":"","next":""},"teacher_key":{"k1":{"label":"","text":""},"k2":{"label":"","text":""},"k3":{"label":"","text":""},"k4":{"label":"","text":""}}}.`, ctx+'\nMetadata only. JSON only.', 1500);
  const s2s=(meta.steps_to_success||[]).join(' | ');
  const coreSys = BASE+` For ONE named step, return SMALL JSON: {"teach":["short paragraph, teacher-facing"],"say":["optional say line"],"slide":{"heading":"ONE short pupil-facing board line, under 10 words","prompt":"optional short sub-line","task":["independent-work pupil lines, else empty"],"stems":["starters, else empty"],"options":["Quick check only: A/B/C vote options, else empty"]},"modelling_space":{"purpose":"","detail":[""],"examples":{"label":"What usually comes up","items":["",""]},"warn":""},"misconception":null,"hinge":null}. Only 'Quick check' has "hinge":{"misconception_caught":"","why_diagnostic":""} and fills slide.options.`;
  const laySys = BASE+` For ONE step return SMALL JSON: {"script":{"lines":[""],"note":""},"ta":{"todos":[{"when":"During","what":""}],"note":""},"ai":{"could":[""],"dont":[""]},"barriers":{"doing":[{"label":"What actually helps","text":""}],"same":""},"going_further":{"items":[{"label":"On the slide","text":""}],"warn":"never name a stretch group"},"send":{"needs":[{"who":"Reading or writing is the barrier","what":""}],"eal":""}}.`;
  const steps = await Promise.all(SPINE.map(async(name)=>{
    const sc=ctx+`Steps to success: ${s2s}\nThis step: ${name}\n`;
    let core={teach:[],say:[]},layers=null;
    try{core=await ask(key,coreSys,sc+'This step core. JSON only.',1600);}catch(e){core={teach:['(this step did not generate cleanly, regenerate)'],say:[]};}
    try{layers=await ask(key,laySys,sc+`What happens: ${(core.teach||[]).join(' ')}\nThis step layers. JSON only.`,1800);}catch(e){}
    return Object.assign({name,timing_mins:0},core,{layers});
  }));
  const lesson=Object.assign({},meta,{steps});
  const checks={};
  checks.six_steps=steps.length===6;
  checks.three_steps=Array.isArray(lesson.steps_to_success)&&lesson.steps_to_success.length===3;
  const qc=steps.find(s=>/quick/i.test(s.name||''));
  checks.one_hinge=!!(qc&&qc.hinge&&qc.hinge.misconception_caught);
  checks.layers_filled=steps.every(s=>s.layers&&s.layers.script);
  const j=JSON.stringify(lesson);
  checks.no_em_dash=!j.includes('\u2014');
  checks.clean_words=!['vibes','empower','unlock','leverage','seamless','revolutionary','amazing','game-changing'].some(w=>j.toLowerCase().includes(w));
  return { lesson, checks, model:MODEL() };
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const key=process.env.ANTHROPIC_API_KEY;
  if(!key) return res.status(500).json({error:'ANTHROPIC_API_KEY is not set in the environment.'});
  const b=req.body||{};
  const objective=(b.objective||'').toString().slice(0,600);
  if(!objective) return res.status(400).json({error:'No objective given.'});
  const subject=(b.subject||'').toString().slice(0,40);
  const year=(b.year||'Year 6').toString().slice(0,20);
  const novel=(b.novel||'').toString().slice(0,80);
  const prior=(b.prior||'').toString().slice(0,200);
  const next=(b.next||'').toString().slice(0,200);
  const values=Array.isArray(b.values)?b.values.slice(0,8).join(', '):'';
  const ctx=`Subject: ${subject}\nYear: ${year}\nObjective: ${objective}\n`+(prior?`Prior: ${prior}\n`:'')+(next?`Next: ${next}\n`:'')+(values?`Values to weave only where genuinely afforded: ${values}\n`:'');
  const isWriting = /writing|english/i.test(subject);
  try {
    const out = isWriting ? await writingFlow(key, ctx, novel||'the class novel') : await genericFlow(key, ctx);
    return res.status(200).json(out);
  } catch(err){ console.error('generate failed',err); return res.status(500).json({error:err.message||'Generation failed.'}); }
}
