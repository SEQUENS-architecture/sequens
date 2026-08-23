// SEQUENS lesson validator.
// The wall between a bad generation and a classroom.
// Fails validation = does NOT render. The teacher sees an honest error.

const FRAMES = ["nest","iceberg","keystone","spokes","loop","scales","track","turn","chain","weigh","bound"];
const STEPS  = ["first_thing","show_them_how","build_it_together","quick_check","their_turn","last_thing"];
const YEARS  = ["EYFS","Y1","Y2","Y3","Y4","Y5","Y6","Y7","Y8","Y9","Y10","Y11","Y12","Y13"];
const BANNED = ["vibes","empower","unlock","leverage","seamless","revolutionary","amazing","game-changing"];
const PUPIL_LABELS = ["stretch","support group","core group","secure group","lower ability","higher ability","more able","less able"];

function validate(L){
  const e = [];
  const need = (c,m) => { if(!c) e.push(m); };

  need(typeof L.title_question === "string" && L.title_question.trim().endsWith("?"),
    "title_question must be a QUESTION and end with '?'. A statement does not switch thinking on.");

  need(Array.isArray(L.spine) && L.spine.length === 6,
    `spine must have EXACTLY 6 steps. Got ${L.spine ? L.spine.length : 0}.`);
  if (Array.isArray(L.spine) && L.spine.length === 6){
    L.spine.forEach((s,i) => {
      need(s.step === STEPS[i], `spine[${i}] must be '${STEPS[i]}', got '${s.step}'. Order is not negotiable.`);
      need("illustration" in s, `spine[${i}] (${s.step}) is missing the illustration field. Use null if none fits.`);
      need(Number.isInteger(s.mins) && s.mins >= 2, `spine[${i}] needs mins.`);
    });
  }

  const qc = (L.spine||[]).find(s => s.step === "quick_check");
  need(qc && qc.hinge, "quick_check MUST have a hinge. A lesson without a checkpoint is a lesson taught blind.");
  if (qc && qc.hinge){
    const h = qc.hinge;
    need(h.misconception_caught && h.misconception_caught.length > 5,
      "The hinge must NAME the misconception it catches. 'Do they understand?' is not a hinge.");
    need(h.why_diagnostic && h.why_diagnostic.length > 15,
      "The hinge must say WHY the wrong answer is diagnostic. If you cannot write that sentence, it is not a hinge.");
    need(Array.isArray(h.options) && h.options.length >= 2, "The hinge needs options to vote on.");
    need(h.options && h.options.includes(h.correct), "The correct answer must be one of the options.");
  }
  (L.spine||[]).forEach(s => {
    if (s.step !== "quick_check") need(!s.hinge, `${s.step} must not have a hinge. Only quick_check does.`);
  });

  need(Array.isArray(L.vocabulary) && L.vocabulary.length >= 3 && L.vocabulary.length <= 5,
    `vocabulary must be 3 to 5 words. Got ${L.vocabulary ? L.vocabulary.length : 0}. More than five does not stick.`);
  (L.vocabulary||[]).forEach((w,i) => {
    need(w.icon, `vocabulary[${i}] ('${w.word}') has no icon. DUAL CODING IS REQUIRED.`);
    need(w.in_use, `vocabulary[${i}] ('${w.word}') has no sentence. A word is learned in use, not in a list.`);
  });

  need(Array.isArray(L.steps_to_success) && L.steps_to_success.length >= 3, "steps_to_success needs at least 3.");
  (L.steps_to_success||[]).forEach((s,i) => {
    need(s.icon, `steps_to_success[${i}] has no icon. DUAL CODING IS REQUIRED.`);
  });

  // ---- THE LONG-STEP RULE ----
  // Any step over 8 minutes is a step where the teacher is circulating rather
  // than talking, and where the plan has historically said least. Under 8
  // minutes a teacher holds it in their head. Over 8, they need support.
  //
  // Presence is not enough: a field can be technically filled and useless, and
  // a model under pressure will do exactly that. These check for substance.
  const real = (x, min) => typeof x === "string" && x.trim().length >= min && /\s/.test(x.trim());
  const LONG = 8;

  (L.spine || []).forEach(s => {
    if (!s || (s.mins || 0) <= LONG) return;
    const at = `${s.step} (${s.mins} min)`;

    need(Array.isArray(s.shape) && s.shape.length >= 2,
      `${at}: needs a SHAPE. ${s.mins} minutes with no structure is ${s.mins} minutes of a teacher improvising.`);
    if (Array.isArray(s.shape)){
      const tot = s.shape.reduce((a,x) => a + (x.mins || 0), 0);
      need(Math.abs(tot - s.mins) <= 1, `${at}: shape totals ${tot} min but the step is ${s.mins} min.`);
      s.shape.forEach((x,i) => need(Number.isInteger(x.mins) && real(x.what, 8),
        `${at}: shape[${i}] needs minutes and a real description.`));
    }

    need(s.success_looks_like && real(s.success_looks_like.model, 15),
      `${at}: needs a MODEL of what good looks like. A teacher cannot circulate against a target they have not seen, and one word is not a target.`);

    need(Array.isArray(s.live_moves) && s.live_moves.length >= 3,
      `${at}: needs at least 3 live moves (if you see this, do this). This is the responsive teaching, and without it the plan says nothing about the longest parts of the lesson.`);
    (s.live_moves || []).forEach((m,i) => {
      need(real(m.see, 10), `${at}: live_moves[${i}] needs a real thing to SEE.`);
      need(real(m.do, 10),  `${at}: live_moves[${i}] needs a real thing to DO. Naming a problem without an action is not responsive teaching.`);
    });

    need(Array.isArray(s.if_stuck) && s.if_stuck.length >= 1 && s.if_stuck.every(x => real(x, 15)),
      `${at}: needs at least one real thing to do if a child cannot start.`);
    need(Array.isArray(s.if_finished) && s.if_finished.length >= 1 && s.if_finished.every(x => real(x, 15)),
      `${at}: needs at least one real thing to do if a child finishes early.`);
  });

  // The independent task itself must be a task, not a word.
  const it = (L.spine || []).find(s => s.step === "their_turn");
  if (it) need(real(it.task, 20), "their_turn must have a real task. A prompt is not a task.");

  need(L.exit_ticket && L.exit_ticket.question, "EXIT TICKET IS REQUIRED. The lesson does not end without one.");
  need(!L.exit_ticket || L.exit_ticket.icon, "exit_ticket needs an icon. Dual coding.");

  if (Array.isArray(L.spine)){
    const total = L.spine.reduce((a,s) => a + (s.mins||0), 0);
    need(Math.abs(total - L.duration_mins) <= 2,
      `TIMINGS DO NOT ADD UP. Spine totals ${total} min, duration_mins says ${L.duration_mins}.`);
  }

  need(L.frame == null || FRAMES.includes(L.frame),
    `frame '${L.frame}' is not one of the eleven. The engine CHOOSES from the library. It never invents.`);

  need(L.curriculum, "curriculum is required.");
  need(!L.curriculum || L.curriculum.awarding_body == null,
    "awarding_body must be NULL. SEQUENS does not hold awarding-body specifications.");

  need(YEARS.includes(L.year), `year '${L.year}' is not valid.`);

  // topic drives interleaving. Without it, retrieval cannot discriminate
  // across topics and every "interleaved" slot is really just spaced.
  need(typeof L.topic === "string" && L.topic.length > 1,
    "topic is required. Interleaving needs it to mix retrieval across topics, not just across time.");

  const pupilText = [
    L.title_question,
    ...(L.steps_to_success||[]).map(s => s.text),
    ...(L.vocabulary||[]).map(w => `${w.word} ${w.meaning} ${w.in_use}`),
    ...(L.spine||[]).flatMap(s => [s.prompt, s.instruction, s.task, s.going_further, ...(s.stems||[])]),
    L.exit_ticket && L.exit_ticket.question
  ].filter(Boolean).join(" ").toLowerCase();

  PUPIL_LABELS.forEach(lab => need(!pupilText.includes(lab),
    `'${lab}' appears in PUPIL-FACING text. Differentiation labels are NEVER visible to a child.`));
  BANNED.forEach(w => need(!pupilText.includes(w), `Banned word '${w}' appears in the lesson.`));
  need(!pupilText.includes("\u2014"), "Em-dash found. Never.");

  return e;
}
module.exports = { validate };
