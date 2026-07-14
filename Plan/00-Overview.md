# Amigo — Spanish Learning App (A1/A2) — Content & Curriculum Plan

Target language: **Spanish** · Learner's native language: **German** · Levels: **A1 and A2**

This plan covers curriculum, content design, and the minimal technical foundation (06). No graphical UI — everything runs as typed text in the terminal for now.

## Concept

Three trainers that share one content foundation:

1. **Vocab trainer** — classic spaced-repetition vocabulary practice (DE↔ES), organized by thematic units aligned with the curriculum.
2. **Verb form trainer** — drills conjugations for all A1/A2 tenses, organized by conjugation pattern and irregularity class.
3. **Template sentence trainer** — the clever part. Sentences are *generated* from hand-authored templates with typed slots, filled from a semantically annotated lexicon. As the learner unlocks new grammar (tenses, pronouns, constructions), templates using that grammar become available and existing templates gain new variation axes. No fixed sentence pairs → no repetition.

The glue is a **shared lexicon** (every word annotated with grammatical and semantic features) and a **grammar point graph** (ordered curriculum modules that gate what each trainer presents).

## Learner state: user.yaml

**All** learner state lives in a single human-readable `user.yaml` — the settings TUI is nothing but a friendly editor over this file, and editing it by hand (or syncing/diffing/resetting it) is a supported workflow, not a hack. Sketch:

```yaml
grammar:
  known: [presente.regular.ar, presente.regular.er, copula.estar.location]  # flat set; modules derive from it
  srs:                                                      # per-point scheduling, created when first exercised
    presente.regular.ar: {due: 2026-07-15, interval: 1, ease: 2.3, errors: 2}
vocab:
  coche:      {due: 2026-08-01, interval: 30, ease: 2.5}
  aburrido/ser: {due: 2026-07-14, interval: 2, ease: 2.1}   # senses tracked separately
verbs:
  pedir:
    presente.1p: {due: 2026-07-13, interval: 1, ease: 1.9}  # per verb × tense × person cell
presets:
  reflexive-week: {grammar: [verb.reflexive], tags: []}      # saved focus selections (see below)
```

Constraints that keep it debuggable: one file, stable key ordering (diff-friendly), few and human-meaningful SRS fields per entry (`due`, `interval`, `ease` — whatever scheduler we pick must be expressible in fields a human can reason about). Want a word to appear more often? Shorten its `interval` or backdate `due` — in the TUI or in a text editor, same effect. Absent entry = never seen; that's what makes bulk hand-edits safe.

## Knowledge settings (customizing to prior knowledge)

Learners with existing Spanish don't start at zero. The settings TUI exposes the learner model directly (all of it just writes `user.yaml`):

- **Grammar:** a checklist mirroring the grammar point graph, grouped by module (01). Checking a point marks it known → it's unlocked for templates and drills without being introduced. Checking a point auto-checks its prerequisites (you can't know *indefinido* without *presente*); unchecking a prerequisite unchecks its dependents.
- **Vocab:** check whole units/themes or individual words (03). Checking puts a word *into* the rotation (fresh SRS state, due today) — it means "encountered on my journey, drill it". Errors per word are counted and prioritize the word while due; an editable 0–100 score in the editor exposes the schedule.
- **Verbs:** follow from the above — a tense is available once its grammar point is checked, a verb once its vocab entry is.
- **Shortcuts:** "I know all of A1" (checks M01–M10 grammar + vocab), per-module one-click.

Everything downstream (template eligibility, drill selection, SRS) reads only the learner model — it doesn't matter whether a point was unlocked by working through a module or by checking a box.

## Focused practice

Besides the default mixed training, the learner can restrict a session to specific aspects — "only reflexive verbs", "only ser/estar", "only indefinido irregulars", "only food vocab". A focus is a filter over the same selectors the content is already annotated with:

- **grammar points** (e.g. `verb.reflexive`, `copula.*`, `past.indefinido.irregular`) — restricts templates to those *requiring* one of the selected points, verb drills to matching tenses/patterns
- **irregularity classes** (04) — e.g. strong preterites only
- **themes/tags** (02) — e.g. food vocab, `gender_trap` words, false friends
- combinable, and savable as named presets in `user.yaml`

Inside a focus, difficulty/SRS weighting works as usual — the filter narrows *what*, not *how*. Focused sessions still update the shared learner state. This is what lets us model distinctions like *soy aburrido* (langweilig) vs. *estoy aburrido* (gelangweilt) correctly: the disambiguation lives in the lexicon (copula-dependent German glosses) and the German prompt sentence makes the intended meaning unambiguous.

