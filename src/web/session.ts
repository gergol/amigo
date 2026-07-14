import {
  pickVocabCard, pickVerbDrill, pickSentence,
  gradeVocab, gradeVerb, gradeSentence, checkAnswer, NEW_PER_SESSION,
} from './engine'
import type { Focus, Exercise, Rng, UserState, SrsState } from './engine'
import { content } from './content'

// A session is the CLI's pick → grade → next loop (src/cli/main.ts), run for 8 cards.
// Cards are picked one at a time because each grade mutates SRS state the next pick reads.

export type Trainer = 'vokabeln' | 'verbformen' | 'saetze'
export const SESSION = 8

export const TRAINER_TAG: Record<Trainer, string> = {
  vokabeln: 'Vokabeln', verbformen: 'Verbformen', saetze: 'Sätze',
}

// What the engine tells us to grade once the card is answered.
export type GradeRef =
  | { t: 'vocab'; key: string }
  | { t: 'verb'; lemma: string; cell: string }
  | { t: 'sentence'; ex: Exercise }

// The single view-model the practice shell renders for all five prompt shapes.
export interface CardVM {
  kind: 'vocab' | 'gender' | 'verb' | 'verbrev' | 'sentence'
  tag: string
  prompt: string
  promptHint?: string
  canonical: string // the correctly-accented displayed answer
  accepted: string[]
  note?: string
  input: 'text' | 'buttons'
  placeholder: string
  grade: GradeRef
}

export interface SessionResult { de: string; es: string; correct: boolean }

// Snapshot of the SRS state a wrong grade touched, kept so the learner can
// override ("I said it right") and have the grade cleanly undone + re-applied
// as correct — with no lingering error count or ease penalty.
interface SrsSnapshot {
  vocab: Record<string, SrsState>
  verbs: Record<string, Record<string, SrsState>>
  grammarSrs: Record<string, SrsState>
}

export interface SessionState {
  trainer: Trainer
  index: number
  card: CardVM | null // null → nothing eligible (empty state)
  input: string
  revealed: boolean
  lastCorrect: boolean | null
  lastAccent: boolean
  lastYour: string
  whyOpen: boolean
  results: SessionResult[]
  newCount: number // brand-new vocab introduced this session (capped at NEW_PER_SESSION)
  undo: SrsSnapshot | null // pre-grade SRS snapshot, only for the last wrong answer
}

const placeholderFor = (kind: CardVM['kind']): string =>
  kind === 'verbrev' ? 'deutsche Form …' : kind === 'verb' ? 'Verbform …' : 'spanische Antwort …'

// Pick the next card for a trainer and normalize the engine result to a CardVM.
// avoid = the previous card's grade ref: the same word/cell never repeats back-to-back.
export function pickCard(
  trainer: Trainer, user: UserState, focus: Focus, today: string, rnd: Rng,
  allowNew = true, avoid?: GradeRef,
): CardVM | null {
  if (trainer === 'vokabeln') {
    const c = pickVocabCard(content, user, focus, today, rnd, allowNew,
      avoid?.t === 'vocab' ? avoid.key : undefined)
    if (!c) return null
    if (c.kind === 'gender') {
      const lemma = c.entry.kind === 'noun' ? c.entry.lemma : c.canonical
      return {
        kind: 'gender', tag: 'Genus-Drill', prompt: `… ${lemma}?`,
        canonical: c.canonical, accepted: c.accepted, note: c.entry.notes_de,
        input: 'buttons', placeholder: '', grade: { t: 'vocab', key: c.key },
      }
    }
    const trap = c.entry.kind === 'noun' && c.entry.gender_trap
    const hint = c.entry.kind === 'noun' ? (trap ? 'Genus-Falle' : 'mit Artikel') : undefined
    return {
      kind: 'vocab', tag: user.vocab[c.key] ? 'Vokabeln' : 'Neues Wort', prompt: c.prompt, promptHint: hint,
      canonical: c.canonical, accepted: c.accepted, note: c.entry.notes_de,
      input: 'text', placeholder: placeholderFor('vocab'), grade: { t: 'vocab', key: c.key },
    }
  }
  if (trainer === 'verbformen') {
    const d = pickVerbDrill(content, user, focus, today, rnd,
      avoid?.t === 'verb' ? `${avoid.lemma}.${avoid.cell}` : undefined)
    if (!d) return null
    const rev = d.direction === 'es-de'
    return {
      kind: rev ? 'verbrev' : 'verb', tag: 'Verbformen', prompt: d.prompt,
      canonical: d.canonical, accepted: d.accepted,
      note: d.verb.notes_de,
      input: 'text', placeholder: placeholderFor(rev ? 'verbrev' : 'verb'),
      grade: { t: 'verb', lemma: d.verb.lemma, cell: d.cell },
    }
  }
  const ex = pickSentence(content, user, focus, today, rnd)
  if (!ex) return null
  return {
    kind: 'sentence', tag: 'Sätze', prompt: ex.de, canonical: ex.es, accepted: ex.accepted,
    note: ex.notes_de, input: 'text', placeholder: placeholderFor('sentence'),
    grade: { t: 'sentence', ex },
  }
}

