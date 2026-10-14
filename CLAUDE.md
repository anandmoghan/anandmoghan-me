# anandmoghan.me

Public portfolio and blog at https://anandmoghan.me. Next.js (App Router, `output: "export"`),
Tailwind for the site chrome, deployed to Cloudflare Pages (project `anandmoghan-me`).
`apps/` is a separate Vite app (apps.anandmoghan.me) with its own build and deploy; this file
does not cover it.

Blog posts are hand-written HTML, not Markdown. There is no MDX in this repo any more.
Rollback point from before the migration: git tag `pre-html-revamp`.

## Layout

```
content/
  posts/<slug>/
    post.json            {"title","excerpt","publishedAt","updatedAt"?,"tags","author"?,"published"?}
    10-introduction.html section fragments, ordered by numeric prefix (gaps of 10)
    20-....html
  fragments/<topic>/<name>.html   reusable blocks, pulled in with @include
  research/<slug>/                source notes for a post (not built)
common/utils/html.ts     renders fragments: includes, KaTeX, code highlighting, heading ids, TOC
common/utils/post.ts     loads posts (post.json + sections), tags, reading time
public/global/styles/    COPY of ~/workspace/code/global/styles (committed; see Styles)
```

## Post content model

- A post is a folder `content/posts/<slug>/` with `post.json` and section files `NN-name.html`.
  The URL is `/posts/<slug>`; keep existing slugs stable.
- `published: false` builds the page with `noindex` and hides it from lists and the sitemap; the
  page is still reachable by URL. Drafts live in `content/posts/<slug>/` from the first outline so
  the user can review them in the browser (`npm run dev`); flip to `true` only after the user
  approves the post.
- `tags` are ids from `DEFAULT_TAGS` in `common/utils/post.ts`; add a tag there before using it.
- Each section file is exactly one `<section id="kebab-id">`, one `<h2>` (no id; it reuses the
  section id), optional `<h3 id="...">` subsections, then `</section>`. The build throws otherwise.
  The first section is usually `10-introduction.html`. No `<h1>`: the page header renders the title.
- The table of contents shows `h2` and `h3`. Use `h4` for run-in sub-headings that should stay out
  of the TOC (Data, Training strategy, Evaluation framework).
- Ids must be unique across the post (the build throws on duplicates). Missing `h3` ids are
  generated from the heading text.
- Reusable blocks (a definition, an equation set, a comparison table, a diagram) used by more than
  one post live in `content/fragments/<topic>/<name>.html` and are included with
  `<!-- @include content/fragments/<topic>/<name>.html -->` (path relative to the repo root, must
  stay inside `content/`). Fragments start at `h3` or below and hold no `section` or `h2`.
  Check `content/fragments/` before writing a block that might already exist.
- Maths: `\( ... \)` inline, `\[ ... \]` display, rendered with KaTeX at build time.
- Code: `<pre><code class="language-python">...</code></pre>` is highlighted at build time
  (highlight.js language names); copy buttons are added at runtime. Escape `<`, `>`, `&`.
- Images live in R2 (`https://media.anandmoghan.me/public/images/<post>/...`, upload with
  `npm run upload-media`) and go in `<figure>` with a `<figcaption>`.
- Architecture and pipeline diagrams are inline SVG in `figure.diagram` using the `d-*` classes,
  never images or ASCII art.

## Authoring rules

Invoke the `html-authoring` skill and read `~/workspace/code/global/guides/html-authoring.html`
before writing or editing any post. That guide is the source of truth for source formatting
(2-space indent, one sentence per line, no inline styles), components (callouts, tags, table-wrap,
cols-2, details, figure, diagrams) and maths. This file adds the blog voice below.

New posts go through the `blog-post` skill (`/blog-post <topic>`): research into
`content/research/<slug>/`, an outline you approve (sections, fragments to reuse or create,
diagrams), parallel Writer agents per section, a fact check, then `npm run build`.

## Styles

The site loads the shared design system from `public/global/styles/` (tokens, prose, print, ui).
Those files are copies: edit `~/workspace/code/global/styles/`, then run `npm run sync-global` and
commit the copies (CI builds without the global folder). Site-only chrome styles live in
`app/globals.css` and Tailwind, built on the global tokens. A component a post needs that the
global CSS lacks gets added to `global/styles/` and documented in the guide, never to a post.

## Build and deploy

```bash
npm run dev          # local dev server
npm run build        # static export to out/; fails on malformed post fragments
npm run deploy       # build + wrangler pages deploy (confirm with the user first)
```

Pushing to `main` also deploys through GitHub Actions (`.github/workflows/deploy.yml`).

# Blog post writing style guide

Reference for writing technical ML/engineering posts. Based on analysis of Eugene Yan, Chip Huyen,
Lilian Weng, Sebastian Raschka, and Hugging Face blog posts.

