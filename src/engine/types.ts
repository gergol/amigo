// Content and learner-state types. Content is authored in content/*.yaml (see Plan/02).
// The engine is pure: it receives these as plain objects, never touches files.

export type Level = 'A1' | 'A2'
export type ModuleId = string // M01..M20

// ---------- grammar graph ----------

export interface GrammarPoint {
  id: string // e.g. presente.regular.ar
  de: string // learner-facing name, German
  prereqs: string[]
}

export interface CurriculumModule {
  id: ModuleId
  title: string
  level: Level
  points: GrammarPoint[]
}

// ---------- lexicon ----------

export type Tag =
  | 'human' | 'animal' | 'thing' | 'place' | 'food' | 'drink' | 'clothing'
  | 'bodypart' | 'vehicle' | 'time-expr' | 'event' | 'activity' | 'abstract'
  | 'weather' | 'profession' | 'nationality' | 'family-role'

export type Gender = 'm' | 'f'
export type DeGender = 'm' | 'f' | 'n'
export type Person = '1s' | '2s' | '3s' | '1p' | '2p' | '3p'
export const PERSONS: Person[] = ['1s', '2s', '3s', '1p', '2p', '3p']

export interface Noun {
  kind: 'noun'
  lemma: string
  gender: Gender | 'mf' // mf: el/la estudiante
  fem?: string // pair nouns: niño → niña
  plural?: string // only if irregular
  de: { noun: string; g: DeGender; plural?: string }
  tags: Tag[]
  level: Level
  module: ModuleId
  gender_trap?: boolean
  notes_de?: string
}

// Stem-change patterns (presente boot; for -ir verbs also gerund + 3rd-person indefinido).
// Yo-irregulars (hago, conozco, doy) and fully irregular paradigms go in `overrides`.
export type VerbPattern = 'e>ie' | 'o>ue' | 'e>i' | 'u>ue' | 'strong-pret'

export interface VerbValence {
  subject: Tag[]
  object?: { tags: Tag[]; optional?: boolean }
  io?: boolean // takes indirect object
  gustar?: boolean // experiencer-as-IO, theme-as-subject
  inf?: boolean // takes infinitive complement (querer, poder)
  prep?: { prep: string; tags: Tag[] } // ir a + place
}

export interface Verb {
  kind: 'verb'
  lemma: string // reflexives with -se: levantarse
  class: 'ar' | 'er' | 'ir'
  patterns?: VerbPattern[]
  pretStem?: string // strong-pret: tuv, hic, dij …
  futStem?: string // tendr, har …
  gerund?: string // irregular only
  participle?: string // irregular only
  overrides?: Record<string, string> // 'presente.1s': 'sé' — wins over everything
  reflexive?: boolean
  valence: VerbValence
  de: {
    inf: string
    prefix?: string // separable: aufstehen → prefix 'auf'
    praesens?: Partial<Record<Person, string>> // irregular forms, full word incl. prefix split done by caller
    partizip?: string // default: ge+stem+t
    aux?: 'haben' | 'sein' // default haben
    imperativ2s?: string // strong verbs: gib, lies, nimm; default = stem
    praeteritum?: Partial<Record<Person, string>> // only where needed (war, hatte)
    reflexive?: boolean // German side reflexive (sich waschen)
  }
  gloss_de: string // display gloss for vocab cards (may differ from de.inf: 'bestellen; bitten um')
  tags?: Tag[] // rarely needed
  level: Level
  module: ModuleId
  notes_de?: string
}

export type CopulaBehavior = 'ser' | 'estar' | 'both' | 'shift'

export interface AdjSense {
  copula: 'ser' | 'estar'
  de: string // langweilig | gelangweilt
  applies_to: Tag[]
}

export interface Adjective {
  kind: 'adj'
  lemma: string // masculine singular
  agreement: 'o/a' | 'e' | 'cons' | 'nat' | 'inv' // nat: nationality-style fem +a (alemán→alemana)
  copula: CopulaBehavior
  senses: AdjSense[] // 1 for ser/estar-only, 1 shared for both, 2 for shift
  gradable?: boolean // default true
  gender?: Gender // gender-restricted (embarazada)
  tags?: Tag[] // classification for slot filters (nationality …)
  level: Level
  module: ModuleId
  notes_de?: string
}

export interface Chunk {
  kind: 'chunk'
  es: string
  de: string
  level: Level
  module: ModuleId
  notes_de?: string
}

export type LexEntry = Noun | Verb | Adjective | Chunk

// ---------- names (subject slot fillers) ----------

