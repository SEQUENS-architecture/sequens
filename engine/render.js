// SEQUENS renderers.
// The model produces the plan. THIS produces everything else.
// No AI. No network. Instant. Free.
//
// THE STRUCTURAL GUARANTEE:
// renderDeck() is handed a SANITISED lesson with teacher_key, plan_suggestion,
// expected and layers REMOVED. Not "ignored" - removed. It is not possible for
// a teacher's private note or an ability label to reach a slide, because the
// deck renderer never receives them.

const esc = s => String(s == null ? "" : s)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

// House rules applied at render, not hoped for in a prompt.
const BANNED = ["vibes","empower","unlock","leverage","seamless","revolutionary","amazing","game-changing"];
function clean(s){
  if (s == null) return "";
  let t = String(s).replace(/\u2014/g, " - ");        // no em-dashes. ever.
  BANNED.forEach(w => { t = t.replace(new RegExp(w,"gi"), ""); });
  return t;
}
const T = s => esc(clean(s));

// ---------------------------------------------------------------------------
// SANITISER - this is the wall
// ---------------------------------------------------------------------------
function forTheBoard(L){
  return {
    title_question: L.title_question,
    objective: L.objective,
    year: L.year,
    subject: L.subject,
    duration_mins: L.duration_mins,
    frame: L.frame,
    vocabulary: L.vocabulary,
    steps_to_success: L.steps_to_success,
    exit_ticket: { question: L.exit_ticket.question, icon: L.exit_ticket.icon },
    spine: L.spine.map(s => ({
      step: s.step, mins: s.mins, prompt: s.prompt, instruction: s.instruction,
      illustration: s.illustration, modelling_space: s.modelling_space,
      hinge: s.hinge ? {
        scenario: s.hinge.scenario, question: s.hinge.question,
        options: s.hinge.options, follow_up: s.hinge.follow_up
      } : null,
      task: s.task, stems: s.stems, going_further: s.going_further
    }))
    // teacher_key    : NOT COPIED
    // plan_suggestion: NOT COPIED
    // expected       : NOT COPIED
    // layers         : NOT COPIED
    // hinge.correct / misconception_caught / why_diagnostic : NOT COPIED
  };
}

const STEP_LABEL = {
  first_thing:"First thing", show_them_how:"Show them how",
  build_it_together:"Build it together", quick_check:"Quick check",
  their_turn:"Their turn", last_thing:"Last thing"
};

// type scale by phase - a Y1 slide and a Y13 slide are not the same size
function typeScale(year){
  const y = String(year).replace("Y","");
  if (year === "EYFS" || +y <= 2) return { body: 2.4, head: 3.2 };
  if (+y <= 6)  return { body: 2.0, head: 2.6 };
  return { body: 1.8, head: 2.3 };
}

function illus(ids){
  if (!ids || !ids.length) return "";           // no illustration is a legitimate answer
  return `<div class="illus">${ids.map(id =>
    `<svg viewBox="0 0 64 64" class="ill"><use href="#${esc(id)}"/></svg>`).join("")}</div>`;
}

function spineBar(i){
  return `<div class="spine">${[0,1,2,3,4,5].map(n =>
    `<i class="${n<i?'done':n===i?'now':''}"></i>`).join("")}</div>`;
}

