import { isElAgua } from '../engine/morph'
import { vocabKeys, fresh, score, setScore } from './engine'
import type { LexEntry, UserState } from './engine'

// Display + "known" helpers for the vocab editor and settings. displayForms mirrors
// the article logic in trainer.pickVocabCard so the editor and the drill agree.

export interface VocabForms { de: string; es: string; note?: string }

const DE_ART = { m: 'der', f: 'die', n: 'das' } as const

export function displayForms(e: LexEntry): VocabForms {
  if (e.kind === 'noun') {
    const art = e.plural_only ? (e.gender === 'f' ? 'las' : 'los')
      : isElAgua(e) ? 'el' : e.gender === 'f' ? 'la' : 'el'
    const form = e.plural_only ? e.plural ?? e.lemma : e.lemma
    return {
      de: `${DE_ART[e.de.g]} ${e.de.noun}`,
      es: e.gender === 'mf' ? `el/la ${form}` : `${art} ${form}`,
      note: e.notes_de,
    }
  }
  if (e.kind === 'adj') return { de: e.senses.map(s => s.de).join(' / '), es: e.lemma, note: e.notes_de }
  if (e.kind === 'verb') return { de: e.gloss_de, es: e.lemma, note: e.notes_de }
  return { de: e.de, es: e.es, note: e.notes_de }
}

// Theme label for the editor's filter chips.
export function theme(e: LexEntry): string {
  if (e.kind === 'chunk') return 'Wendungen'
  if (e.kind === 'verb') return 'Verben'
  if (e.kind === 'adj') return 'Adjektive'
  const t = e.tags
  if (t.includes('family-role')) return 'Familie'
  if (t.includes('profession')) return 'Berufe'
  if (t.includes('place')) return 'Orte'
  if (t.includes('human') || t.includes('nationality')) return 'Menschen'
  return 'Nomen'
}

// A word is "in my vocabulary" when it has SRS state — encountered (checked in
// the editor or answered in a drill) and scheduled for repetition.
export function inVocab(user: UserState, e: LexEntry): boolean {
  return vocabKeys(e).some(k => user.vocab[k] !== undefined)
}

export function setInVocab(user: UserState, e: LexEntry, on: boolean, today: string): void {
  for (const k of vocabKeys(e)) {
    if (on) user.vocab[k] ??= fresh(today)
    else delete user.vocab[k]
  }
}

export function vocabCount(user: UserState, lexicon: LexEntry[]): number {
  return lexicon.filter(e => inVocab(user, e)).length
}

// Score / errors / next due aggregated over an entry's keys (shift adjectives have two).
export const entryScore = (user: UserState, e: LexEntry): number =>
  Math.min(...vocabKeys(e).map(k => score(user.vocab[k])))

export const entryErrors = (user: UserState, e: LexEntry): number =>
  vocabKeys(e).reduce((n, k) => n + (user.vocab[k]?.errors ?? 0), 0)

export const entryDue = (user: UserState, e: LexEntry): string | undefined =>
  vocabKeys(e).map(k => user.vocab[k]?.due).filter((d): d is string => !!d).sort()[0]

export function setEntryScore(user: UserState, e: LexEntry, pct: number, today: string): void {
  for (const k of vocabKeys(e)) user.vocab[k] = setScore(user.vocab[k] ?? fresh(today), pct, today)
}
