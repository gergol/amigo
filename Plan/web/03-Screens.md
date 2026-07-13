# 03 — Screens

Each screen is a Preact component under `src/web/screens/`, receiving app state + engine
callbacks as props. Layout/markup follow `amigo - App.dc.html` 1:1; **all mock data in
the design is replaced by live engine data** — the tables below are the mapping.

Global frame: a centered `max-width:468px` column with `min-height:100vh`,
`background:var(--color-bg)`, `box-shadow:var(--shadow-lg)` (from the design's outer
wrappers). Reuse DS classes (`.btn`, `.btn-primary/-secondary/-ghost/-icon/-block`,
`.input`, `.tag`, `.tag-outline`, `.dialog*`); one-off layout via inline `style`.

## Shared components (`src/web/components/`)

- **ProgressSegments** — 8 bars; `filled = index + (revealed?1:0)`; `accent` vs `divider`.
- **AccentKeys** — `['á','é','í','ó','ú','ñ','ü','¿','¡']`, each inserts into the input
  (append at caret). Shown above the Prüfen button for text cards. (Later: TTS/STT
  buttons slot in beside these.)
- **StatusCard** — grammar progress bar + current module + focus chip (Home).
- **TrainerRow** — icon tile + title + subtitle + chevron (Home, Settings vocab entry).
- **ModuleRow** — code + name + badge (✓ / "Freischalten" tag / lock), states from engine.
- **Checkbox** — 22px square, ✓ / ~ / empty, three border/bg states.
- **Chip** — pill toggle (Focus grammar/module/tag, Vocab theme filter).
- **VocabRow** — checkbox + de/note + es.
- **UnlockDialog** — modal over `.dialog-backdrop` listing a module's points.

Icons: inline the SVGs already present in the design markup (word/book, table, speech,
gear, chevrons, check, lock, search, bookmark). No icon library.

---

## Home (`screen==='home'`)

Header: `amigo` wordmark + `A1 · A2` kicker; gear button → `settings`.

- **First-run** when `user.grammar.known.length === 0`: centered
  "¡Bienvenido! / Willkommen bei amigo." + the real copy
  ("Noch nichts freigeschaltet — starte mit *Modul freischalten* …") + two buttons →
  `modules` / `settings`.
- **Normal:** StatusCard + three TrainerRows + footer buttons.

| Design placeholder | Real source |
|---|---|
| `15 / 56` + bar width | `user.grammar.known.length` / `allPoints(content).length`; bar `= known/total` |
| `M04 — Wichtige unregelmäßige Verben` | `id = currentModule(user, content)`; title = `modules.find(id).title` |
| `Fokus: {{focusActive}}` chip | active `focus` → join `grammar+modules+tags` labels; dismiss → `focus={}` |
| Vokabeln / Verbformen / Sätze rows | static labels; onClick → `session.start('vokabeln'|'verbformen'|'saetze', focus)` |
| footer `Modul freischalten` / `Fokus` | → `modules` / `focus` |

---

## Practice (`screen==='practice'`)

The shared shell for all trainers. Top: exit (✕) → `home`; ProgressSegments; row of
`counter` (`pad(index+1)+' / 08'`) + `cTag` chip (`card.tag`).

