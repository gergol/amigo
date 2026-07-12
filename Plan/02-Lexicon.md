# 02 — The Shared Lexicon

One lexicon feeds all three trainers. Every entry carries enough grammatical and semantic annotation that the template engine can (a) inflect it correctly, (b) combine it only in ways that make sense, and (c) render an unambiguous German prompt. Format sketches below are illustrative content models, not code.

## Entry types & features

### Nouns

```yaml
lemma: coche
gender: m                # m | f | m/f (el/la estudiante) | pair (el niño/la niña)
plural: regular          # regular | -es | irregular:<form> | invariable
gloss_de: Auto (n)       # German gloss WITH German gender — the vocab card teaches both genders
tags: [thing, vehicle]   # semantic tags, see tag set below
level: A1
theme: ciudad-transporte
notes_de: "🇩🇪 'carro' in Lateinamerika"   # optional learner-facing note
```

Special cases to model: gender-ambivalent professions (*el/la médico/a*), false-gender traps vs. German (*el problema, la mano, el mapa* — flag with `gender_trap: true` so the vocab trainer can drill them extra), invariable plurals (*el lunes/los lunes*).

### Verbs

```yaml
lemma: pedir
class: ir                        # ar | er | ir
irregularities: [e>i]            # stem-change class, or named pattern: [g-yo], [zc-yo], [strong-pret:pid-], …
gerund: pidiendo                 # only if irregular
participle: null                 # only if irregular
reflexive: false
valence:                         # what the verb combines with — drives slot structure
  subject: [human]
  object: {role: do, tags: [food, drink, thing], optional: false}
  # other patterns: {role: io}, {prep: "a", tags: [place]}, {inf: true} for modals,
  # gustar_type: true (experiencer as IO, theme as subject)
gloss_de: bestellen; bitten um
level: A1
theme: restaurante
```

The ~120-verb database with full A1/A2 forms lives in the verb trainer (04); the lexicon holds lemma, class, irregularity pattern, and valence. Forms are *generated* from class + pattern, with an explicit override table for true irregulars (*ser, ir, estar, haber…*).

### Adjectives — and the ser/estar model

This is the core trick of the whole app. Each adjective declares its **copula behavior**:

```yaml
lemma: aburrido
agreement: o/a                   # o/a | e | consonant | invariable
copula: shift                    # ser_only | estar_only | both_same | shift
senses:
  - copula: ser
    gloss_de: langweilig         # a boring person/thing
    tags_applies_to: [human, thing, event]
  - copula: estar
    gloss_de: gelangweilt        # a bored person
    tags_applies_to: [human, animal]
level: A1
theme: caracter-estados
```

The four copula classes:

| class | behavior | examples (A1/A2 subset) |
|---|---|---|
| `ser_only` | inherent trait, *estar* would be wrong or B2-marked | *inteligente, alemán, importante, imposible* |
| `estar_only` | state only | *contento, enfadado, roto, abierto, cerrado, cansado, enfermo, ocupado, embarazada* |
| `both_same` | both fine, meaning barely shifts (trait vs. current impression) | *guapo, tranquilo, nervioso, triste, feliz, gordo, delgado* |
| `shift` | meaning changes with copula → **two senses, two German glosses** | *aburrido (langweilig/gelangweilt), listo (schlau/bereit), rico (reich/lecker), malo (schlecht/krank), bueno (gut/lecker)* |

Why this solves the problem: a template never asks "translate *aburrido*". It instantiates **one sense**, and the German prompt is generated from that sense's gloss. *"Der Film ist langweilig"* can only ever produce *"La película es aburrida"*; *"Ich bin gelangweilt"* only *"Estoy aburrido/a"*. German conveniently uses different words exactly where Spanish switches copula, so prompts are never ambiguous. For `both_same` adjectives, templates accept **either** copula as correct (with a hint about nuance).

Additional adjective features: apocope (`bueno→buen, grande→gran, primero→primer` before nouns), position (default post-nominal; the few pre-nominal ones flagged), gradability (blocks *muy embarazada*-type nonsense: `gradable: false`), gender restriction (`gender: f` on *embarazada* — blocks *el abuelo está embarazado*).

### Chunks / multiword items

Fixed expressions stored whole, with a slot where useful: *por favor, ¿qué tal?, hace frío, tener ganas de + inf, ir de compras, me gustaría + inf, ¿cómo se dice…?* (impersonal *se* stays a chunk at A-level, not a grammar point). Tagged with level/theme like words; the template engine treats them as atoms.

## Semantic tag set

Coarse on purpose — just enough to prevent nonsense (*la mesa está gelangweilt*, *como un banco*), not an ontology. One tier, a word can carry several:

`human, animal, thing, place, food, drink, clothing, bodypart, vehicle, time-expr, event, activity, abstract, weather, profession, nationality, family-role`

Selection rule: a slot lists allowed tags; a filler must match at least one. Verb valence and adjective `tags_applies_to` use the same set. If generated sentences still come out semantically odd in review, we refine tags *locally* (add a tag, split a tag) rather than building a deeper hierarchy.

## Sources & target sizes

- **Scope/authority:** [PCIC nociones específicas A1–A2](https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/09_nociones_especificas_inventario_a1-a2.htm) (thematic, official) + [PCIC nociones generales](https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/08_nociones_generales_inventario_a1-a2.htm) (quantity, time, etc.)
- **Frequency sanity check:** [wordfreq](https://github.com/rspeer/wordfreq) or [doozan/spanish_data](https://github.com/doozan/spanish_data) (frequency + lemma data) — PCIC items that are rare in practice get deprioritized, high-frequency gaps get added.
- **German glosses:** hand-curated (automatic translation is not acceptable for the shift-adjectives and false friends).
- **Targets:** A1 ≈ **700 entries**, A2 ≈ **+1,300** (≈2,000 cumulative) — in line with common CEFR estimates. Each entry assigned to exactly one theme/module for teaching order; tags are independent of theme.

## Curation workflow

1. Extract PCIC A1/A2 inventory per theme → raw candidate list.
2. Cross-check against frequency list; trim/extend.
3. Annotate features (gender, class, valence, copula behavior, tags) — the closed classes (shift-adjectives, irregular verbs, gender traps, false friends) are small and get hand-crafted extra care.
4. Add German glosses incl. German gender; write `notes_de` for traps.
5. Native-speaker + German-teacher review pass.
