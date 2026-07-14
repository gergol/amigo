import { conjugate } from './conjugate'
import { checkAnswer } from './check'
import { deVerbAccepted, deVerbPhrase } from './german'
import { attachClitics, isElAgua, REFLEXIVE } from './morph'
import { isDue, review, weight, fresh } from './srs'
import { eligibleTemplates, generate, glossBase, vocabKey, weightedPick } from './templates'
import type { Exercise, Rng } from './templates'
import { focusMatchesEntry, focusMatchesPoint } from './learner'
import type { Focus } from './learner'
import { PERSONS, TENSE_POINT } from './types'
import type { Content, LexEntry, Person, Tense, UserState, Verb } from './types'

// Exercise selection for the three trainers (Plan/03, 04, 05): weighted by SRS
// state, filtered by unlocked grammar and the active focus.

// Per-grammar-point ("constellation") SRS: created lazily when a point is first
// exercised. Errors on a constellation reschedule it just like a word.
export function gradePoint(user: UserState, pointId: string, correct: boolean, today: string): void {
  const srs = (user.grammar.srs ??= {})
  srs[pointId] = review(srs[pointId] ?? fresh(today), correct, today)
}

const pointWeightFn = (user: UserState, today: string) => (id: string) =>
  weight(user.grammar.srs?.[id], today)

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
  note?: string // notes_de: a trap warning shown on every reveal
  // Words with several Spanish translations: the sibling words (valid for another
  // sense/synonym) and a legend of the split. The intended word is still required
  // — a sibling counts wrong, but the reveal explains why instead of a bare "wrong".
  alsoAccept?: string[]
  legend?: string
}

// The note to reveal after answering a vocab card. The split legend fires only
// when the learner produced the other valid word (or asks "warum?" after a
// correct answer); a plain wrong answer just gets the trap note, if any.
export function vocabHint(
  card: Pick<VocabCard, 'note' | 'legend' | 'alsoAccept'>, correct: boolean, answer: string,
): string | undefined {
  const sibling = !correct && !!card.alsoAccept && checkAnswer(answer, card.alsoAccept, '').correct
  return correct || sibling ? card.legend ?? card.note : card.note
}

// Many German glosses map to more than one Spanish word — a context split
// (groß → alto für Personen, grande für Sachen) or plain synonyms (lecker →
// rico/bueno). Authors express this by giving the senses the same gloss, with a
// disambiguating "(...)" hint where the choice depends on context. glossBase
// (from templates) strips that hint so sibling senses group together; glossHint
// reads it back out for the legend.
const glossHint = (de: string): string | undefined =>
  de.match(/\(([^)]*)\)\s*$/)?.[1]?.trim()

interface AdjVariant { lemma: string; de: string }

// Adjective senses indexed by their German gloss base. A base shared by more
// than one lemma is a word with several valid Spanish translations.
function adjByGlossBase(lexicon: LexEntry[]): Map<string, AdjVariant[]> {
  const m = new Map<string, AdjVariant[]>()
  for (const e of lexicon) {
    if (e.kind !== 'adj') continue
    for (const s of e.senses) {
      const base = glossBase(s.de)
      const arr = m.get(base) ?? m.set(base, []).get(base)!
      if (!arr.some(v => v.lemma === e.lemma)) arr.push({ lemma: e.lemma, de: s.de })
    }
  }
  return m
}

// "groß: alto (Person) · grande (Sache)" — the legend shown after answering so
// the learner sees which word fits which context (or that both are synonyms).
const legendNote = (base: string, group: AdjVariant[]): string =>
  `${base}: ${group.map(v => { const h = glossHint(v.de); return h ? `${v.lemma} (${h})` : v.lemma }).join(' · ')}`

// New (never-graded) words trickle into sessions a few at a time; the session
// loop passes allowNew=false once this many have been introduced.
export const NEW_PER_SESSION = 3