## Plan files

- **[01-Curriculum.md](01-Curriculum.md)** — the module progression: ~10 A1 + ~10 A2 modules, each bundling grammar points, a vocab theme, and the template capabilities it unlocks. Includes German-speaker-specific notes (what's hard, what maps nicely).
- **[02-Lexicon.md](02-Lexicon.md)** — the shared data model for words: features for nouns, verbs, adjectives, and chunks; the copula-behavior model that solves ser/estar; semantic tags for sensible slot filling; content sources and target sizes.
- **[03-Vocab-Trainer.md](03-Vocab-Trainer.md)** — vocab selection sources (PCIC + frequency cross-check), unit structure, exercise types, spaced repetition, German-specific pitfalls (false friends, gender clashes).
- **[04-Verb-Trainer.md](04-Verb-Trainer.md)** — the tense/mood inventory per level, irregularity classes, the verb database (~120 verbs), and drill formats.
- **[05-Template-Sentences.md](05-Template-Sentences.md)** — the template engine: template format, slot constraints, variation axes, the morphology rules needed for correct output, dual DE/ES rendering, difficulty gating, and how it integrates with the other two trainers.
- **[06-Tech.md](06-Tech.md)** — TypeScript; pure engine library + thin adapters (CLI now, web/PWA later); content as YAML files; explicit dependency list.

## Guiding decisions

- **Variety:** European Spanish (with *vosotros*) — confirmed. Latin American variants noted in content where relevant, not drilled.
- **Direction:** production-focused (German prompt → Spanish answer) for templates; both directions for vocab.
- **Persistence:** the entire learner state in one human-editable `user.yaml` (see below) — debugging, hand-editing, and syncing are first-class.
- **Interface:** none for now. All exercises are plain typed text, testable in a terminal. Answer checking normalizes away diacritics entirely (*á=a*, *ñ=n*, case-insensitive, punctuation ignored) — feedback always *displays* the correctly accented form. Since every distinction the learner must produce is decided by the German prompt (not by an accent), stripped comparison stays unambiguous.
- **Generation:** deterministic, rule-based, offline-capable. Templates and lexicon are hand-authored content; the app only *combines* them. No LLM at runtime.
- **Canonical sources:** Instituto Cervantes Plan Curricular (PCIC) inventories for both grammar and vocabulary scope, cross-checked against frequency lists.

## Progress

Content-building work, in order:

- [x] Finalize curriculum: module list, grammar point graph with prerequisites (01) — `content/grammar.yaml`, 56 points
- [x] Finalize lexicon schema: feature sets per word class, semantic tag set (02) — `src/engine/types.ts`
- [x] Curate A1 lexicon (~700 entries) with German glosses and features (02, 03) — m01–m10, ~360 entries + verbs
- [x] Curate A2 lexicon (02, 03) — m11–m20, ~230 entries (target was larger; extend over time)
- [x] Build verb database: A1/A2 forms, irregularity classes (04) — `content/verbs.yaml`, 66 verbs (extend toward ~120)
- [x] Author ser/estar adjective table with copula-dependent glosses (02) — 6 shifters, estar-states, both-adjectives in m08/m20
- [x] Define morphology rule inventory (05) — implemented in `src/engine/{conjugate,morph}.ts` incl. clitic-attachment accents, el-agua rule
- [x] Author templates with slot constraints and variation axes (05) — 22 templates; tense axes make them grow through A2. **Still thin** vs. the 10–20/module target; two-clause templates (M15 contrast) and comparatives not yet modeled
- [x] Define vocab unit structure and SRS behavior (03) — SM-2-lite over due/interval/ease
- [x] Define verb drill formats and progression (04) — single-form drill implemented; paradigm sprint/pattern batch = focus presets, not yet dedicated modes
- [x] Define answer normalization and accepted-alternatives checking (05) — `src/engine/check.ts` + generator-known alternatives
- [x] Define learner model & knowledge settings (00, 01) — prerequisite cascade, module toggles in settings TUI
- [x] Define user.yaml schema (00) — grammar known-set, vocab/verb-cell SRS, presets; sorted keys
- [x] Define focused-practice selectors (00, 03, 04, 05) — grammar point (with `*`), module, tags; presets in user.yaml
- [x] Validation pass: `npm run validate [--samples]` generates from every template; two review rounds done (this session)
- [ ] Native-speaker review of generated Spanish across all templates × tenses
- [ ] German-side review: prompts unambiguous, glosses idiomatic (machine-generated German is understandable but occasionally stiff)
