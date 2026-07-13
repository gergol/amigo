# 04 — Verb Form Trainer

Drills conjugation until it's automatic. Content = a verb database + a form inventory + drill formats. The same data powers the template engine's morphology, so a form is never taught in the trainer that the generator would produce differently.

## Form inventory (what's in scope for A1/A2)

| Form | Persons | Unlocked in |
|---|---|---|
| Presente | all 6 | M03–M06 |
| Estar + gerundio | all 6 | M09 |
| Ir a + infinitivo | all 6 | M04 |
| Pretérito perfecto | all 6 | M11 |
| Pretérito indefinido | all 6 | M12–M13 |
| Pretérito imperfecto | all 6 | M14 |
| Futuro simple | all 6 | M16 |
| Imperativo afirmativo | tú, usted, vosotros, ustedes | M17 |
| (chunk) me gustaría | fixed | M16 |

*Vosotros* included (European Spanish, see 00 open question). Negative imperative, subjunctive, conditional paradigm: B1, out of scope.

## Verb database (~120 verbs)

All A1/A2 verbs from the lexicon, each with:

- class (*-ar/-er/-ir*), irregularity patterns (named, reusable):
  - **Stem changes:** e→ie, o→ue, e→i, u→ue
  - **Yo-forms:** *-go* (*hago, pongo, salgo, tengo, vengo, digo*), *-zco* (*conozco*), *doy/sé/veo/soy/estoy/voy*
  - **Strong preterites:** stem + flat endings (*tuve, estuve, pude, puse, hice, quise, vine, dije, traje*), *ser/ir → fui*, *dar → di*
  - **Irregular participles:** *hecho, dicho, visto, escrito, puesto, vuelto, abierto, roto*
  - **Irregular gerunds:** *leyendo, oyendo, durmiendo, pidiendo, viniendo*
  - **Irregular future stems:** *tendr-, podr-, pondr-, saldr-, vendr-, har-, dir-, sabr-, querr-, habr-*
  - **Fully irregular** (explicit form tables): *ser, estar, ir, haber*
  - **Orthographic changes** (produce, don't drill as "irregular"): *c→qu, g→gu, z→c* before *e* (*busqué, llegué, empecé*)
- forms are generated from class + patterns; explicit tables only where generation fails. A verb's irregularity classes double as its **drill grouping** — learners practice *tener/venir/poner* strong preterites together, like German strong-verb rows.

## Drill formats

1. **Single form:** the cell is cued by its **German translation** — *sie sprechen* → *hablan*, *er wohnt gleich* → *va a vivir*. The German conjugation carries person and tense; a time adverb (*gestern/früher/schon/gerade/gleich*) disambiguates tenses that share a German form (perfecto/indefinido/imperfecto → Perfekt; presente/estar+ger/ir-a-inf → Präsens). A configurable share of drills (`settings.reverseVerbShare`, default 25%) run the **reverse direction** — Spanish form shown, produce the German (any of er/sie/es accepted for 3rd-person singular). Weighted sampling: recently unlocked tenses and known-weak cells are drawn more often.
2. **Paradigm sprint:** one verb × one tense, all six persons against the clock.
3. **Pattern batch:** all verbs sharing an irregularity class, mixed persons — cements the pattern, not the individual verb.
4. **Tense contrast:** same verb + person, two tenses side by side (*hablé / hablaba*) with a German cue sentence deciding which is asked — direct feed-in for M15.
5. **Boot-pattern check:** stem-changers with persons 1pl/2pl deliberately overrepresented (the cells learners get wrong).

Per-cell (verb × tense × person) knowledge state, SRS-scheduled like vocab and stored in `user.yaml` (editable like everything else). Weak cells leak into the template engine: sentences get generated that force exactly those forms.

**Focused practice** (00) maps naturally here: a focus can select an irregularity class (strong preterites, boot-pattern verbs), a tense, a verb feature (`reflexive: true`), or a single verb — drill formats 2–5 are essentially pre-built focus presets.

## German-speaker notes baked into drills

- Accent = meaning: since typed input ignores accents (see 00), *hablo/habló* score identically — the asked tense is always fixed by the drill prompt, and feedback always displays the accented form, so the pair is still *seen* correctly even if never typed.
- No auxiliary choice in perfecto (always *haber*) — contrast card vs. German *sein*-Perfekt verbs (*ir, venir, morir*: *ist gegangen* → *ha ido*).
- Person endings make the Spanish pronoun optional — the answer is the bare form (*hablan*, not *ellos hablan*); the German cue supplies the person, so the drill is a real translation rather than a paradigm-table lookup.