// avoid: vocab key of the previous card — never repeat a word back-to-back
// (unless it's the only candidate left).
export function pickVocabCard(
  content: Content, user: UserState, focus: Focus, today: string, rnd: Rng,
  allowNew = true, avoid?: string,
): VocabCard | undefined {
  const mods = unlockedModules(content, user)
  // Cross-acceptance is computed over the whole lexicon (not just unlocked
  // modules), so "groß" always accepts both alto and grande and explains the
  // split — even before the sibling's module is unlocked.
  const adjBase = adjByGlossBase(content.lexicon)
  const cards: VocabCard[] = []
  for (const e of content.lexicon) {
    if (!mods.has(e.module) || !focusMatchesEntry(focus, e)) continue
    if (e.kind === 'noun') {
      // las gafas (plural-only), el agua (stressed a-), el/la estudiante
      const art = e.plural_only ? (e.gender === 'f' ? 'las' : 'los')
        : isElAgua(e) ? 'el' : e.gender === 'f' ? 'la' : 'el'
      const form = e.plural_only ? e.plural ?? e.lemma : e.lemma
      cards.push({
        key: e.lemma, entry: e, kind: 'production',
        prompt: `${e.de.g === 'm' ? 'der' : e.de.g === 'f' ? 'die' : 'das'} ${e.de.noun}`,
        canonical: `${art} ${form}`,
        accepted: e.gender === 'mf' ? [`el ${form}`, `la ${form}`] : [`${art} ${form}`],
        note: e.notes_de,
      })
      if (!e.plural_only && !isElAgua(e)) cards.push({
        key: e.lemma, entry: e, kind: 'gender',
        prompt: `el oder la: … ${e.lemma}?`,
        canonical: e.gender === 'mf' ? 'el/la' : e.gender === 'f' ? 'la' : 'el',
        accepted: e.gender === 'mf' ? ['el', 'la', 'el/la'] : e.gender === 'f' ? ['la'] : ['el'],
        note: e.notes_de,
      })
    } else if (e.kind === 'adj') {
      for (const s of e.senses) {
        const key = vocabKey(e, s)
        // Words sharing this gloss base are valid for another sense/synonym. The
        // intended word stays required (the prompt names the context), but typing
        // a sibling reveals the legend instead of a bare "wrong".
        const group = adjBase.get(glossBase(s.de)) ?? [{ lemma: e.lemma, de: s.de }]
        const also = group.filter(v => v.lemma !== e.lemma).map(v => v.lemma)
        cards.push({
          key, entry: e, kind: 'production',
          prompt: s.de + (e.copula === 'shift' ? ` (mit ${s.copula})` : ''),
          canonical: e.lemma, accepted: [e.lemma], note: e.notes_de,
          ...(also.length
            ? { alsoAccept: also, legend: [legendNote(glossBase(s.de), group), e.notes_de].filter(Boolean).join(' — ') }
            : {}),
        })
      }
    } else if (e.kind === 'verb') {
      cards.push({ key: e.lemma, entry: e, kind: 'production', prompt: e.gloss_de, canonical: e.lemma, accepted: [e.lemma], note: e.notes_de })
    } else {
      cards.push({ key: e.es, entry: e, kind: 'production', prompt: e.de, canonical: e.es, accepted: [e.es], note: e.notes_de })
    }
  }
  let pool = allowNew ? cards : cards.filter(c => user.vocab[c.key])
  if (avoid) {
    const rest = pool.filter(c => c.key !== avoid)
    if (rest.length) pool = rest
  }
  // gender drills only for due-ish nouns, extra weight for traps
  return weightedPick(pool, c => {
    let w = weight(user.vocab[c.key], today)
    if (c.kind === 'gender') w *= c.entry.kind === 'noun' && c.entry.gender_trap ? 1.5 : 0.3
    return w
  }, rnd)
}

export function gradeVocab(user: UserState, key: string, correct: boolean, today: string): void {
  user.vocab[key] = review(user.vocab[key] ?? fresh(today), correct, today)
}

// ---------- verb forms ----------

// de-es: German phrase shown, produce the Spanish form (default). es-de: reverse.
export interface VerbDrill {
  verb: Verb
  cell: string
  direction: 'de-es' | 'es-de'
  prompt: string
  canonical: string
  accepted: string[]
}

interface VerbCell { verb: Verb; tense: Tense; person: Person; cell: string; es: string }