// ---------------------------------------------------------------------------
// THE DECK
// ---------------------------------------------------------------------------
function renderDeck(lessonRaw){
  const L = forTheBoard(lessonRaw);         // <-- the wall
  const ts = typeScale(L.year);
  const slides = [];

  // 1 TITLE - always a question
  slides.push(`<div class="slide dark center" data-step="0">
    <div class="step-label">${T(L.year)} &middot; ${T(L.subject)}</div>
    <h1>${T(L.title_question)}</h1>
  </div>`);

  // 2 OBJECTIVE + STEPS TO SUCCESS - dual coded
  slides.push(`<div class="slide" data-step="0">
    <div class="step-label">Today</div>
    <div class="lo"><div class="lolabel">What we are learning</div>
      <div class="lotext">${T(L.objective)}</div></div>
    <div class="sts"><div class="stslabel">You have got it when you can</div>
      <ol>${L.steps_to_success.map(s =>
        `<li class="${s.further?'further':''}">
           <svg viewBox="0 0 64 64" class="sicon"><use href="#${esc(s.icon)}"/></svg>
           <span>${T(s.text)}</span></li>`).join("")}</ol></div>
  </div>`);

  // 3 VOCABULARY - dual coded
  slides.push(`<div class="slide" data-step="0">
    <div class="step-label">Words we will use today</div>
    <div class="vocab">${L.vocabulary.map(w =>
      `<div class="vword ${w.key?'key':''}">
         <svg viewBox="0 0 64 64" class="vicon"><use href="#${esc(w.icon)}"/></svg>
         <div class="vtext">
           <span class="w">${T(w.word)}</span>
           ${w.morphology?`<span class="morph">${T(w.morphology)}</span>`:""}
           <span class="def">${T(w.meaning)}</span>
           <span class="use">"${T(w.in_use)}"</span>
         </div></div>`).join("")}</div>
  </div>`);

  // THE SPINE
  L.spine.forEach((s, i) => {
    const label = `<div class="step-label">${STEP_LABEL[s.step]}<span class="mins">${s.mins} min</span></div>`;
    const further = s.going_further
      ? `<div class="further"><svg viewBox="0 0 24 24" class="farrow"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
         <div class="ftxt"><b>Going further</b>${T(s.going_further)}</div></div>` : "";

    if (s.step === "quick_check" && s.hinge){
      // the scenario lands BEFORE the question. Two slides.
      slides.push(`<div class="slide hinge center" data-step="${i}">
        ${spineBar(i)}${illus(s.illustration)}
        <h2 class="big-h">${T(s.hinge.scenario)}</h2>
      </div>`);
      slides.push(`<div class="slide hinge" data-step="${i}">
        ${spineBar(i)}
        <div class="hinge-badge">Quick check</div>
        <h2>${T(s.hinge.question)}</h2>
        <div class="votes">${s.hinge.options.map(o=>`<div class="vote">${T(o)}</div>`).join("")}</div>
        ${s.hinge.follow_up?`<p class="big">${T(s.hinge.follow_up)}</p>`:""}
        ${further}
      </div>`);
      return;
    }

    slides.push(`<div class="slide" data-step="${i}">
      ${spineBar(i)}${label}
      <h2>${T(s.prompt)}</h2>
      ${s.instruction?`<p class="big">${T(s.instruction)}</p>`:""}
      ${illus(s.illustration)}
      ${s.task?`<div class="task">${T(s.task)}</div>`:""}
      ${s.stems?`<div class="stems">${s.stems.map(x=>`<span class="stem">${T(x)}</span>`).join("")}</div>`:""}
      ${s.modelling_space?`<div class="model"></div>`:""}
      ${further}
    </div>`);
  });

  // EXIT TICKET - required, its own slide
  slides.push(`<div class="slide center" data-step="5">
    <div class="step-label">Exit ticket</div>
    <svg viewBox="0 0 64 64" class="exicon"><use href="#${esc(L.exit_ticket.icon)}"/></svg>
    <h2 class="big-h">${T(L.exit_ticket.question)}</h2>
  </div>`);

  return { slides, typeScale: ts, count: slides.length };
}

module.exports = { renderDeck, forTheBoard, clean, T, STEP_LABEL, typeScale, illus, spineBar };

