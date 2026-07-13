import {
  pickVocabCard, pickVerbDrill, pickSentence,
  gradeVocab, gradeVerb, gradeSentence, checkAnswer,
} from './engine'
import type { Focus, Exercise, Rng, UserState } from './engine'
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
}

const placeholderFor = (kind: CardVM['kind']): string =>
  kind === 'verbrev' ? 'deutsche Form …' : kind === 'verb' ? 'Verbform …' : 'spanische Antwort …'

// Pick the next card for a trainer and normalize the engine result to a CardVM.
export function pickCard(trainer: Trainer, user: UserState, focus: Focus, today: string, rnd: Rng): CardVM | null {
  if (trainer === 'vokabeln') {
    const c = pickVocabCard(content, user, focus, today, rnd)
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
      kind: 'vocab', tag: 'Vokabeln', prompt: c.prompt, promptHint: hint,
      canonical: c.canonical, accepted: c.accepted, note: c.entry.notes_de,
      input: 'text', placeholder: placeholderFor('vocab'), grade: { t: 'vocab', key: c.key },
    }
  }
  if (trainer === 'verbformen') {
    const d = pickVerbDrill(content, user, focus, today, rnd)
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

export function grade(session: SessionState, user: UserState, answer: string, today: string): SessionState {
  const c = session.card
  if (!c || session.revealed) return session
  const res = checkAnswer(answer, c.accepted, c.canonical)
  const accent = res.correct && stripPunct(answer) !== stripPunct(c.canonical)
  gradeCard(user, c.grade, res.correct, today)
  return { ...session, revealed: true, lastCorrect: res.correct, lastAccent: accent, lastYour: answer }
}

// Advance: record the result, then pick the next card (or finish at 8).
export function advance(session: SessionState, user: UserState, focus: Focus, today: string, rnd: Rng): SessionState {
  const c = session.card
  const results = c
    ? [...session.results, { de: c.prompt, es: c.canonical, correct: session.lastCorrect === true }]
    : session.results
  if (session.index >= SESSION - 1) return { ...session, results, card: null }
  const next = pickCard(session.trainer, user, focus, today, rnd)
  return {
    ...session, index: session.index + 1, card: next, results,
    input: '', revealed: false, whyOpen: false, lastCorrect: null, lastAccent: false, lastYour: '',
  }
}

export function startSession(trainer: Trainer, user: UserState, focus: Focus, today: string, rnd: Rng): SessionState {
  return {
    trainer, index: 0, card: pickCard(trainer, user, focus, today, rnd),
    input: '', revealed: false, lastCorrect: null, lastAccent: false, lastYour: '',
    whyOpen: false, results: [],
  }
}

export const isFinished = (s: SessionState): boolean => s.index >= SESSION - 1 && s.revealed
