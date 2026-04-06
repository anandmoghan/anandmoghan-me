# Blog Post Writing Style Guide

Reference for writing technical ML/engineering blog posts in this repo. Based on analysis of Eugene Yan, Chip Huyen, Lilian Weng, Sebastian Raschka, and Hugging Face blog posts.

## Target Voice

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

## Structure for Technical Problem Posts

Each problem section should be self-contained and follow this pattern:

```
## N. Problem Title

[1–2 paragraph setup: what the problem is, why the naive approach fails, what's hard about it]

#### Data
[Sources, collection, cleaning, labeling strategy. Include the failure mode in the data itself.]

#### Training Strategy
[Model choice rationale, fine-tuning approach, loss function, key hyperparameters, serving considerations.]

#### Evaluation Framework
[Offline metrics → online metrics → production monitoring. Each distinct.]
```

## MDX Formatting Rules

- Use `##` for main section headings (these appear in TOC)
- Use `####` for all sub-headings (Data, Training Strategy, Evaluation Framework, etc.) — keeps TOC clean
- LaTeX math in `$$` blocks for display equations, `$...$` for inline
- **Never use bare `{variable}` in prose** — MDX treats it as JSX. Use `[variable]` for placeholders or wrap in a code span
- Bold for key terms on first use, not for decoration
- No emojis unless explicitly requested

## Punctuation

- Do not use em dashes (—) anywhere in prose. Rewrite the sentence instead.
- Do not number sections or subsections (no "1.", "2.", "1.1", etc. in headings).

## What to Avoid

- Listicle-style bullet dumps as a substitute for explanation
- Hedging everything ("it depends", "it varies", "results may differ") without saying what it depends on
- Summarizing what you just said at the end of each section
- Filler transitions ("Now that we've covered X, let's move to Y...")
- Overly formal register ("This paper presents a novel approach to...")
- Synthetic enthusiasm ("Exciting new developments in...")