// avoid: `${lemma}.${cell}` of the previous drill — never repeat back-to-back.
export function pickVerbDrill(
  content: Content, user: UserState, focus: Focus, today: string, rnd: Rng, avoid?: string,
): VerbDrill | undefined {
  const mods = unlockedModules(content, user)
  const known = new Set(user.grammar.known)
  const unlocked = (Object.keys(TENSE_POINT) as Tense[]).filter(t => known.has(TENSE_POINT[t]))
  // a tense-shaped focus narrows the tenses; any other grammar focus (e.g.
  // verb.reflexive) leaves tenses alone and narrows the verbs instead
  const tenseFocused = focus.grammar?.length
    ? unlocked.filter(t => focusMatchesPoint(focus, TENSE_POINT[t])) : unlocked
  const tenses = tenseFocused.length ? tenseFocused : unlocked
  let verbs = content.lexicon.filter((e): e is Verb =>
    e.kind === 'verb' && e.lemma !== 'hay' && mods.has(e.module) && focusMatchesEntry(focus, e))
  if (focus.grammar?.some(g => g === 'verb.reflexive')) verbs = verbs.filter(v => v.reflexive)
  // drills stick to the learner's vocabulary; before any verb is encountered,
  // fall back to all unlocked verbs so the trainer never goes dead
  const encountered = verbs.filter(v => user.vocab[v.lemma])
  if (encountered.length) verbs = encountered
  if (!verbs.length || !tenses.length) return undefined

  let cells: VerbCell[] = []
  for (const v of verbs)
    for (const t of tenses)
      for (const p of PERSONS) {
        if (t === 'imperativo' && (p === '1s' || p === '1p')) continue
        // gustar-type verbs: only the 3rd-person cells exist meaningfully
        if (v.valence.gustar && (t === 'imperativo' || (p !== '3s' && p !== '3p'))) continue
        const form = conjugate(v, t, p)
        const full = v.reflexive
          ? (t === 'imperativo' ? attachClitics(form, [REFLEXIVE[p]], p) : `${REFLEXIVE[p]} ${form}`)
          : form
        cells.push({ verb: v, tense: t, person: p, cell: `${t}.${p}`, es: full })
      }
  if (avoid) {
    const rest = cells.filter(x => `${x.verb.lemma}.${x.cell}` !== avoid)
    if (rest.length) cells = rest
  }
  // cell weight × constellation factor: an error-prone tense boosts all its cells
  const pw = pointWeightFn(user, today)
  const c = weightedPick(cells, x =>
    weight(user.verbs[x.verb.lemma]?.[x.cell], today)
    * Math.min(4, Math.max(0.5, pw(TENSE_POINT[x.tense]) / 1.5)), rnd)
  if (!c) return undefined

  // most drills go German → Spanish; a configurable share ask the reverse (Plan/04)
  const de = deVerbPhrase(c.verb, c.tense, c.person)
  // gustar cues carry an experiencer (mir gefällt) — mirror it on the Spanish side (me gusta),
  // but still accept the bare form, since the cell drills the verb, not the clitic
  const es = c.verb.valence.gustar ? `me ${c.es}` : c.es
  const esAccepted = c.verb.valence.gustar ? [es, c.es] : [es]
  const reverse = rnd() < user.settings.reverseVerbShare
  return {
    verb: c.verb, cell: c.cell, direction: reverse ? 'es-de' : 'de-es',
    prompt: reverse ? es : de,
    canonical: reverse ? de : es,
    accepted: reverse ? deVerbAccepted(c.verb, c.tense, c.person) : esAccepted,
  }
}

export function gradeVerb(user: UserState, lemma: string, cell: string, correct: boolean, today: string): void {
  const v = (user.verbs[lemma] ??= {})
  v[cell] = review(v[cell] ?? fresh(today), correct, today)
  const tense = cell.slice(0, cell.lastIndexOf('.')) as Tense
  if (TENSE_POINT[tense]) gradePoint(user, TENSE_POINT[tense], correct, today)
}

// ---------- template sentences ----------

export function pickSentence(
  content: Content, user: UserState, focus: Focus, today: string, rnd: Rng,
): Exercise | undefined {
  let pool = eligibleTemplates(content, user, focus.grammar)
  if (focus.modules?.length) pool = pool.filter(t => focus.modules!.includes(t.module))
  if (!pool.length) return undefined
  const pw = pointWeightFn(user, today)
  // fillers stick to the learner's vocabulary; never-encountered words stay rare
  const fillerWeight = (key: string) => (user.vocab[key] ? weight(user.vocab[key], today) : 0.2)
  for (let i = 0; i < 20; i++) {
    // templates whose most-in-need constellation is due/error-prone come first
    const t = weightedPick(pool, x => (x.requires.length ? Math.max(...x.requires.map(pw)) : 1.5), rnd)!
    const ex = generate(t, content, user, rnd, fillerWeight, pw)
    if (ex) return ex
  }
  return undefined
}

export function gradeSentence(user: UserState, ex: Exercise, correct: boolean, today: string): void {
  // sentence exercises double as vocab/verb reviews (Plan/05 integration):
  // only reward words — a wrong sentence doesn't punish every word in it.
  // Constellations are always graded: a wrong sentence reschedules its grammar.
  if (correct) {
    for (const key of ex.vocabKeys) gradeVocab(user, key, true, today)
    for (const { lemma, cell } of ex.verbCells) gradeVerb(user, lemma, cell, true, today)
  } else {
    for (const { lemma, cell } of ex.verbCells) gradeVerb(user, lemma, cell, false, today)
  }
  for (const p of ex.points) gradePoint(user, p, correct, today)
}

export { isDue }