// ---------------------------------------------------------------------------
// THE PLAN - the teacher's copy. Gets EVERYTHING.
// ---------------------------------------------------------------------------
function renderPlan(L){
  const LY = L.layers || {};

  // ---- the six teacher layers. TEACHER ONLY. Never reach the board. ----
  function layersFor(stepKey){
    let out = "";

    const sc = (LY.script||{})[stepKey];
    if (sc) out += `<div class="lay script"><div class="ltitle">Teacher script - words you might use</div>`
      + sc.map(l=>`<div class="line">${T(l)}</div>`).join("") + `</div>`;

    const ta = (LY.ta||{})[stepKey];
    if (ta) out += `<div class="lay ta"><div class="ltitle">Teaching assistant</div>`
      + ta.map(([b,t])=>`<div class="todo"><span class="b">${T(b)}</span><span>${T(t)}</span></div>`).join("") + `</div>`;

    const ai = (LY.ai||{})[stepKey];
    if (ai) out += `<div class="lay ai"><div class="ltitle">AI opportunities - and where not to</div>`
      + (ai.yes||[]).map(t=>`<div class="yes"><span class="tag">Could:</span><span>${T(t)}</span></div>`).join("")
      + (ai.no||[]).map(t=>`<div class="no"><span class="tag">Do not:</span><span>${T(t)}</span></div>`).join("") + `</div>`;

    const ba = (LY.barriers||{})[stepKey];
    if (ba) out += `<div class="lay barriers"><div class="ltitle">Barriers and routes in - what could stop any child</div>`
      + ba.map(([b,t])=>`<div class="doing"><b>${T(b)}</b>${T(t)}</div>`).join("") + `</div>`;

    const sd = (LY.send||{})[stepKey];
    if (sd) out += `<div class="lay send"><div class="ltitle">SEND and EAL - specific need, specific action</div>`
      + `<div class="needs">` + (sd.needs||[]).map(([w,t])=>
          `<div class="need"><span class="who">${T(w)}</span><span class="what">${T(t)}</span></div>`).join("") + `</div>`
      + (sd.eal?`<div class="eal"><div class="etitle">EAL - not a learning difficulty</div>${T(sd.eal)}</div>`:"")
      + `</div>`;

    const fu = (LY.further||{})[stepKey];
    if (fu) out += `<div class="lay further-lay"><div class="ltitle">Going further - open to anyone</div>`
      + fu.map(([b,t])=>`<div class="push"><b>${T(b)}</b>${T(t)}</div>`).join("") + `</div>`;

    return out;
  }

  const steps = L.spine.map((s,i) => {
    const isHinge = s.step === "quick_check";
    const box = s.modelling_space ? `
      <div class="msg"><div class="mtitle">The blank space on this slide</div>
        ${s.plan_suggestion?`<p class="purpose">${T(s.plan_suggestion)}</p>`:""}
        ${s.expected?`<div class="egs"><b>Where they usually land</b>${s.expected.map(x=>T(x)).join(" &middot; ")}</div>`:""}
        <div class="warn"><b>Do it your way.</b> This space is yours. The slide does not care how you fill it, only that you fill it with <em>their</em> words.</div>
      </div>` : "";

    const misc = s.elicit_misconception ? `
      <div class="misc"><b>The misconception you are hunting:</b>
        <p>"${T(s.elicit_misconception)}" - collect it, write it up, do not correct it. You come back to it at the end.</p></div>` : "";

    const demo = s.demonstration ? `
      <div class="misc gold"><b>The demonstration will go wrong. Plan for it.</b>
        <p>${T(s.demonstration.objects.join(" and "))}. Result: ${T(s.demonstration.result)}<br><br>
        <b>If it fails:</b> say so, out loud. "That was my fault, not the science." Then do it again.<br>
        <b>Backup:</b> ${T(s.demonstration.fallback)}</p></div>` : "";


    // ---- INDEPENDENT PRACTICE. The biggest block of the lesson, and the
    //      point at which a teacher is most alone. It gets the most detail.
    let independent = "";
    if (s.task || s.shape || s.live_moves){
      independent += `<div class="indep lay live">`;
      if (s.task) independent += `<div class="itask"><b>The task</b>${T(s.task)}</div>`;
      if (s.stems) independent += `<div class="istems"><b>Starters, printed for everyone, assigned to nobody</b>${s.stems.map(x=>T(x)).join(" &middot; ")}</div>`;

      if (s.shape){
        independent += `<div class="ishape"><b>How the ${s.mins} minutes actually goes</b><table>`;
        s.shape.forEach(x => {
          independent += `<tr><td class="m">${x.mins} min</td><td class="w">${T(x.what)}</td><td class="h">${T(x.how)}</td></tr>`;
        });
        independent += `</table></div>`;
      }

      if (s.success_looks_like){
        const sl = s.success_looks_like;
        independent += `<div class="isucc"><b>What a good one looks like</b>`
          + (sl.model?`<div class="model-answer">"${T(sl.model)}"</div>`:"")
          + (sl.why?`<p class="why">${T(sl.why)}</p>`:"")
          + (sl.minimum?`<p class="minimum"><b>The minimum:</b> ${T(sl.minimum)}</p>`:"")
          + `</div>`;
      }

      if (s.live_moves){
        independent += `<div class="imoves"><b>While you circulate - if you see this, do this</b>`;
        s.live_moves.forEach(m => {
          independent += `<div class="move"><div class="msee">${T(m.see)}</div>`
            + `<div class="mdo">${T(m.do)}</div>`
            + (m.why?`<div class="mwhy">${T(m.why)}</div>`:"") + `</div>`;
        });
        independent += `</div>`;
      }

      if (s.if_stuck || s.if_finished){
        independent += `<div class="iends">`;
        if (s.if_stuck) independent += `<div class="stuck"><b>If they cannot start</b><ul>`
          + s.if_stuck.map(x=>`<li>${T(x)}</li>`).join("") + `</ul></div>`;
        if (s.if_finished) independent += `<div class="fin"><b>If they finish early</b><ul>`
          + s.if_finished.map(x=>`<li>${T(x)}</li>`).join("") + `</ul></div>`;
        independent += `</div>`;
      }
      independent += `</div>`;
    }

    const hinge = isHinge && s.hinge ? `
      <div class="misc steel"><b>Why this question and not another:</b>
        <p>${T(s.hinge.why_diagnostic)}<br><br>
        <b>Catches:</b> ${T(s.hinge.misconception_caught)}<br>
        <b>The answer is:</b> ${T(s.hinge.correct)}</p></div>` : "";

    return `<div class="step ${isHinge?'hinge':''}">
      <div class="step-top"><span class="step-name">${STEP_LABEL[s.step]}</span>
        ${isHinge?'<span class="step-badge">The hinge</span>':''}
        <span class="step-time">${s.mins} min</span></div>
      <p>${T(s.prompt)}</p>
      ${s.instruction?`<p class="sub">${T(s.instruction)}</p>`:""}
      ${misc}${demo}${hinge}${independent}${box}
      ${layersFor(s.step)}
      ${s.going_further?`<div class="gf"><b>Going further</b> ${T(s.going_further)} <span class="gfnote">On the slide. Open to everyone. Never allocated.</span></div>`:""}
    </div>`;
  }).join("");

  const key = `<div class="key"><h3>Teacher key &middot; never seen by children</h3>
    <div class="keyrow">
      <div class="kchip k1"><b>Support</b>${T(L.teacher_key.support)}</div>
      <div class="kchip k2"><b>Core</b>${T(L.teacher_key.core)}</div>
      <div class="kchip k3"><b>Secure</b>${T(L.teacher_key.secure)}</div>
      <div class="kchip k4"><b>Going further</b>${T(L.teacher_key.further)}</div>
    </div>
    <p class="keynote">These four words exist on this sheet and nowhere else. Not on the slides, not on the worksheet, never spoken aloud. <b>A child never learns which one they are.</b></p></div>`;

  const toggles = `<div class="layers"><div class="layerbar">
    <span style="font-size:.76rem;color:var(--dim);width:100%;margin-bottom:.5rem;">New to this? <b style="color:var(--navy);">In the moment</b> and <b style="color:var(--navy);">Script</b> are the two to read. Turn any of them off if the page is doing too much.</span>
    <button class="ltog script on" onclick="tog('script',this)"><span class="dot"></span>Teacher script</button>
    <button class="ltog ta" onclick="tog('ta',this)"><span class="dot"></span>TA</button>
    <button class="ltog ai" onclick="tog('ai',this)"><span class="dot"></span>AI opportunities</button>
    <button class="ltog barriers on" onclick="tog('barriers',this)"><span class="dot"></span>Barriers &amp; routes in</button>
    <button class="ltog send" onclick="tog('send',this)"><span class="dot"></span>SEND &amp; EAL</button>
    <button class="ltog further-lay" onclick="tog('further-lay',this)"><span class="dot"></span>Going further</button>
    <button class="ltog live on" onclick="tog('live',this)"><span class="dot"></span>In the moment</button>
  </div></div>`;

  return { toggles, header: {
      title: L.title_question, objective: L.objective, year: L.year,
      subject: L.subject, frame: L.frame, mins: L.duration_mins,
      source: L.curriculum.source, quoted: L.curriculum.quoted,
      honest: L.curriculum.honest_note,
      prior: L.sequence && L.sequence.prior, next: L.sequence && L.sequence.next
    }, steps, key };
}

