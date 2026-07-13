# amigo — Design Handoff Brief (mobile / web app)

> Everything a designer needs to mock up the app. All example strings below are **real content pulled from the app**, not placeholders — use them verbatim in mockups.

---

## 1. Product in one line

A spaced-repetition Spanish trainer (levels **A1/A2**) built for **German native speakers**. Three practice modes over one shared, curriculum-aware content engine. Offline, deterministic, no accounts, no gamification fluff. Currently a German terminal app — you are designing its mobile-first web/PWA future.

## 2. Who it's for & the tone

- **Adult, serious self-learners.** They want efficiency, transparency, and correctness — not badges, mascots, or streak-anxiety. Gentle progress feedback is welcome; casino mechanics are not.
- **Aesthetic direction:** calm, focused, confident, uncluttered. Lots of whitespace. Typography-led. One primary action per screen. Feels like a well-made tool, not a toy. A restrained accent color (think a warm terracotta/Spanish clay or a deep teal) over a near-neutral base. Must ship **light and dark**.
- **The hero moment** is the practice card: a prompt, an input, and instant honest feedback. Optimize that loop above all else.

## 3. The one hard constraint: it's bilingual

Two languages coexist on almost every screen. Make the relationship unmistakable:

- **German = the interface + all prompts/instructions/grammar notes** (the language the learner thinks in).
- **Spanish = the answer / target content** (what they're producing or reading).
- Suggested visual convention: German in the neutral text color; **Spanish target answers in the accent color and/or a slightly distinct type treatment**. Keep it consistent so a learner instantly parses "this is the thing I'm learning."
- Spanish uses accents (á é í ó ú ñ ü) and inverted punctuation (¿ ¡). Fonts must support them. Answers are checked accent-*insensitively* (see §6) but always **displayed** with correct accents.

---

## 4. Screens to design

### 4.1 Home / Dashboard
Entry point. Shows status + launches the three trainers.

Real status line content:
- `Grammatik: 15 / 56` (grammar points known)
- `Aktuelles Modul: M04 — Wichtige unregelmäßige Verben`
- Active focus chip (if any), e.g. `Fokus: reflexive Verben` — dismissible.

Three trainer entry points (this is the primary navigation):
| Label (DE) | What it is | Icon idea |
|---|---|---|
| **Vokabeln** | Vocabulary flashcards | word/book |
| **Verbformen** | Verb conjugation drills | conjugation table |
| **Sätze** | Generated sentence translation | speech/sentence |

Secondary actions: **Modul freischalten** (unlock next module), **Fokus** (focused practice), **Einstellungen** (settings).

First-run empty state (real copy):
> „Willkommen! Noch nichts freigeschaltet — starte mit *Modul freischalten*, oder markiere Bekanntes unter *Einstellungen*."

### 4.2 Practice session (shared shell for all 3 trainers)
A session is a **fixed run of 8 cards**. Design a progress indicator like `[3 / 8]`. Each card = prompt → free-text answer → reveal/feedback → next. Needs a big text input (mobile keyboard!), a submit action, and a prominent reveal state.

Consider: a special Spanish-character helper (á é í ó ú ñ ¿ ¡) above the keyboard, even though missing accents are still accepted — it teaches correct spelling.

#### Card type A — Vokabeln (production)
Prompt is a German noun *with article*; answer is Spanish *with article* (article is mandatory and part of the answer).

Real cards:
| Prompt (DE) | Correct answer (ES) |
|---|---|
| die Stadt | la ciudad |
| der Mann | el hombre |
| die Familie | la familia |
| der Kellner | el camarero |
| das Kind | el niño |
| der Journalist | el periodista |

Adjective/verb production cards show just the German gloss:
| Prompt (DE) | Answer (ES) |
|---|---|
| sympathisch | simpático |
| intelligent | inteligente |
| reisen | viajar |

#### Card type B — Vokabeln (gender drill)
A micro-card testing only the article. Design it visually lighter/faster than a full card.
| Prompt (DE) | Answer |
|---|---|
| el oder la: … ciudad? | la |
| el oder la: … periodista? | el/la |
| el oder la: … país? | el |

#### Card type C — Verbformen (German → Spanish, the default)
Prompt is a conjugated German verb phrase; produce the matching Spanish form.
| Prompt (DE) | Answer (ES) |
|---|---|
| ihr sprecht | habláis |
| wir sind (Eigenschaft) | somos |
| sie isst | come |
| du reist | viajas |
| ihr wart (Ort) | estabais |

#### Card type D — Verbformen (reverse, Spanish → German)
A configurable share of verb cards run reversed. Show a small `(auf Deutsch)` hint so the direction is obvious.
| Prompt (ES) | Answer (DE) |
|---|---|
| habláis  *(auf Deutsch)* | ihr sprecht |
| me gusta  *(auf Deutsch)* | mir gefällt |

#### Card type E — Sätze (the signature mode)
Prompt: `Übersetze: <German sentence>` → produce the full Spanish sentence. These are **generated**, so the pool is effectively infinite. Real pairs (use a spread of these):

| German prompt | Spanish answer |
|---|---|
| Sie sind fleißig. | Son trabajadores. |
| Der Nachbar ist im Büro. | El vecino está en la oficina. |
| Die Studenten sind nicht im Supermarkt. | Los estudiantes no están en el supermercado. |
| Wo ist Ana? | ¿Dónde está Ana? |
| Im Haus gibt es ein Handy. | En la casa hay un móvil. |
| Wir haben diese Woche getanzt. | Hemos bailado esta semana. |
| Du hast letztes Jahr eine Karte gebraucht. | Necesitaste una tarjeta el año pasado. |
| Wir haben Durst. | Tenemos sed. |
| Ihr geht montags ins Kino. | Vais al cine los lunes. |
| Ihm gefällt das Armband nicht. | No le gusta la pulsera. |
| Ich lese gerade. | Estoy leyendo ahora mismo. |
| Ich höre euch nicht. | No os escucho. |
| Ich würde gern reisen. | Me gustaría viajar. |
| Nehmt die Torte! | ¡Tomad la tarta! |
| Zieht euch an! | ¡Vestíos! |
| Sie wohnen seit zwei Jahren in der Stadt. | Viven en la ciudad desde hace dos años. |

**Showcase the intelligence (ser vs. estar).** The engine tracks word *senses*: *aburrido* = "langweilig" with **ser**, "gelangweilt" with **estar**. The German prompt disambiguates automatically. Design a subtle "why" affordance on the feedback screen — a tappable note that reveals the grammar rule behind the sentence. Real note strings:
- „ser für Eigenschaften: Was jemand IST, nicht wie er sich fühlt."
- „Ort → immer estar, nie ser."
- „hay = es gibt (unbestimmt). Wo etwas Bestimmtes ist → está."
- „Indefinido von ser und ir ist identisch (fui)!"

### 4.3 Feedback state (the most-seen UI in the app)
After submit, two outcomes. Keep it fast, honest, non-punishing.

- **Correct:** `✓` + the canonical Spanish (properly accented). Optional grammar note below.
  - e.g. `✓ la ciudad`
- **Wrong:** `✗ richtig: <answer>` — show the correct form clearly. Always show the note on wrong answers when one exists.
  - e.g. `✗ richtig: está en la oficina`  ·  note: „Ort → immer estar, nie ser."
- Accent-only differences count as **correct** — but consider a soft hint ("Achte auf die Akzente: está") since the display always shows the accented form.

### 4.4 Module map / progression ("Modul freischalten")
The curriculum is **20 modules (M01–M20)**, ~10 A1 + ~10 A2, each bundling grammar points + a vocab theme. Modules have **prerequisites** — unlocking one auto-pulls its prereqs. Design this as a **path/journey** or a vertical list of module cards with a clear "next up" and locked/unlocked/in-progress states.

Full real module list:

**A1**
- M01 — Identität: ser + Nomen & Artikel
- M02 — Ort & Existenz: estar + hay
- M03 — Regelmäßiges Präsens
- M04 — Wichtige unregelmäßige Verben
- M05 — Verben mit Stammwechsel
- M06 — Reflexive Verben & Tagesablauf
- M07 — gustar & Co.
- M08 — ser vs. estar bei Adjektiven
- M09 — Verlaufsform & direkte Objekte
- M10 — Begleiter & erste Vergleiche

**A2**
- M11 — Pretérito perfecto
- M12 — Pretérito indefinido (regelmäßig)
- M13 — Indefinido: unregelmäßige Verben
- M14 — Imperfecto
- M15 — Indefinido vs. Imperfecto
- M16 — Futur & höfliche Wünsche
- M17 — Imperativ & Wegbeschreibung
- M18 — Doppelte Objektpronomen
- M19 — Vergleich, Adverbien, Gewohnheiten
- M20 — Konnektoren & komplexe Sätze

Unlock-confirmation screen lists the module's grammar points (real, for M04):
> **M04 — Wichtige unregelmäßige Verben**
> · Unregelmäßige Verben (tener, ir, hacer …)
> · tener-Wendungen (hambre, años …)
> · ir a + Infinitiv (nahe Zukunft)
> · tener que / hay que + Infinitiv
> [ Freischalten ]

Completion state: „Alles freigeschaltet — ¡enhorabuena!"

### 4.5 Settings / Knowledge editor ("Einstellungen")
This is the "customize to what I already know" screen — a checklist mirroring the curriculum. Ticking a module/point marks it *known* (unlocked without drilling). State per module: **✓ fully known · ~ partially · ☐ unknown**. Show progress like `(3/5)`.

Real module rows:
```
[✓] M01  Identität: ser + Nomen & Artikel        (5/5)
[~] M02  Ort & Existenz: estar + hay             (2/3)
[ ] M03  Regelmäßiges Präsens                    (0/3)
```

Drill-down into a module shows individual grammar points as checkboxes (real, M01):
```
[✓] Genus & Plural der Nomen            (noun.gender)
[✓] Bestimmter & unbestimmter Artikel   (articles)
[✓] Adjektiv-Angleichung (Genus/Numerus)(adj.agreement)
[ ] ser: Identität, Herkunft, Beruf     (copula.ser.identity)
[✓] Subjektpronomen (und ihr Weglassen) (pron.subject)
```
Behavior to reflect in UI: checking a point auto-checks its prerequisites; unchecking a prerequisite unchecks dependents. Consider showing prereq relationships.

Also in settings:
- **Reverse-verb share**: a slider 0–100% ("Anteil Verb-Drills Spanisch→Deutsch").
- **Shortcuts**: "Ich kann ganz A1" (bulk-check M01–M10), per-module one-click.
- Note the app's transparency ethos: all state lives in a human-readable `user.yaml` the user can export/hand-edit. Advanced/optional affordance — maybe an "Export / Import Lernstand" item. Don't make it central on mobile.

### 4.6 Focused practice ("Fokus")
Narrow a session to a subset. A focus is a filter; it changes *what* is drilled, not *how*. Combinable and **savable as named presets**.

Focus dimensions with real values:
- **Grammar point** — e.g. `verb.reflexive` (reflexive Verben), `copula.contrast` (ser vs. estar), `gustar`.
- **Module** — e.g. only M07.
- **Tag / theme** — e.g. `nationality`, `profession`, `family-role`, `place`, `gender_trap` (Genus-Fallen), `false_friend`.

Saved preset example: `reflexive-week`. Present focus as chips/toggles with a "Speichern als Preset" action and a preset picker. When a focus is active it shows on the Home status line and inside sessions.

---

## 5. Content bank for realistic mockups

### Real vocabulary (DE → ES, with gender)
| DE | ES | note |
|---|---|---|
| der Mann | el hombre | |
| die Frau | la mujer | |
| das Kind | el niño / la niña | |
| der Freund | el amigo | |
| der Student | el/la estudiante | same form both genders |
| der Vater | el padre | los padres = die Eltern |
| die Mutter | la madre | |
| der Bruder | el hermano | hermana = Schwester |
| die Familie | la familia | |
| der Arzt | el médico | |
| der Lehrer | el profesor | |
| der Kellner | el camarero | |
| der Journalist | el periodista | **Genus-Falle**: trotz -a maskulin |
| das Land | el país | |
| die Stadt | la ciudad | |

Adjectives (nationalities & traits): alemán (deutsch), español (spanisch), inglés (englisch), francés (französisch), simpático (sympathisch), inteligente (intelligent), alto (groß), bajo (klein), joven (jung).

Chunks/phrases: hola (hallo), buenos días (guten Morgen), mucho gusto (freut mich).

### Real verbs (with German gloss) for the verb trainer
ser — sein (Eigenschaft, Herkunft) · estar — sein (Ort, Zustand) · ir — gehen, fahren · tener — haben · hay — es gibt · hablar — sprechen · comer — essen · viajar — reisen · gustar — gefallen · levantarse — aufstehen.

Tenses drilled across A1/A2 (labels for any tense-selector UI): **Presente, Pretérito perfecto, Pretérito indefinido, Imperfecto, Futuro, ir a + Infinitiv, Imperativo, Condicional (gustaría)**. Persons: yo / tú / él-ella / nosotros / vosotros / ellos (note: **vosotros** is included — European Spanish).

### Content scale (for sizing lists, search, pagination)
- 20 modules · 56 grammar points · **663 lexicon entries** · 66 verbs · 22 sentence templates (→ hundreds of generated sentences).

---

## 6. Rules that affect UI behavior

1. **Session length is 8 cards.** Design a start → 8 → summary rhythm. (A short end-of-session summary screen — correct count, what to do next — is a good addition even though the terminal app lacks one.)
2. **Answers are accent/case/punctuation-insensitive** (`esta` = `está`, `n` = `ñ`), but the **display is always correctly accented**. Never mark a missing accent as wrong; do teach the correct spelling on reveal.
3. **Article is part of vocab answers** (la ciudad, not ciudad).
4. **Spaced repetition under the hood** (SM-2-lite: due date / interval / ease per item). You don't design the algorithm, but you may surface "due today" counts, and per-item state is user-inspectable/editable (transparency is a product value).
5. **A correct sentence also credits its component words & verbs** (cross-training). Optional: hint this in the sentence feedback.
6. **Everything is offline & deterministic.** No spinners for network, no "syncing," no login. (If accounts/sync are ever added, that's out of current scope.)

## 7. Screen inventory checklist for the mockup
- [ ] Home / dashboard (status + 3 trainers + secondary actions)
- [ ] First-run / empty state
- [ ] Practice card — vocab production
- [ ] Practice card — gender drill (light variant)
- [ ] Practice card — verb (DE→ES)
- [ ] Practice card — verb reverse (ES→DE)
- [ ] Practice card — sentence translation
- [ ] Feedback state — correct
- [ ] Feedback state — wrong (with grammar note)
- [ ] Grammar-note / "why" reveal (ser vs. estar showcase)
- [ ] End-of-session summary (proposed new screen)
- [ ] Module map / progression + unlock confirmation
- [ ] Settings — module checklist + point drill-down
- [ ] Focus selection + save-preset + preset picker
- [ ] Light + dark theme for all of the above

## 8. Explicitly out of scope (don't design these)
Accounts/auth, social features, leaderboards, streaks/XP, audio/pronunciation, images/illustrations of vocab, an LLM chat tutor, payments. Keep it lean — that's the product's identity.