export function gradeCard(user: UserState, g: GradeRef, correct: boolean, today: string): void {
  if (g.t === 'vocab') gradeVocab(user, g.key, correct, today)
  else if (g.t === 'verb') gradeVerb(user, g.lemma, g.cell, correct, today)
  else gradeSentence(user, g.ex, correct, today)
}

// Correct but the accents were omitted (checkAnswer strips diacritics) → soft hint.
const stripPunct = (s: string): string =>
  s.toLowerCase().replace(/[¿¡?!.,;:]/g, '').replace(/\s+/g, ' ').trim()

const snapshotSrs = (user: UserState): SrsSnapshot => ({
  vocab: structuredClone(user.vocab),
  verbs: structuredClone(user.verbs),
  grammarSrs: structuredClone(user.grammar.srs ?? {}),
})

export function grade(session: SessionState, user: UserState, answer: string, today: string): SessionState {
  const c = session.card
  if (!c || session.revealed) return session
  const res = checkAnswer(answer, c.accepted, c.canonical)
  const accent = res.correct && stripPunct(answer) !== stripPunct(c.canonical)
  // Snapshot before grading a wrong answer so an override can undo it exactly.
  const undo = res.correct ? null : snapshotSrs(user)
  gradeCard(user, c.grade, res.correct, today)
  return { ...session, revealed: true, lastCorrect: res.correct, lastAccent: accent, lastYour: answer, undo }
}

// Learner overrides a wrong grade ("I said the exact right thing"): restore the
// SRS to before the wrong grade, then re-grade as correct so the item schedules
// forward as if answered right. No-op unless the last answer was graded wrong.
export function overrideCorrect(session: SessionState, user: UserState, today: string): SessionState {
  const c = session.card
  if (!c || !session.revealed || session.lastCorrect || !session.undo) return session
  user.vocab = session.undo.vocab
  user.verbs = session.undo.verbs
  user.grammar.srs = session.undo.grammarSrs
  gradeCard(user, c.grade, true, today)
  return { ...session, lastCorrect: true, lastAccent: false, undo: null }
}

// A picked card introduces a new word iff its vocab key has no SRS state yet
// (grading creates the state, so this must be checked at pick time).
const isNewVocab = (card: CardVM | null, user: UserState): boolean =>
  card?.grade.t === 'vocab' && !user.vocab[card.grade.key]

// Advance: record the result, then pick the next card (or finish at 8).
export function advance(session: SessionState, user: UserState, focus: Focus, today: string, rnd: Rng): SessionState {
  const c = session.card
  const results = c
    ? [...session.results, { de: c.prompt, es: c.canonical, correct: session.lastCorrect === true }]
    : session.results
  if (session.index >= SESSION - 1) return { ...session, results, card: null }
  const next = pickCard(session.trainer, user, focus, today, rnd,
    session.newCount < NEW_PER_SESSION, c?.grade)
  return {
    ...session, index: session.index + 1, card: next, results,
    newCount: session.newCount + (isNewVocab(next, user) ? 1 : 0),
    input: '', revealed: false, whyOpen: false, lastCorrect: null, lastAccent: false, lastYour: '', undo: null,
  }
}

export function startSession(trainer: Trainer, user: UserState, focus: Focus, today: string, rnd: Rng): SessionState {
  const card = pickCard(trainer, user, focus, today, rnd)
  return {
    trainer, index: 0, card,
    input: '', revealed: false, lastCorrect: null, lastAccent: false, lastYour: '',
    whyOpen: false, results: [], newCount: isNewVocab(card, user) ? 1 : 0, undo: null,
  }
}

export const isFinished = (s: SessionState): boolean => s.index >= SESSION - 1 && s.revealed