// ---------------------------------------------------------------------------
// THE WORKSHEET - what the child holds
// ---------------------------------------------------------------------------
function renderWorksheet(L){
  const S = forTheBoard(L);   // the child's sheet gets the same wall
  const turn = S.spine.find(s => s.step === "show_them_how");
  const task = S.spine.find(s => s.task);

  return `
  <div class="shead"><span class="wtitle">${T(S.title_question)}</span>
    <span class="nm">Name<span></span></span></div>
  <div class="lo"><div class="l">What we are learning</div><div class="t">${T(S.objective)}</div></div>
  <div class="sts"><div class="l">Tick when you can do it</div>
    ${S.steps_to_success.map(s=>`<div class="row ${s.further?'further':''}"><span class="box"></span>${T(s.text)}</div>`).join("")}</div>
  <div class="vocab">${S.vocabulary.map(w=>`<span>${T(w.word)}</span>`).join("")}</div>
  <div class="q"><div class="qn">1. What we thought at the start</div><div class="lines"></div>
    <div class="qn" style="margin-top:.8rem;">What we think now</div><div class="lines"></div><div class="lines"></div></div>
  ${task?`<div class="q"><div class="qn">2. ${T(task.prompt)}</div>
    <div class="qtxt">${T(task.task)}</div>
    ${task.stems?`<div class="stems"><div class="l">Starters</div><p>${task.stems.map(x=>T(x)).join(" &middot; ")}</p>
      <p class="hint">Use one if it helps you get going. You do not have to.</p></div>`:""}
    ${'<div class="lines wide"></div>'.repeat(5)}</div>`:""}
  ${task&&task.going_further?`<div class="further"><div class="l">Going further</div>
    <div class="t">${T(task.going_further)}</div><div class="lines"></div><div class="lines"></div></div>`:""}
  <div class="exit"><div class="l">Before you go</div><div class="t">${T(S.exit_ticket.question)}</div>
    <div class="lines"></div><div class="lines"></div></div>`;
}

