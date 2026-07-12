# 05 — Template Sentence Engine

The differentiator. Instead of a fixed sentence bank, we author **templates** — sentence skeletons with typed slots — and generate concrete sentence pairs (German prompt → Spanish solution) on the fly from the lexicon. Variety comes from slot fillers × variation axes; correctness comes from hand-authored structure + rule-based morphology; difficulty comes from grammar gating.

## Template anatomy

Illustrative content model (format details are an implementation concern):

```yaml
id: tpl.copula.state
es: "{subj} {estar} {adj}"
de: "{subj_de} {sein} {adj_de}"
slots:
  subj: {tags: [human], sources: [pronoun, name, family-role]}
  adj:  {type: adjective, copula: estar, senses: estar}   # only estar-compatible senses
axes:
  person: [1s, 2s, 3s, 1p, 2p, 3p]   # 2p = vosotros (European Spanish)
  number: from subj
  tense: [presente]            # grows: perfecto/indefinido/imperfecto join when unlocked
  polarity: [pos, neg]
requires: [copula.estar.state, adj.agreement]
level: A1
module: M08
```

One template × 5 persons × 2 polarities × ~15 eligible adjectives × growing tense set = hundreds of distinct sentences from one authored unit — and the learner meets *estoy cansada*, *no estaban contentos*, *¿has estado enfermo?* instead of the same three fixed sentences.

**Slot fillers** come from the lexicon filtered by the slot's constraints (tags, copula compatibility, level ≤ learner's). **Both renderings are generated from the same filled structure**, so prompt and solution can't drift apart. The German side needs its own small morphology (article/adjective inflection by case & gender, verb conjugation) — regular, table-driven, and safe because German output only needs to be *understood* by a native speaker, never scored.

## Solving ser/estar (and friends) — the sense principle

A template never references an ambiguous *word*; it references a **sense** (see 02-Lexicon). The pipeline is: pick sense → generate Spanish from its Spanish side → generate German from its German gloss. Since German lexicalizes the ser/estar split with different words (*langweilig/gelangweilt, schlau/bereit, reich/lecker*), the generated prompt is inherently unambiguous — no grammar explanation needed at prompt time, the explanation appears in feedback.

The same principle handles other one-to-many mappings:

- **saber vs. conocer** — *wissen/können* vs. *kennen*: verbs are senses with valence (*saber + inf/clause*, *conocer + person/place*), German gloss disambiguates.
- **por vs. para** — at A2 handled as chunks and sense-tagged prepositions (*für wen → para*, *Grund/durch → por*, *por la mañana* as time chunk); the systematic contrast is B1.
- **pedir vs. preguntar** — *bestellen, bitten um* vs. *fragen*.
- **ir vs. venir**, **llevar vs. traer** — deixis noted in gloss (*hingehen/herkommen*).
- **indefinido vs. imperfecto** (M15) — the "sense" is the *frame*: two-clause templates carry aspect roles (background clause / event clause), and German cue words (*gerade, immer, plötzlich, als, während*) are part of the German rendering so the prompt decides the tense.

**Design rule: every distinction the learner must produce is decided by the German prompt, never by hidden convention.** If we can't write a German prompt that forces exactly one Spanish structure (modulo accepted alternatives), the template is broken — this is the #1 review criterion.

## Morphology rules (Spanish side)

The closed rule set the generator must apply — this list is the checklist for content review:

1. Verb conjugation (shared with verb trainer database)
2. Noun–adjective–article agreement (gender/number)
3. Contractions *a+el→al*, *de+el→del*
4. Apocope: *buen, gran, primer, algún/ningún, un* before masc. sg. noun
5. Personal *a* insertion when a DO slot is filled with `[human]`
6. Clitic placement: before finite verb; attached to infinitive/gerund/affirmative imperative; IO before DO; *le(s)→se* before *lo/la*; written accent on attachment (*dámelo, levántate*)
7. Gustar-type inversion: experiencer clitic + verb agrees with theme; optional *a mí/a Juan* doubling
8. Question marks ¿…? and accented question words
9. Orthographic verb changes (*busqué, llegué, empecé*)
10. Euphony: *y→e* before i-, *o→u* before o- (rare at A-level but cheap)
11. Copula selection is **never** a morphology rule — it's fixed by the template/sense (see above)

Anything not expressible in these rules doesn't get templated — it becomes a chunk (see 02).

## Difficulty & progression

- A template requires a set of grammar points (`requires:`); it's **eligible** once all are unlocked — whether by module progress or by being marked known in the knowledge settings (00). Axes also gate per-value (the *tense* axis only offers unlocked tenses).
- Difficulty score per generated sentence = f(number of grammar points, clause count, irregular forms present, sentence length). Selection targets a difficulty band around the learner's level, weighted toward: recently unlocked grammar (consolidation), SRS-due vocab, weak verb cells (from 04).
- Old templates never retire — they get *harder* as axes grow, which is exactly the "template sentences that grow with the learner" idea.
- **Focused practice** (00): a focus on grammar points restricts the pool to templates *requiring* one of them (e.g. `verb.reflexive` → only reflexive-verb templates); a focus on themes/tags biases slot filling to matching words. Selection weighting within the pool is unchanged.

## Exercise modes (same generated sentence, different demands — all typed, terminal-friendly)

1. **Full translation:** German prompt → type the Spanish sentence. The main mode.
2. **Cloze:** Spanish sentence with one slot blanked, lemma given in brackets → forces morphology (*"Ayer yo ___ (ir) al cine"*).
3. **Decision point:** the sentence with only the critical choice blanked — type *es* or *está*, *fue* or *era*, *por* or *para*.

**Answer checking:** compare after normalization (strip diacritics incl. *ñ→n*, lowercase, ignore punctuation). The generator knows every alternative it would also have produced for the same prompt (synonymous fillers, optional subject pronoun, *both_same* copulas, valid word-order variants) and accepts exactly those — nothing else. Feedback always displays the fully accented, punctuated solution, with the diff highlighted.

## Authoring & quality control

- **Volume:** 10–20 templates per module (≈300 total for A1+A2). Authored by hand — this is the app's core content asset.
- **Validation:** for every template, exhaustively generate all combinations (bounded — slots × axes are finite) and review: grammaticality (rules applied right), naturalness (no *"El abuelo está embarazado"* — fix via tags, gender restriction, `gradable`, or slot constraints), German prompt unambiguity, register.
- **Review loop:** native Spanish speaker reviews Spanish output; German native reviews prompts. Every reported bad sentence becomes a constraint fix (tag, sense split, or slot restriction) — the fix removes a *class* of bad sentences, not one.
- Optional: an LLM can *assist offline authoring/review* (drafting templates, flagging unnatural combinations) — never at runtime, and every template ships human-reviewed.

## Integration summary

- Slot filling prefers SRS-due vocab (03) → sentences double as vocab review.
- Cloze mode prefers weak verb cells (04) → sentences double as conjugation practice.
- Grammar gating follows the module graph (01).
- All disambiguation flows from lexicon senses (02).
