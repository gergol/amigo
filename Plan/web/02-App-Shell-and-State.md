# 02 — App Shell, State & Session

All state is client-side. There is **no router** — one `screen` enum drives which
screen component renders (mirrors the design's `<sc-if value="{{ isHome }}">` blocks).

## Top-level state (`app.tsx`)

Held in a single Preact `useState`/`useReducer` (or a tiny module-level store with
`useSyncExternalStore`; `useReducer` is enough — anti-bloat). Shape:

```ts
type Screen =
  | 'home' | 'practice' | 'summary' | 'modules'
  | 'settings' | 'detail' | 'vocab' | 'focus'

interface AppState {
  screen: Screen
  user: UserState             // the live learner model (persisted, see store.ts)
  focus: Focus                // active focus filter ({} = none)
  session: SessionState | null
  detailModule: ModuleId | null   // which module the settings-detail screen shows
  unlock: ModuleId | null          // module whose unlock dialog is open (null = closed)
}
```

- `content` (the assembled `Content`) is a module-level constant from `content.ts`,
  not in state (never changes at runtime).
- `today = iso(new Date())` computed once at load (recompute on visibilitychange is a
  nice-to-have; not required for v1).
- `rnd = Math.random` passed to every engine `pick*` call.
- Navigation = `setState({ screen })`. Back buttons set `screen` to the parent.

Persistence rule: **after every mutation of `user`** (grade, mark known/unknown,
unlock, settings change, vocab-known toggle, preset save) call `saveUser(user)`.
localStorage writes are cheap; this gives durability without a "save" button.

## Engine adapter (`engine.ts`)

One barrel re-exporting the functions listed in 01 so screens import from
`../engine` and never reach into `src/engine/*` paths directly.

## Web store (`store.ts`)

Browser analogue of `src/cli/store.ts` (user side only — content comes prebuilt).
Keep the **`user.yaml` format** as the on-disk truth so Export/Import and the "it's all
one human-readable file" promise hold.

```ts
import { parse, stringify } from 'yaml'
import { emptyUser } from '../engine/types'
import type { UserState } from '../engine/types'

const KEY = 'amigo.user'

export function loadUser(): UserState {
  const raw = localStorage.getItem(KEY)
  if (!raw) return emptyUser()
  const u = emptyUser(), p = parse(raw) ?? {}
  return { ...u, ...p, grammar: { ...u.grammar, ...p.grammar }, settings: { ...u.settings, ...p.settings } }
}

export function saveUser(user: UserState): void {
  user.grammar.known.sort()
  localStorage.setItem(KEY, stringify(user, { sortMapEntries: true }))
}

export const exportYaml = (user: UserState): string => stringify(user, { sortMapEntries: true })
export function importYaml(text: string): UserState {   // used by the Import affordance
  const u = emptyUser(), p = parse(text) ?? {}
  return { ...u, ...p, grammar: { ...u.grammar, ...p.grammar }, settings: { ...u.settings, ...p.settings } }
}
```

Same merge logic as the CLI loader (defensive against partial/hand-edited state).
Export/Import operate on YAML text — identical bytes to a CLI `user.yaml`, so a learner
can move state between terminal and phone by copy-paste.

## Session runtime (`session.ts`)

A session is the CLI loop (`src/cli/main.ts`): **8 cards, pick one at a time, grade,
then pick the next** — cards are *not* batched because each grade mutates SRS state
that the next pick reads.

```ts
type Trainer = 'vokabeln' | 'verbformen' | 'saetze'

interface SessionState {
  trainer: Trainer
  index: number                 // 0..7
  card: CardVM | null           // current card; null → empty-state (nothing eligible)
  revealed: boolean
  lastCorrect: boolean | null
  lastAccent: boolean           // correct but missing accents → soft hint
  lastYour: string              // the learner's raw answer
  results: { de: string; es: string; correct: boolean }[]  // for the summary
  whyOpen: boolean              // "warum?" note toggled open (correct feedback)
}
```

Flow:
- `start(trainer, focus)` → `index=0`, pick card 0, `screen='practice'`.
- **pick(trainer)** dispatches to the engine and normalizes to `CardVM` (below). If it
  returns `undefined` → `card=null` → Practice renders the empty-state
  ("Keine passenden … — erst ein Modul freischalten.") + a back button.
- **submit(input)** (text cards) / **pick('el'|'la')** (gender): compute
  `res = checkAnswer(input, card.accepted, card.canonical)`; set
  `lastAccent = res.correct && normalize-with-accents differ` (reuse the design's
  soft-hint idea — accepted but spelled without accents); call the card's `grade(correct)`
  (which calls `gradeVocab/gradeVerb/gradeSentence`); `saveUser`; `revealed=true`.
- **next()**: push `{de: card.prompt, es: card.canonical, correct}` to `results`; if
  `index === 7` → `screen='summary'`; else `index++`, pick next card, reset
  `revealed/whyOpen/lastYour`.
- **exit()** → `screen='home'` (discard session).

This matches `main.ts` exactly (`pick → checkAnswer → feedback → gradeX → next`), just
rendered instead of printed.

### CardVM — unifying the 5 design card types

The design's practice shell renders five prompt shapes (`isSentence/isVocab/isVerb/
isVerbrev/isGender`). Each engine source maps to one `CardVM`:

```ts
interface CardVM {
  kind: 'vocab' | 'gender' | 'verb' | 'verbrev' | 'sentence'
  tag: string              // cTag chip: 'Vokabeln' | 'Genus-Drill' | 'Verbformen' | 'Sätze'
  prompt: string
  promptHint?: string      // vocab: e.g. 'mit Artikel' / 'Genus-Falle'
  canonical: string        // the displayed, correctly accented answer (fbAnswer)
  accepted: string[]
  note?: string            // grammar note (notes_de) — feedback + "warum?"
  grade: (correct: boolean) => void
  input: 'text' | 'buttons'   // gender → el/la buttons; else text + accent helper
}
```

Mapping (source → CardVM):

| Trainer / engine call | Source object | kind | prompt | canonical | note | grade |
|---|---|---|---|---|---|---|
| Vokabeln `pickVocabCard` (`kind==='production'`) | `VocabCard` | `vocab` | `card.prompt` (German, w/ article for nouns) | `card.canonical` | `entry.notes_de` | `gradeVocab(user, card.key, ✓, today)` |
| Vokabeln `pickVocabCard` (`kind==='gender'`) | `VocabCard` | `gender` | strip to noun (e.g. `… ciudad?`) | `card.canonical` (`el`/`la`/`el/la`) | `entry.notes_de` | `gradeVocab(user, card.key, ✓, today)` |
| Verbformen `pickVerbDrill` (`direction==='de-es'`) | `VerbDrill` | `verb` | `d.prompt` (German phrase) | `d.canonical` (Spanish) | wrong → `verb.notes_de` | `gradeVerb(user, d.verb.lemma, d.cell, ✓, today)` |
| Verbformen `pickVerbDrill` (`direction==='es-de'`) | `VerbDrill` | `verbrev` | `d.prompt` (Spanish) + `(auf Deutsch)` | `d.canonical` (German) | — | `gradeVerb(…)` |
| Sätze `pickSentence` | `Exercise` | `sentence` | `ex.de` (label `Übersetze`) | `ex.es` | `ex.notes_de` | `gradeSentence(user, ex, ✓, today)` |

So a Vokabeln session naturally interleaves `vocab` + `gender` cards; a Verbformen
session interleaves `verb` + `verbrev`; Sätze is pure `sentence`. The shell handles all
five, exactly as the design does.

Note the accent soft-hint: `check.ts::normalize` strips diacritics, so `esta` matches
`está`. To detect "correct but unaccented" reuse the design's approach — compare a
punctuation-only strip (accents kept) of input vs. canonical; if they differ while
`normalize` matched, set `lastAccent` and show
"Achte auf die Akzente: <canonical>". (Small helper in `session.ts`, ~2 lines.)

## Theme (light + dark)

The brief requires both; `Classical`'s `styles.css` is light-only. Add dark overrides
in `ds.css`, keyed on the OS preference:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #201f1d;
    --color-surface: #17161500;      /* → use #171615 */
    --color-text: #f3f2f2;
    --color-divider: color-mix(in srgb, #f3f2f2 16%, transparent);
    /* accent stays the same hue; ramps read inverted against dark ground */
    --color-answer: var(--color-accent-300);   /* light gold for Spanish answers */
  }
}
:root { --color-answer: var(--color-accent-800); }  /* light default */
```

**Required refactor:** the design hardcodes `var(--color-accent-800)` (very dark gold)
for every Spanish target/answer — invisible on a dark ground. Introduce the semantic
token **`--color-answer`** and use it wherever the design used `accent-800` for target
Spanish text (feedback answer, summary `es`, vocab `es`, "warum?" note text, the
`user.yaml` mention). It resolves to `accent-800` in light, `accent-300` in dark.

The dark ramp values above are a first pass on the same terracotta/gold hue (Open
Question #3 in 00) — tune during Phase 4, don't invent a new brand color. The
`<meta name="theme-color">` and manifest `theme_color` stay the accent (`#b68235`).
