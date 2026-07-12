import { conjugate } from './conjugate'
import { attachClitics, REFLEXIVE } from './morph'
import { isDue, review, weight, fresh } from './srs'
import { eligibleTemplates, generate, vocabKey } from './templates'
import type { Exercise, Rng } from './templates'
import { focusMatchesEntry, focusMatchesPoint } from './learner'
import type { Focus } from './learner'
import { PERSONS, TENSE_POINT } from './types'
import type { Content, LexEntry, Person, Tense, UserState, Verb } from './types'

// Exercise selection for the three trainers (Plan/03, 04, 05): weighted by SRS
// state, filtered by unlocked grammar and the active focus.

const weightedPick = <T>(items: T[], w: (x: T) => number, rnd: Rng): T | undefined => {
  if (!items.length) return undefined
  const ws = items.map(x => Math.max(0.01, w(x)))
  let r = rnd() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) { r -= ws[i]!; if (r <= 0) return items[i] }
  return items[items.length - 1]
}

export function unlockedModules(content: Content, user: UserState): Set<string> {
  return new Set(content.modules
    .filter(m => m.points.some(p => user.grammar.known.includes(p.id)))
    .map(m => m.id))
}

// ---------- vocab ----------

export interface VocabCard {
  key: string
  prompt: string // German side
  accepted: string[]
  canonical: string
  entry: LexEntry
  kind: 'production' | 'gender'
}

export function pickVocabCard(
  content: Content, user: UserState, focus: Focus, today: string, rnd: Rng,
): VocabCard | undefined {
  const mods = unlockedModules(content, user)
  const cards: VocabCard[] = []
  for (const e of content.lexicon) {
    if (!mods.has(e.module) || !focusMatchesEntry(focus, e)) continue
    if (e.kind === 'noun') {
      const art = e.gender === 'f' ? 'la' : 'el'
      cards.push({
        key: e.lemma, entry: e, kind: 'production',
        prompt: `${e.de.g === 'm' ? 'der' : e.de.g === 'f' ? 'die' : 'das'} ${e.de.noun}`,
        canonical: `${art} ${e.lemma}`,
        accepted: e.gender === 'mf' ? [`el ${e.lemma}`, `la ${e.lemma}`] : [`${art} ${e.lemma}`],
      })
      cards.push({
        key: e.lemma, entry: e, kind: 'gender',
        prompt: `el oder la: … ${e.lemma}?`,
        canonical: e.gender === 'mf' ? 'el/la' : e.gender === 'f' ? 'la' : 'el',
        accepted: e.gender === 'mf' ? ['el', 'la', 'el/la'] : e.gender === 'f' ? ['la'] : ['el'],
      })
    } else if (e.kind === 'adj') {
      for (const s of e.senses) {
        const key = vocabKey(e, s)
        cards.push({
          key, entry: e, kind: 'production',
          prompt: s.de + (e.copula === 'shift' ? ` (mit ${s.copula})` : ''),
          canonical: e.lemma, accepted: [e.lemma],
        })
      }
    } else if (e.kind === 'verb') {
      cards.push({ key: e.lemma, entry: e, kind: 'production', prompt: e.gloss_de, canonical: e.lemma, accepted: [e.lemma] })
    } else {
      cards.push({ key: e.es, entry: e, kind: 'production', prompt: e.de, canonical: e.es, accepted: [e.es] })
    }
  }
  // gender drills only for due-ish nouns, extra weight for traps
  return weightedPick(cards, c => {
    let w = weight(user.vocab[c.key], today)
    if (c.kind === 'gender') w *= c.entry.kind === 'noun' && c.entry.gender_trap ? 1.5 : 0.3
    return w
  }, rnd)
}

export function gradeVocab(user: UserState, key: string, correct: boolean, today: string): void {
  user.vocab[key] = review(user.vocab[key] ?? fresh(today), correct, today)
}

// ---------- verb forms ----------

export interface VerbDrill {
  verb: Verb
  tense: Tense
  person: Person
  prompt: string
  canonical: string
  accepted: string[]
  cell: string
}

const TENSE_DE: Record<Tense, string> = {
  'presente': 'Presente', 'perfecto': 'Pretérito perfecto', 'indefinido': 'Pretérito indefinido',
  'imperfecto': 'Pretérito imperfecto', 'futuro': 'Futuro', 'estar+ger': 'estar + gerundio',
  'estaba+ger': 'estaba + gerundio', 'ir-a-inf': 'ir a + infinitivo', 'imperativo': 'Imperativo',
}
const PERSON_DE: Record<Person, string> = {
  '1s': 'yo', '2s': 'tú', '3s': 'él/ella/usted', '1p': 'nosotros', '2p': 'vosotros', '3p': 'ellos/ustedes',
}

export function pickVerbDrill(
  content: Content, user: UserState, focus: Focus, today: string, rnd: Rng,
): VerbDrill | undefined {
  const mods = unlockedModules(content, user)
  const known = new Set(user.grammar.known)
  const tenses = (Object.keys(TENSE_POINT) as Tense[])
    .filter(t => known.has(TENSE_POINT[t]))
    .filter(t => !focus.grammar?.length || focusMatchesPoint(focus, TENSE_POINT[t]))
  const verbs = content.lexicon.filter((e): e is Verb =>
    e.kind === 'verb' && e.lemma !== 'hay' && mods.has(e.module) && focusMatchesEntry(focus, e))
  if (!verbs.length || !tenses.length) return undefined

  const cells: VerbDrill[] = []
  for (const v of verbs)
    for (const t of tenses)
      for (const p of PERSONS) {
        if (t === 'imperativo' && (p === '1s' || p === '1p')) continue
        const form = conjugate(v, t, p)
        const full = v.reflexive
          ? (t === 'imperativo' ? attachClitics(form, [REFLEXIVE[p]], p) : `${REFLEXIVE[p]} ${form}`)
          : form
        cells.push({
          verb: v, tense: t, person: p, cell: `${t}.${p}`,
          prompt: `${v.lemma} · ${PERSON_DE[p]} · ${TENSE_DE[t]}`,
          canonical: full, accepted: [full],
        })
      }
  return weightedPick(cells, c => weight(user.verbs[c.verb.lemma]?.[c.cell], today), rnd)
}

export function gradeVerb(user: UserState, lemma: string, cell: string, correct: boolean, today: string): void {
  const v = (user.verbs[lemma] ??= {})
  v[cell] = review(v[cell] ?? fresh(today), correct, today)
}

// ---------- template sentences ----------

export function pickSentence(
  content: Content, user: UserState, focus: Focus, today: string, rnd: Rng,
): Exercise | undefined {
  let pool = eligibleTemplates(content, user, focus.grammar)
  if (focus.modules?.length) pool = pool.filter(t => focus.modules!.includes(t.module))
  if (!pool.length) return undefined
  for (let i = 0; i < 20; i++) {
    const t = pool[Math.floor(rnd() * pool.length)]!
    const ex = generate(t, content, user, rnd, key => weight(user.vocab[key], today))
    if (ex) return ex
  }
  return undefined
}

export function gradeSentence(user: UserState, ex: Exercise, correct: boolean, today: string): void {
  // sentence exercises double as vocab/verb reviews (Plan/05 integration):
  // only reward — a wrong sentence doesn't punish every word in it
  if (correct) {
    for (const key of ex.vocabKeys) gradeVocab(user, key, true, today)
    for (const { lemma, cell } of ex.verbCells) gradeVerb(user, lemma, cell, true, today)
  } else {
    for (const { lemma, cell } of ex.verbCells) gradeVerb(user, lemma, cell, false, today)
  }
}

export { isDue }