module.exports.renderPlan = renderPlan;
module.exports.renderWorksheet = renderWorksheet;

// ---------------------------------------------------------------------------
// PLAIN TEXT, for pasting into a school's own planning system.
// Two versions, because a planning field and a resource are different jobs.
// ---------------------------------------------------------------------------
function renderPaste(L, mode){
  const line = "-".repeat(56);
  const out = [];

  if (mode === "short"){
    // For a planning field with a character limit. The essentials, nothing else.
    out.push(`${L.title_question}`);
    out.push(`${L.year} ${L.subject} | ${L.duration_mins} min`);
    out.push("");
    out.push(`OBJECTIVE: ${L.objective}`);
    out.push(`SOURCE: ${L.curriculum.source}${L.curriculum.quoted ? " (quoted)" : " (characterised)"}`);
    out.push("");
    out.push("STEPS TO SUCCESS");
    L.steps_to_success.forEach((s,i) => out.push(`${i+1}. ${s.text}${s.further ? "  (going further)" : ""}`));
    out.push("");
    out.push("LESSON SHAPE");
    L.spine.forEach(s => out.push(`${String(s.mins).padStart(2)} min  ${STEP_LABEL[s.step]}: ${s.prompt}`));
    out.push("");
    out.push(`CHECK FOR UNDERSTANDING: ${(L.spine.find(s=>s.hinge)||{hinge:{}}).hinge.question || "-"}`);
    out.push(`EXIT TICKET: ${L.exit_ticket.question}`);
    out.push("");
    out.push(`VOCABULARY: ${L.vocabulary.map(v=>v.word).join(", ")}`);
    return clean(out.join("\n"));
  }

  // FULL - the whole plan as plain text.
  out.push(L.title_question.toUpperCase());
  out.push(`${L.year} ${L.subject} | ${L.duration_mins} minutes | Frame: ${L.frame || "none"}`);
  out.push(line);
  out.push(`OBJECTIVE`);
  out.push(L.objective);
  out.push(`Source: ${L.curriculum.source}${L.curriculum.quoted ? " (quoted verbatim)" : " (characterised, not quoted)"}`);
  if (L.curriculum.honest_note) out.push(`Note: ${L.curriculum.honest_note}`);
  if (L.sequence) out.push(`Prior: ${L.sequence.prior || "-"}\nNext: ${L.sequence.next || "-"}`);
  out.push("");
  out.push("STEPS TO SUCCESS");
  L.steps_to_success.forEach((s,i) => out.push(`  ${i+1}. ${s.text}${s.further ? "   [going further - offered to all, allocated to nobody]" : ""}`));
  out.push("");
  out.push("VOCABULARY (Tier 3)");
  L.vocabulary.forEach(v => out.push(`  ${v.word}${v.morphology ? " (" + v.morphology + ")" : ""} - ${v.meaning}   e.g. "${v.in_use}"`));
  out.push("");

  L.spine.forEach(s => {
    out.push(line);
    out.push(`${STEP_LABEL[s.step].toUpperCase()}  (${s.mins} min)`);
    out.push(line);
    out.push(`ON THE BOARD: ${s.prompt}`);
    if (s.instruction) out.push(`INSTRUCTION: ${s.instruction}`);
    if (s.task) out.push(`TASK: ${s.task}`);
    if (s.stems) out.push(`STARTERS (for everyone): ${s.stems.join("  |  ")}`);
    if (s.elicit_misconception) out.push(`DRAW OUT: "${s.elicit_misconception}" - write it up, do not correct it.`);
    if (s.plan_suggestion) out.push(`THE BLANK SPACE IS FOR: ${s.plan_suggestion}`);
    if (s.demonstration) out.push(`DEMO: ${s.demonstration.objects.join(" and ")}. ${s.demonstration.result}\n  IF IT FAILS: say so out loud. Backup: ${s.demonstration.fallback}`);
    if (s.expected) out.push(`WHERE THEY USUALLY LAND:\n  - ${s.expected.join("\n  - ")}`);
    if (s.hinge){
      out.push(`THE HINGE`);
      out.push(`  Scenario: ${s.hinge.scenario}`);
      out.push(`  Question: ${s.hinge.question}`);
      out.push(`  Options:  ${s.hinge.options.join(" / ")}`);
      out.push(`  Answer:   ${s.hinge.correct}`);
      out.push(`  Catches:  ${s.hinge.misconception_caught}`);
      out.push(`  Why:      ${s.hinge.why_diagnostic}`);
    }
    if (s.shape){
      out.push(`HOW THE ${s.mins} MINUTES GOES:`);
      s.shape.forEach(x => out.push(`  ${String(x.mins).padStart(2)} min  ${x.what}  (${x.how})`));
    }
    if (s.success_looks_like){
      out.push(`WHAT A GOOD ONE LOOKS LIKE:`);
      out.push(`  "${s.success_looks_like.model}"`);
      if (s.success_looks_like.why) out.push(`  ${s.success_looks_like.why}`);
      if (s.success_looks_like.minimum) out.push(`  Minimum: ${s.success_looks_like.minimum}`);
    }
    if (s.live_moves){
      out.push(`WHILE YOU CIRCULATE:`);
      s.live_moves.forEach(m => out.push(`  SEE: ${m.see}\n  DO:  ${m.do}${m.why ? "\n  WHY: " + m.why : ""}\n`));
    }
    if (s.if_stuck)    out.push(`IF THEY CANNOT START:\n  - ${s.if_stuck.join("\n  - ")}`);
    if (s.if_finished) out.push(`IF THEY FINISH EARLY:\n  - ${s.if_finished.join("\n  - ")}`);
    if (s.going_further) out.push(`GOING FURTHER (on the slide, open to everyone): ${s.going_further}`);
    out.push("");
  });

  out.push(line);
  out.push(`EXIT TICKET: ${L.exit_ticket.question}`);
  if (L.exit_ticket.success_criteria) out.push(`A good answer contains: ${L.exit_ticket.success_criteria}`);
  out.push("");
  out.push(line);
  out.push("TEACHER KEY - NEVER SEEN BY A CHILD");
  out.push(`  Support:       ${L.teacher_key.support}`);
  out.push(`  Core:          ${L.teacher_key.core}`);
  out.push(`  Secure:        ${L.teacher_key.secure}`);
  out.push(`  Going further: ${L.teacher_key.further}`);
  out.push("");
  out.push("Built with SEQUENS. Elegant on the surface. Massive underneath.");
  return clean(out.join("\n"));
}
module.exports.renderPaste = renderPaste;