Center renders by `card.kind` (design's `isSentence/isVocab/isVerb/isVerbrev/isGender`):

- **sentence**: "Übersetze" kicker + `card.prompt` (heading).
- **vocab**: `card.prompt` (large) + optional italic `promptHint`.
- **verb**: "Konjugiere auf Spanisch" + `card.prompt`.
- **verbrev**: `card.prompt` in `--color-answer` (Spanish shown; answer is German).
- **gender**: "el · la" label + noun `card.prompt`.

Answer area (when `!revealed`):
- **gender** → two big buttons `el` / `la` → `pick('el'|'la')`.
- **else** → centered `.input` (bound to `session.input`), AccentKeys, `Prüfen` button →
  `submit`. Enter submits (design's `onKey`). Placeholder by kind:
  verbrev → "deutsche Form …", verb → "Verbform …", else "spanische Antwort …".

Feedback (when `revealed`):
- **correct**: ✓ ring (accent) + small `prompt` + `canonical` in `--color-answer`.
  If `lastAccent` → "Achte auf die Akzente: <canonical>". If `note` → a "warum?" ghost
  toggle revealing `note` in the accent-tinted callout.
- **wrong**: ✗ ring (`wrongColor` `#9e3b2a`, or a dark-mode-friendly red token) +
  "deine Antwort: <lastYour>" (struck) + "richtig" kicker + `canonical` + always show
  `note` in the callout when present.
- Footer button → `next` (label "Weiter", or "Ergebnis" on card 8).

Empty state (`card===null`): centered "Keine passenden … — erst ein Modul freischalten."
+ back-to-home button.

Data: entirely from the current `CardVM` (see 02). Grading + accent-hint + note all
already carried on the VM.

---

## Summary (`screen==='summary'`)

- "Sitzung beendet" kicker.
- Big `sumCorrect / 8` where `sumCorrect = results.filter(r=>r.correct).length`.
- `sumLine`: "N von 8 richtig".
- If any wrong: "Nochmal ansehen" list of `results.filter(!correct)` → `{de, es}` rows
  (`es` in `--color-answer`). If none: "¡Perfecto! Alles richtig."
- Footnote: "Richtige Sätze schreiben auch ihren Wörtern und Verben Fortschritt gut."
  (true — `gradeSentence` cross-credits; see `trainer.ts`).
- Buttons: "Nochmal üben" → `start(sameTrainer, focus)`; "Zur Übersicht" → `home`.

---

## Modules (`screen==='modules'`)

Linear progression map (mirrors CLI `unlockNext` — only the next module is unlockable).
Header: back → `home`; title; `unlockedCount / 20`.

Per module (A1 = M01–M10, A2 = M11–M20), state computed in order:
- `done` = `moduleKnown(user, content, id)` → ✓ badge, full opacity.
- first non-done = **next** → "Freischalten" tag badge, accent bg, click → open
  UnlockDialog (`unlock = id`).
- after next = **locked** → lock icon, dimmed (`opacity .55`), not clickable.

`unlockedCount` = count of `done` modules. UnlockDialog lists the module's points
(`m.points.map(p => p.de)`), "Abbrechen" closes, "Freischalten" →
`m.points.forEach(p => markKnown(user, content, p.id))`, `saveUser`, close, refresh.
Completion (all done): show "Alles freigeschaltet — ¡enhorabuena!".

---

## Settings (`screen==='settings'`)

Header: back → `home`; "Einstellungen".

1. **Knowledge editor** — "Was ich schon kann" + "Ich kann ganz A1" ghost button.
   - "Ich kann ganz A1" → for every point in M01–M10, `markKnown(user, content, p.id)`.
   - One SettingRow per module (all 20): mark = ✓ if all points known, ~ if some, empty
     if none; fraction `(known/total)` where
     `known = m.points.filter(p=>isKnown(user,p.id)).length`. Click → `detailModule=id`,
     `screen='detail'`.
2. **"Vokabeln, die ich kann"** TrainerRow → `screen='vocab'`; count
   `= knownVocabCount(user)` / `content.lexicon.length` (663).
3. **Reverse slider** — "Anteil Verb-Drills Spanisch → Deutsch",
   `Math.round(user.settings.reverseVerbShare*100)%`; onInput →
   `reverseVerbShare = value/100`, `saveUser`.
4. **Lernstand** — mentions `user.yaml` (in `--color-answer`); Export toggles a `<pre>`
   showing `exportYaml(user)`; Import opens a textarea → `importYaml` → replace `user`,
   `saveUser`. (Import can be a simple paste box; keep it minimal per brief §4.5.)

`knownVocabCount`: an entry is "known" when its SRS state is mature — define
`isVocabKnown(user, key) = (user.vocab[key]?.interval ?? 0) >= 90`. Count distinct
known keys across `vocabKeys(entry)` for all lexicon entries.

---

## Module detail (`screen==='detail'`, `detailModule`)

Header: back → `settings`; module title (`M.. — title`).
Explainer copy about the prerequisite cascade (verbatim from design).
One Checkbox row per `m.points`: checked = `isKnown(user, p.id)`; label = `p.de`; code =
`p.id` (monospace). Toggle → `isKnown ? markUnknown : markKnown` (both cascade
transitively per `learner.ts`), `saveUser`. Optional header action: "Modul komplett"
toggles all points at once (matches CLI whole-module toggle).

---

## Vocab-known editor (`screen==='vocab'`)

Header: back → `settings`; title; `{knownVocabCount} bekannt`. Search input (de/es) +
theme filter chips + list.

- **Theme chips** — derive labels from `LexEntry`:
  `Alle`, and groups from tags/kind — e.g. `Familie` (`family-role`), `Berufe`
  (`profession`), `Orte` (`place`), `Menschen` (`human` nouns), `Adjektive`
  (`kind==='adj'`), `Verben` (`kind==='verb'`), `Wendungen` (`kind==='chunk'`). Provide
  a small `theme(entry)` mapping fn. `Alle` = no filter.
- **Search** — case-insensitive substring over the German gloss and the Spanish form.
- **Rows** (`VocabRow`) — German (noun with article / gloss), italic `notes_de` if any,
  Spanish (`es` in `--color-answer`), checkbox = `isVocabKnown`. Toggle →
  set `user.vocab[key] = mature(today)` (known) or `delete user.vocab[key]` (unknown),
  `saveUser`. For multi-key entries (shift adjectives) toggle all `vocabKeys(entry)`.
- Header of list: "<theme|Alle Themen> · <count>" + "Alle hier als bekannt" ghost →
  mark every currently-filtered entry known.
- Empty filter result → "Keine Treffer."

The German prompt + Spanish form for a noun come from the same construction the engine
uses in `pickVocabCard` (article + lemma / `el/la` for `mf`); factor that into a shared
`displayForms(entry)` helper reused by both the editor and the trainer to stay
consistent.

---

## Focus (`screen==='focus'`)

Header: back → `home`; "Fokus". Explainer copy (verbatim). Three chip groups + presets.

| Group | Chips (real source) | Effect |
|---|---|---|
| Grammatikpunkt | known grammar points (`allPoints` filtered by `isKnown`), or a curated shortlist (`verb.reflexive`, `copula.*`, `gustar`) | toggles `focus.grammar[]` |
| Modul | all module ids `M01…M20` | toggles `focus.modules[]` |
| Tag / Thema | engine `Tag` union values (`nationality`, `profession`, `family-role`, `place`, `food`, …) | toggles `focus.tags[]` |

Note Open Question #1 (00): the design's `gender_trap` / `false_friend` chips aren't in
the `Tag` union — omit for v1 unless confirmed.

- **Presets** — list `Object.keys(user.presets)`; click loads `focus = user.presets[name]`.
  Name input + "Speichern" → `user.presets[name] = focus`, `saveUser`.
- Footer: "Fokus entfernen" → `focus={}`; "Fokus-Sitzung starten" →
  per Open Question #2 default: set `focus` active and return `home` (chip shows on
  Home; trainers then run focused). Confirm if you'd rather launch a trainer directly.

Chip on/off styling from the design (`accent-100` bg / `accent-800` text when on).

---

## Card-type → screen coverage checklist

- [ ] `sentence` prompt + feedback (+ note "warum?")
- [ ] `vocab` prompt (+ hint) + feedback
- [ ] `gender` el/la buttons + feedback
- [ ] `verb` (DE→ES) + feedback (wrong shows verb note)
- [ ] `verbrev` (ES→DE, `(auf Deutsch)`) + feedback
- [ ] correct / wrong / accent-hint / note callout all wired to `CardVM`
- [ ] dark mode: every Spanish target uses `--color-answer`, not `accent-800`
