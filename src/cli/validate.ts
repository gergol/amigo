import { loadContent } from './store'
import { eligibleTemplates, generate } from '../engine/templates'
import { allPoints } from '../engine/learner'
import { emptyUser, TENSE_POINT, TENSES } from '../engine/types'
import type { Content, Tag, UserState } from '../engine/types'

// Content validation (Plan/05 QC): reference checks + exhaustive template smoke
// generation with everything unlocked. Run: npm run validate

const TAGS: Tag[] = [
  'human', 'animal', 'thing', 'place', 'food', 'drink', 'clothing', 'bodypart',
  'vehicle', 'time-expr', 'event', 'activity', 'abstract', 'weather', 'profession',
  'nationality', 'family-role',
]

const errors: string[] = []
const err = (msg: string) => errors.push(msg)

const content: Content = loadContent(new URL('../../content', import.meta.url).pathname)
const points = allPoints(content)
const pointIds = new Set(points.map(p => p.id))
const moduleIds = new Set(content.modules.map(m => m.id))

// grammar graph
for (const p of points)
  for (const pre of p.prereqs)
    if (!pointIds.has(pre)) err(`grammar: ${p.id} requires unknown point ${pre}`)
for (const t of TENSES)
  if (!pointIds.has(TENSE_POINT[t])) err(`grammar: tense ${t} maps to unknown point ${TENSE_POINT[t]}`)

// lexicon
const lemmas = new Set<string>()
for (const e of content.lexicon) {
  const key = e.kind === 'chunk' ? e.es : e.lemma
  if (lemmas.has(`${e.kind}:${key}`)) err(`lexicon: duplicate ${e.kind} ${key}`)
  lemmas.add(`${e.kind}:${key}`)
  if (!moduleIds.has(e.module)) err(`lexicon: ${key} has unknown module ${e.module}`)
  if (e.kind === 'noun') {
    for (const t of e.tags) if (!TAGS.includes(t)) err(`lexicon: ${key} unknown tag ${t}`)
    if (!e.de?.noun || !e.de?.g) err(`lexicon: ${key} missing German noun/gender`)
  }
  if (e.kind === 'verb') {
    if (e.patterns?.includes('strong-pret') && !e.pretStem) err(`verb ${key}: strong-pret without pretStem`)
    if (e.reflexive && !e.lemma.endsWith('se')) err(`verb ${key}: reflexive but lemma has no -se`)
    if (!e.reflexive && e.lemma.endsWith('se')) err(`verb ${key}: lemma ends in -se but not reflexive`)
    if (!e.de?.inf) err(`verb ${key}: missing de.inf`)
    if (e.de?.prefix && !e.de.inf.startsWith(e.de.prefix)) err(`verb ${key}: de.prefix not a prefix of de.inf`)
  }
  if (e.kind === 'adj') {
    if (!e.senses?.length) err(`adj ${key}: no senses`)
    if (e.copula === 'shift' && e.senses.length !== 2) err(`adj ${key}: shift needs exactly 2 senses`)
    if (e.copula === 'ser' && e.senses.some(s => s.copula !== 'ser')) err(`adj ${key}: ser-only with estar sense`)
    if (e.copula === 'estar' && e.senses.some(s => s.copula !== 'estar')) err(`adj ${key}: estar-only with ser sense`)
    for (const s of e.senses ?? [])
      for (const t of s.applies_to) if (!TAGS.includes(t)) err(`adj ${key}: unknown tag ${t}`)
  }
}

// templates: token/slot cross-references
for (const t of content.templates) {
  for (const r of t.requires) if (!pointIds.has(r)) err(`template ${t.id}: unknown grammar point ${r}`)
  if (!moduleIds.has(t.module)) err(`template ${t.id}: unknown module ${t.module}`)
  const tokens = (pattern: string) => [...pattern.matchAll(/\{([a-z0-9_]+)\}/gi)].map(m => m[1]!)
  for (const tok of tokens(t.es))
    if (!t.slots[tok]) err(`template ${t.id}: es-token {${tok}} has no slot`)
  for (const tok of tokens(t.de))
    if (tok !== 'nicht' && !t.slots[tok]) err(`template ${t.id}: de-token {${tok}} has no slot`)
  if (t.polarity && !t.de.includes('{nicht}')) err(`template ${t.id}: polarity without {nicht} in de pattern`)
  const verbSlots = Object.values(t.slots).filter(s => s.type === 'verb')
  if (verbSlots.length > 1) err(`template ${t.id}: at most one verb slot (has ${verbSlots.length})`)
  if (t.es.includes('{v}') && verbSlots.length === 0) err(`template ${t.id}: {v} token without verb slot`)
}

// smoke generation: everything unlocked, every template must produce output
const allKnown: UserState = {
  ...emptyUser(),
  grammar: { known: points.map(p => p.id) },
}
let seed = 42
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31 }
const eligible = eligibleTemplates(content, allKnown)
for (const t of content.templates) {
  if (!eligible.includes(t)) { err(`template ${t.id}: not eligible even with all grammar known`); continue }
  let ok = 0
  const samples: string[] = []
  for (let i = 0; i < 40; i++) {
    const ex = generate(t, content, allKnown, rnd)
    if (ex) { ok++; if (samples.length < 3) samples.push(`${ex.de} → ${ex.es}`) }
  }
  if (ok === 0) err(`template ${t.id}: generation produced nothing in 40 tries`)
  else if (process.argv.includes('--samples')) console.log(`\n${t.id}\n  ` + samples.join('\n  '))
}

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s):`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log(`✔ content ok: ${content.modules.length} modules, ${points.length} grammar points, ` +
  `${content.lexicon.length} lexicon entries, ${content.templates.length} templates`)
