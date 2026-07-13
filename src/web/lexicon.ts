import { isElAgua } from '../engine/morph'
import { vocabKeys, mature } from './engine'
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

// A vocab entry counts as "known" when its SRS state is mature (interval ≥ 90),
// which is also what marking-known sets it to.
export function isVocabKnown(user: UserState, e: LexEntry): boolean {
  return vocabKeys(e).every(k => (user.vocab[k]?.interval ?? 0) >= 90)
}

export function setVocabKnown(user: UserState, e: LexEntry, known: boolean, today: string): void {
  for (const k of vocabKeys(e)) {
    if (known) user.vocab[k] = mature(today)
    else delete user.vocab[k]
  }
}

export function knownVocabCount(user: UserState, lexicon: LexEntry[]): number {
  return lexicon.filter(e => isVocabKnown(user, e)).length
}
