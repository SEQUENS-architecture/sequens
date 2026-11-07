# SEQUENS WRITING SPEC (v1) - held until generation is live

The writing fill of the spine. Sits under `engine-system-prompt.md` with the maths and
values specs. Every rule here is enforced by the writing validator in code.

## The copyright line, first, because it decides the design

The Write Stuff is Jane Considine's published, copyrighted scheme, and the FANTASTICs,
Grammaristics, Boomtastics and the Initiate, Model, Enable zones are her branded,
trademarked terms and materials. SEQUENS uses the METHOD, which is pedagogy and not
ownable. It never reproduces her terms, her lenses by name, her model texts, or her
materials.

Note for schools: a Write Stuff licence covers using her materials in your classrooms. It
does not cover feeding those materials into a third-party product. So even a licensed
school keeps the documents out of SEQUENS. The clean path is the school's own adapted
scheme, built on the method, which is exactly what El Alsson is doing.

## The method, baked in (not the brand)

1. **Chunked, modelled writing.** A piece is built a section at a time, not drafted whole.
   The teacher models one sentence live, the class builds one together, pupils write their
   own, then the next chunk. This maps straight onto the spine:
   - model the sentence -> `show_them_how`
   - build one together -> `build_it_together`
   - pupils write their own -> `their_turn`
   The spine already carries the Initiate, Model, Enable rhythm without borrowing the zone
   names: `first_thing` initiates, the middle models and enables.

2. **Writing lenses, the SEQUENS variance.** Instead of the branded lens sets, SEQUENS uses
   three plainly-named lens families. Each modelled chunk declares which family and which
   lens it is working in, so a child always knows what this sentence is being built for.

   - **Detail lenses** (sensory and feeling): sight, sound, touch, smell or taste,
     movement, action, feeling, thought, question. What the writer notices and feels.
   - **Grammar lenses** (structure and accuracy): sentence type, punctuation, word class,
     clause structure, tense, cohesion. How the sentence is built correctly.
   - **Impact lenses** (figurative and poetic): simile, metaphor, personification, imagery,
     rhythm, repetition, sound patterning. How the sentence lands on the reader.

   These names and groupings are original to SEQUENS. They are editable per school, like
   the values, so a school can rename or reshape them without touching code.

## The full writing lesson order (on the spine)

A writing lesson runs in this sequence, and the generator produces it in this order:

1. **Do Now** - settle and retrieve. (`first_thing`)
2. **Objective and steps to success** - introduced and displayed, so the aim is clear from
   the start. (`first_thing`)
3. **Read the class text** - the SPECIFIC passage of the term's novel this lesson draws on,
   named and read. This is the stimulus the writing grows from, so it is a protected beat,
   not skipped. The lesson names and works from the passage; it never reproduces the book's
   text. (`first_thing`)
4. **Gather ideas, left page** - talk, then capture ideas, vocabulary and sentence attempts
   from that reading, before any modelling. (`show_them_how` opening)
5. **Model** - the teacher models the sentence live, using the gathered ideas.
   (`show_them_how`)
6. **Build together** - construct one sentence jointly against the lens and the steps.
   (`build_it_together`)
7. **Hinge** - the writing misconception check. (`quick_check`)
8. **Independent writing, right page** - pupils write for real, using the left-page ideas.
   (`their_turn`)
9. **Check and close** - measure the writing against the steps to success. (`last_thing`)

The reading beat (3) and the idea-gather (4) are both protected and both come before
modelling. A generated writing lesson missing the named text passage, or jumping to
modelling without the read-then-gather, fails validation. Novel-led means the passage is
named and the ideas are rooted in it.

## The double-page spread (Write Stuff working structure)

A writing lesson runs across a facing spread, and the generator produces it in this shape:

- **Left page, ideas.** The lesson opens with talk, then children capture ideas,
  vocabulary and sentence attempts on the left page, BEFORE any modelling or independent
  writing. This is talk-first, gather, rehearse. It maps to `first_thing` and the opening of
  `show_them_how`.
- **Teacher models.** The sentence is modelled live, in `show_them_how` and
  `build_it_together`, drawing on the ideas the class just banked.
- **Right page, writing.** Independent writing goes on the right page, in `their_turn`,
  after the model, using the left-page ideas.

The idea-generation phase is protected and comes first. A writing lesson that jumps to
modelling or writing without an explicit talk-and-capture step fails validation. The
left page is not optional.

## Hard rules the writing validator enforces

1. Each modelled chunk names its lens family and the specific lens it works in.
2. Three steps to success, displayed, taught, revisited, and hit by the close, same as
   the spine and maths specs.
3. One hinge on `quick_check`, naming the writing misconception (tense slip, comma splice,
   simile that decorates but does not deepen), not a generic exit question.
4. Grammar is modelled in use, not labelled in the abstract; a Grammar lens shows the
   structure working in a real sentence.
5. Going further is deeper craft, an alternative construction, a sharper image, offered to
   all, allocated to none.
6. Original text only. The engine writes its own model sentences and texts. It never
   reproduces Jane Considine's model texts or any scheme's materials.
7. Values woven only where the piece genuinely affords it (a text about standing up for
   others carries Empathy honestly), never stamped on.
8. Nothing vague: teacher script for the modelled sentence, the expected shape of a
   pupil's sentence, the lens made explicit. A non-specialist can teach it.

## Status

Held. The school's adapted scheme (objectives, texts, sequence) is uploadable now as a
sheet or Word table, the own-plans build. The lens weaving and lesson generation switch on
with generation, behind the 30 August key and the stress-test.