## Target Voice

**Always:** a working professional talking about what they have read from industry and seen in
their own work. Describe what production systems and external teams actually use and why, explain
the trade-offs, and use paper results only as evidence for those trade-offs. Talk about the topic,
not about papers: name a paper or model only when the reader truly needs it, cite [n] only where a
specific number is quoted, and put paper-by-paper detail in at most one tabular summary section.
A post is never a literature review.


Senior practitioner writing from real experience — not a tutorial, not an academic paper. The reader is a working engineer who has shipped systems and wants to know what actually breaks in production.

## Core Principles

- Lead with the problem, not the solution
- Acknowledge when something is hard in practice; don't paper over difficulty
- Include at least one non-obvious trade-off or failure mode per section — things practitioners only learn from shipping
- Use first person occasionally to signal lived experience ("I've found...", "In my experience..."), not to narrate ("I will now explain...")
- Ground examples in concrete, named systems, models, or products — not "a hypothetical system"
- Avoid listicle prose; prefer paragraphs with structure emerging naturally

## Tone by Author (blended here)

**Eugene Yan** — practitioner-warm, systems thinker
- "I've found that..." / "To be candid..." / "Before we get too excited..."
- Trade-off framing: name the upside, then the downside explicitly
- Short paragraphs (3–5 sentences), bold key terms inline
- Opens with a contextualizing hook (scene, conversation, observation), then states what the post does

**Chip Huyen** — analytical, systems engineer
- "silent failures" (her signature for LLM unpredictability)
- Trade-offs labeled explicitly: "Tradeoff:" as a standalone prefix
- Very tight paragraphs (2–4 sentences); structure does the organizational work
- Opens with the field state, pivots to a central tension

**Lilian Weng** — scholarly, systematic
- Subsection per technique; each follows: definition → key insight → limitation
- "However..." pivot to state limitations plainly, without softening
- Heavy equations where relevant, always followed by plain-English interpretation
- Rare first-person, but when used it's conspicuous and opinionated: "[My personal spicy take]"

**Sebastian Raschka** — educator-practitioner
- Questions as section headers ("What is X, and why should we care?")
- Parenthetical precision notes: "(to be technically correct, ... — this is a nitpicky detail)"
- Code-first examples; concrete GPU specs and model names
- Trade-off structure: symmetric A→B, with C as the named downside

## Structure for technical problem posts

Each problem section should be self-contained and follow this pattern:

One section file per problem (`<section id>` + `<h2>Problem title</h2>`):

- 1 to 2 paragraphs of setup: what the problem is, why the naive approach fails, what's hard about it.
- `<h4>Data</h4>`: sources, collection, cleaning, labeling strategy. Include the failure mode in the data itself.
- `<h4>Training strategy</h4>`: model choice rationale, fine-tuning approach, loss, key hyperparameters, serving.
- `<h4>Evaluation framework</h4>`: offline metrics, then online metrics, then production monitoring. Each distinct.

## Length and grounding in posts

- Match the existing posts: about 6,000 to 7,000 words in total, a 150 to 250 word introduction,
  and 600 to 1,200 words for most sections (one or two long ones are fine). Say each idea once.
- Keep only the numbers that make a point, with their setting (test set, hardware) in a few words.
- Do not quote evaluation metrics from papers (WER, CER, SIM, MOS): test sets, ASR models and
  normalisation differ, so cross-paper numbers mislead. State the finding in words instead.
- No grounding tag pills (`span.tag`) in posts; those belong in research notes. When a claim is the
  author's own reading, say so in prose ("my read is", "I would expect").
- No per-section "References: [1, 2]" lines under headings; cite inline as [n] where the claim is,
  and keep the full list in the References section.
- No research-process commentary in posts ("the paper does not state", "not given in the
  abstract", "the note"). If a fact is uncertain, drop it instead of caveating it.

## Formatting

- `h2` for main sections (one per section file, these form the TOC), `h3` for subsections,
  `h4` for run-in sub-headings that stay out of the TOC.
- Bold key terms on first use, not for decoration. No emojis unless explicitly requested.
- Comparisons go in tables (`div.table-wrap`), not bullet dumps.

## Punctuation

- Do not use em dashes anywhere in prose. Rewrite the sentence instead.
- Do not number sections or subsections (no "1.", "2.", "1.1", etc. in headings).

## What to Avoid

- Listicle-style bullet dumps as a substitute for explanation
- Hedging everything ("it depends", "it varies", "results may differ") without saying what it depends on
- Summarizing what you just said at the end of each section
- Filler transitions ("Now that we've covered X, let's move to Y...")
- Overly formal register ("This paper presents a novel approach to...")
- Synthetic enthusiasm ("Exciting new developments in...")
