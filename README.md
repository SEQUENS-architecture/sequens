# SEQUENS

sequens.education, hosted on Vercel from this repo (`main`). Supabase project `ezilsbplvmuomdrkzdsh`.

## Where things live

| Folder or file | What it is |
|---|---|
| `index.html` and `sequens-*.html` at the top | The public website (hub, coaching, teacher and home education doorways) |
| `coaching-app.html`, `coaching-mockup.html`, `sequens-signin.html`, `sequens-admin.html` | Coaching app, its demo and sign-in |
| `app/` | The teacher app: `/app` (dashboard, tracker, map) and `/app/lesson-engine.html` |
| `api/` | Serverless functions: lesson generation, waiting list, invites, payments |
| `engine/` | Engine rules: system prompt, writing, maths and values specs, schema, renderer, validator |
| `demo/` | The public demo pages |
| `articles/` | Articles library |
| `sql/` | Database scripts for Supabase |
| `docs/` | Set-up guides (GET-STARTED, BUY-IN-DEPLOY) |
| `archive/` | Old pages nothing links to any more, kept just in case |
| `privacy.html`, `terms.html`, `cookies.html`, icons, `sitemap.xml`, `robots.txt` | Legal pages and site files |

## Environment variables (Vercel)
`ANTHROPIC_API_KEY` (generation), `MAILERLITE_API_KEY`, `ML_GROUP_COACHING`, `ML_GROUP_TEACHER`, `ML_GROUP_HOME` (waiting list), plus the Stripe keys if payments are switched on.

## Change log
- November 2026: writing lessons are talk-first (guiding questions before any word bank, class idea bank, say it before you write it, partner check, four-option rotating hinge, Prove it). Repo tidied: duplicate copies removed, guides moved to `docs/`, unused pages moved to `archive/`.
