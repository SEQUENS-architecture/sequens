// SEQUENS generation. Writing uses a fixed Write Stuff scaffold (3 chunks); the model only
// fills content slots, so the shape never drifts. Other subjects use the generic step flow.
// Reads ANTHROPIC_API_KEY (and optional ANTHROPIC_MODEL) from env.
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const BASE = `You are an expert primary teacher. Output STRICT JSON only: no prose, no markdown, no fences. Never use an em-dash. Never use: vibes, empower, unlock, leverage, seamless, revolutionary, amazing, game-changing. No pupil-facing ability labels. Never reproduce a novel's or scheme's text; name it and teach original content. CRITICAL: inside any JSON string use SINGLE quotes for speech, quotations and titles; never a double-quote or raw line break inside a string. Keep every string short.`;

async function callOnce(key, system, user, max) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST',
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},
    body: JSON.stringify({ model:MODEL(), max_tokens:max, system, messages:[{role:'user',content:user}] }) });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error&&data.error.message)||'model error');
  let t=(data.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n').trim();
  return t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
}
// Repairs the usual model slips before parsing: an unescaped double quote inside a string (speech),
// raw line breaks inside strings, smart quotes used as JSON quotes, trailing commas, and a reply cut off mid-object.
function repairJSON(t){
  t=String(t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ');
  const s0=t.indexOf('{'); if(s0>0) t=t.slice(s0);
  let out='', inStr=false, esc=false; const stack=[];
  for(let i=0;i<t.length;i++){
    const ch=t[i];
    if(inStr){
      if(esc){ out+=ch; esc=false; continue; }
      if(ch==='\\'){ out+=ch; esc=true; continue; }
      if(ch==='\n'||ch==='\r'){ out+=' '; continue; }
      if(ch==='"'){
        let j=i+1; while(j<t.length&&/\s/.test(t[j])) j++;
        const nx=t[j];
        if(nx===undefined||nx===','||nx==='}'||nx===']'||nx===':'){ inStr=false; out+=ch; }
        else out+="'";              // a quote mark inside the text: turn it into a single quote
        continue;
      }
      out+=ch; continue;
    }
    if(ch==='"'){ inStr=true; out+=ch; continue; }
    if(ch==='{'||ch==='['){ stack.push(ch==='{'?'}':']'); out+=ch; continue; }
    if(ch==='}'||ch===']'){ stack.pop(); out+=ch; if(!stack.length) break; continue; }
    out+=ch;
  }
  if(inStr) out+='"';
  if(stack.length){ // cut off mid-reply: drop any half-written key or key with no value, then close
    out=out.replace(/[,{\[]\s*"[^"]*"\s*:?\s*$/, m=>m[0]==='{'||m[0]==='['?m[0]:'');
    out=out.replace(/:\s*$/,': ""');
  }
  out=out.replace(/,\s*$/,'');
  while(stack.length) out+=stack.pop();
  return out.replace(/,\s*([}\]])/g,'$1');
}
function parseLoose(t){ t=String(t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' '); try{return JSON.parse(t);}catch(e){} var s=t.indexOf('{'),e=t.lastIndexOf('}'); if(s!==-1&&e>s){ try{return JSON.parse(t.slice(s,e+1));}catch(e2){} } return JSON.parse(repairJSON(t)); }
async function ask(key,sys,user,max){ let last; for(let k=0;k<3;k++){ try{ return parseLoose(await callOnce(key,sys,user+(k?'\nReturn ONLY valid JSON. Never put a double quote inside any text; use single quotes for speech and titles.':''),max)); }catch(e){ last=e; } } throw new Error('The model reply could not be read after three tries ('+(last&&last.message||'')+'). Press Generate again.'); }

async function writingFlow(key, ctx, novel, hingeLetter){
  // Revamp (Nov 2026): talk-first writing. Pupils gather ideas from guiding questions BEFORE any word bank or model;
  // the teacher models from the class idea bank; stems and prompt words live on the support card, not the slides.
  const metaSys = BASE + ` A chunked writing lesson, built in THREE chunks, taught through talk. Return SMALL JSON: {"kind":"writing","title_question":"a pupil-facing question","novel":"","objective":"","big_idea":"one sentence a Year 6 child can read aloud","do_now":{"prompt":"a short retrieval or grammar task done in books","answers":["two possible answers"]},"steps_to_success":["I can ...","I can ...","I can ..."],"read":{"book":"novel title and author","passage":"name the exact moment to read, do NOT quote the book","listen":"what to catch while listening"},"chunk_plan":[{"name":"short chunk title","lens":"Detail lens, Grammar lens or Impact lens","focus":"what this chunk captures"},{"name":"","lens":"","focus":""},{"name":"","lens":"","focus":""}],"hinge":{"question":"","correct":"the right answer","wrong":["three plausible wrong answers, each from a real misconception"],"misconception":"what the wrong answers reveal","why":"why the correct one is right"},"prove_it":{"task":"an independent write that combines the three chunks, no stems","checks":["four short self-check boxes"]},"going_further":"a short extension open to anyone, on the same moment, original","close":{"talk":"a turn-and-talk question on the steps to success","exit":"an exit ticket question","exit_model":"a model exit answer"},"teacher_key":{"k1":{"label":"The method","text":"gather ideas, share, model from their ideas, say it, write it, partner check"},"k2":{"label":"","text":""},"k3":{"label":"","text":""},"k4":{"label":"Hinge answer","text":""}}}. The three chunks form an arc across the moment. Children talk far more than the teacher.`;
  const meta = await ask(key, metaSys, ctx + `Novel: ${novel}\nGenerate the writing lesson frame. JSON only.`, 2400);
  const plan = Array.isArray(meta.chunk_plan) ? meta.chunk_plan.slice(0,3) : [];
  const chunkSys = BASE + ` For ONE chunk of a chunked writing lesson taught through talk, return SMALL JSON: {"goal":"In this chunk you will write: one short pupil-facing line","guiding_questions":["three open questions pupils discuss at their table to GENERATE their own ideas before any model; concrete, rooted in the named moment, never giving the answer"],"capture":["three or four short labels for what pupils jot, e.g. What she does"],"prompt_words":["five or six words the teacher uses ONLY if a table is stuck; also printed on the support card"],"model":[{"text":"a SHORT model sentence the teacher could write from typical class ideas","note":"why short here"},{"text":"a LONGER model sentence","note":"why long here"}],"write_task":"the pupil write instruction for this chunk","support_stems":["two or three sentence starters for the support card only"],"going_further":"one short extension for this chunk","misconception":"the most likely slip in this chunk","layers":{"script":{"lines":["a short teacher line; the teacher talks under one minute per slide"]},"ta":{"todos":[{"when":"During","what":""}]},"barriers":{"doing":[{"label":"What actually helps","text":""}],"same":"everyone writes this chunk; the scaffold supports, it does not write it"},"send":{"needs":[{"who":"Writing is the barrier","what":""}],"eal":""}}}. Models are original, never from the book.`;
  const chunks = await Promise.all(plan.map(async (cp)=>{
    const cctx = ctx + `Novel: ${novel}\nChunk: ${cp.name}\nLens: ${cp.lens}\nThis chunk captures: ${cp.focus}\n`;
    let c={guiding_questions:[],capture:[],prompt_words:[],model:[],support_stems:[],write_task:''};
    try{ c = await ask(key, chunkSys, cctx+'Return this chunk. JSON only.', 1800); }catch(e){}
    return Object.assign({ name:cp.name, lens:cp.lens }, c);
  }));
  // Hinge: four options, correct answer placed at the letter the client asks for (rotates lesson to lesson).
  const h = meta.hinge || {}; const L = ['A','B','C','D'];
  const want = L.includes(hingeLetter) ? hingeLetter : L[Math.floor(Math.random()*4)];
  const wrong = (h.wrong||[]).slice(0,3); const opts = wrong.slice(); opts.splice(L.indexOf(want), 0, h.correct||'');
  meta.hinge = Object.assign({}, h, { options: opts.slice(0,4), answer: want });
  const lesson = Object.assign({}, meta, { chunks, talk_routines: ['Say it with me','Turn and talk','Table talk','Say it before you write it','Partner check','Show me'] });
  const checks = {};
  checks.three_chunks = chunks.length===3;
  checks.guiding_questions = chunks.every(c=>Array.isArray(c.guiding_questions)&&c.guiding_questions.length===3);
  checks.ideas_before_model = true; // structural: the renderer always places Gather and Share before the model
  checks.model_and_write = chunks.every(c=>Array.isArray(c.model)&&c.model.length&&c.write_task);
  checks.support_card = chunks.every(c=>Array.isArray(c.support_stems)&&c.support_stems.length&&Array.isArray(c.prompt_words)&&c.prompt_words.length);
  checks.one_hinge_four_options = !!(meta.hinge&&meta.hinge.options&&meta.hinge.options.length===4&&meta.hinge.misconception);
  checks.prove_it = !!(meta.prove_it&&meta.prove_it.task&&Array.isArray(meta.prove_it.checks)&&meta.prove_it.checks.length>=3);
  checks.three_steps = Array.isArray(meta.steps_to_success)&&meta.steps_to_success.length===3;
  const j=JSON.stringify(lesson);
  checks.no_em_dash = !j.includes('—');
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
    const hingeLetter=(b.hinge_letter||'').toString().toUpperCase().slice(0,1);
    const out = isWriting ? await writingFlow(key, ctx, novel||'the class novel', hingeLetter) : await genericFlow(key, ctx);
    return res.status(200).json(out);
  } catch(err){ console.error('generate failed',err); return res.status(500).json({error:err.message||'Generation failed.'}); }
}