export interface PersonName { name: string; gender: Gender }

// ---------- templates ----------

export type Tense =
  | 'presente' | 'perfecto' | 'indefinido' | 'imperfecto' | 'futuro'
  | 'estar+ger' | 'estaba+ger' | 'ir-a-inf' | 'imperativo'
export const TENSES: Tense[] = [
  'presente', 'perfecto', 'indefinido', 'imperfecto', 'futuro',
  'estar+ger', 'estaba+ger', 'ir-a-inf', 'imperativo',
]

// Which grammar point unlocks a tense as a template axis value.
export const TENSE_POINT: Record<Tense, string> = {
  'presente': 'presente.regular',
  'perfecto': 'perfecto.regular',
  'indefinido': 'indefinido.regular',
  'imperfecto': 'imperfecto.regular',
  'futuro': 'futuro.regular',
  'estar+ger': 'gerundio.estar',
  'estaba+ger': 'imperfecto.regular', // templates must additionally require gerundio.estar
  'ir-a-inf': 'ir-a-inf',
  'imperativo': 'imperativo.afirmativo',
}

export interface SubjSlot {
  type: 'subj'
  persons?: Person[] // default all six
  nouns?: Tag[] // 3s/3p may also be filled by nouns/names with these tags
}

export interface NounSlot {
  type: 'noun'
  tags: Tag[]
  article: 'def' | 'indef' | 'none'
  number?: 'sg' | 'pl' | 'both'
  deCase: 'nom' | 'akk' | 'dat'
  role?: 'do' // direct object: triggers personal a for human fillers, valence tag filter
}

export interface AdjSlot {
  type: 'adj'
  copula?: 'ser' | 'estar' // filter senses; omit = any (template's verb decides)
  tags?: Tag[] // only adjectives carrying one of these tags (e.g. nationality)
  shiftOnly?: boolean // only meaning-shift adjectives (ser/estar drills)
}

export interface VerbSlot {
  type: 'verb'
  lemmas?: string[] // fixed choice, e.g. [estar]
  valence?: 'intrans' | 'trans' | 'inf' | 'gustar' // else: filter lexicon by valence shape
  reflexive?: boolean
  tense?: Tense // fixed tense for this slot (multi-clause templates); ignores the tense axis
}

export interface CliticSlot {
  type: 'clitic'
  role: 'do' | 'io'
  persons?: Person[] // default: 1s 2s 1p 2p (3rd-person clitics need antecedents — later)
}

// Tense-cueing adverbial (ayer/gestern, früher immer/antes siempre). The German side
// is what makes past-tense prompts unambiguous (Plan/01 M12–M15).
export interface TimeSlot { type: 'time' }

export interface TimeExpr { es: string; de: string; tenses: Tense[] }

// Fixed es/de pairs the template picks from (tener hambre/Hunger haben, me gustaría/ich würde gern)
export interface LitSlot { type: 'lit'; options: { es: string; de: string }[] }

// Infinitive complement (querer/poder + inf)
export interface InfSlot { type: 'inf'; lemmas: string[] }

export type Slot = SubjSlot | NounSlot | AdjSlot | VerbSlot | CliticSlot | TimeSlot | LitSlot | InfSlot

export interface Template {
  id: string
  module: ModuleId
  requires: string[] // grammar point ids; eligible iff all unlocked
  es: string // "{subj} {v} {obj}" — token = slot name; verb slot conjugates
  de: string // "{subj} {v} {obj}" — German rendering of the same slots
  slots: Record<string, Slot>
  tenses?: Tense[] // allowed tense axis (intersected with unlocked); default [presente]
  polarity?: boolean // may be negated (adds neg axis)
  notes_de?: string // shown as feedback after answering
}

// ---------- learner state (user.yaml) ----------

export interface SrsState { due: string; interval: number; ease: number } // due: YYYY-MM-DD

export interface UserState {
  grammar: { known: string[] }
  vocab: Record<string, SrsState> // key: lemma, or lemma/ser lemma/estar for shift senses
  verbs: Record<string, Record<string, SrsState>> // lemma → 'tense.person' → state
  presets: Record<string, { grammar?: string[]; tags?: Tag[]; modules?: ModuleId[] }>
}

export const emptyUser = (): UserState => ({ grammar: { known: [] }, vocab: {}, verbs: {}, presets: {} })

// ---------- assembled content ----------

export interface Content {
  modules: CurriculumModule[]
  lexicon: LexEntry[]
  templates: Template[]
  names: PersonName[]
  times: TimeExpr[]
}
