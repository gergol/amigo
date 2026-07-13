import { conjugate, infinitive, gerund } from './conjugate'
import { deArticle, deSubjectPronoun, deVerb, DE_REFLEXIVE } from './german'
import {
  adjForm, article, attachClitics, contract, doClitic, euphony, IO_CLITIC, isElAgua,
  nounForm, REFLEXIVE, subjectPronoun,
} from './morph'
import { TENSE_POINT } from './types'
import type {
  Adjective, AdjSense, Content, Gender, LexEntry, Noun, Person, PersonName,
  SubjSlot, Tag, Template, Tense, UserState, Verb,
} from './types'

// Template expansion (Plan/05): fill typed slots from the lexicon, render the
// German prompt and the Spanish solution from the same filled structure, and
// collect exactly the alternative answers the generator itself would produce.

export interface Rng { (): number } // 0..1
const pick = <T>(arr: T[], rnd: Rng): T => arr[Math.floor(rnd() * arr.length)]!

export interface Subject {
  person: Person
  gender: Gender
  genderFree: boolean // ich/du/wir/ihr: German doesn't reveal gender → accept both agreements
  tags: Tag[] // semantic tags of the subject (drives adjective applies_to)
  phrase?: { es: string; de: string } // visible subject (name or noun phrase)
}

export interface Instance {
  template: Template
  tense: Tense
  negated: boolean
  subject: Subject
  fillers: Record<string, LexEntry | { es: string; de: string }>
  plural: Record<string, boolean> // resolved number per noun slot
  verb?: Verb // absent for chunk-style templates without a verb slot
  adjSense?: AdjSense
}

export interface Exercise {
  de: string // prompt
  es: string // canonical solution
  accepted: string[] // all accepted answers (unnormalized; checking normalizes)
  vocabKeys: string[] // lexicon items exercised → SRS
  verbCells: { lemma: string; cell: string }[] // verb forms exercised → SRS
  templateId: string
  notes_de?: string
}

// ---------- eligibility ----------

export function eligibleTemplates(content: Content, user: UserState, focusGrammar?: string[]): Template[] {
  const known = new Set(user.grammar.known)
  return content.templates.filter(t => {
    if (!t.requires.every(r => known.has(r))) return false
    if (allowedTenses(t, known).length === 0) return false
    if (focusGrammar?.length) {
      const match = (g: string, id: string) => (g.endsWith('*') ? id.startsWith(g.slice(0, -1)) : id === g)
      if (!focusGrammar.some(g => t.requires.some(r => match(g, r)))) return false
    }
    return true
  })
}

export function allowedTenses(t: Template, known: Set<string>): Tense[] {
  const wanted = t.tenses ?? ['presente']
  // presente is gated by the template's own requires (M01 copula templates exist
  // before presente.regular is taught); every other tense by its grammar point
  return wanted.filter(x => x === 'presente' || known.has(TENSE_POINT[x]))
}

// ---------- filling ----------

const entryTags = (e: LexEntry): Tag[] =>
  e.kind === 'noun' ? e.tags : e.kind === 'verb' ? (e.tags ?? []) : []

function knownEntries(content: Content, user: UserState): LexEntry[] {
  // slot fillers come from vocab the learner has met (module of entry unlocked ⇒ any of its points known)
  const knownModules = new Set(
    content.modules.filter(m => m.points.some(p => user.grammar.known.includes(p.id))).map(m => m.id),
  )
  return content.lexicon.filter(e => knownModules.has(e.module))
}

function fillSubject(slot: SubjSlot, pool: LexEntry[], names: PersonName[], rnd: Rng): Subject {
  const persons = slot.persons ?? ['1s', '2s', '3s', '1p', '2p', '3p']
  const person = pick(persons, rnd)
  if ((person === '3s' || person === '3p') && slot.nouns?.length && rnd() < 0.6) {
    if (person === '3s' && rnd() < 0.5 && slot.nouns.includes('human') && names.length) {
      const n = pick(names, rnd)
      return { person, gender: n.gender, genderFree: false, tags: ['human'], phrase: { es: n.name, de: n.name } }
    }
    const nouns = pool.filter((e): e is Noun =>
      e.kind === 'noun' && !e.plural_only && slot.nouns!.some(t => e.tags.includes(t)))
    if (nouns.length) {
      const n = pick(nouns, rnd)
      // German side has only one noun form, so pair/mf nouns appear masculine (de.fem: later)
      const g = n.gender === 'f' ? 'f' : 'm'
      const plural = person === '3p'
      return {
        person, gender: g, genderFree: false, tags: n.tags,
        phrase: {
          es: `${article('def', g, plural, isElAgua(n))} ${nounForm(n, g, plural)}`,
          de: `${deArticle('def', n.de.g, plural, 'nom')} ${plural ? n.de.plural ?? n.de.noun : n.de.noun}`,
        },
      }
    }
  }
  const gender = rnd() < 0.5 ? 'f' : 'm'
  const genderFree = person !== '3s' && person !== '3p'
  return { person, gender, genderFree, tags: ['human'] }
}

// ---------- rendering ----------

interface Rendered { de: string; esVariants: string[] }

// Spanish finite-verb cluster: [no] [clitics] [verb …]; for periphrases also the
// attached variant (voy a levantarme / está levantándose); imperative attaches.
function verbCluster(v: Verb, tense: Tense, subj: Subject, negated: boolean, extraClitics: string[]): string[] {
  const clitics = [...(v.reflexive ? [REFLEXIVE[subj.person]] : []), ...extraClitics]
  const no = negated ? 'no ' : ''
  if (tense === 'imperativo') {
    const form = conjugate(v, tense, subj.person)
    return [attachClitics(form, clitics, subj.person)]
  }
  const form = conjugate(v, tense, subj.person)
  const proclitic = no + (clitics.length ? clitics.join(' ') + ' ' : '') + form
  const variants = [proclitic]
  if (clitics.length && (tense === 'ir-a-inf' || tense === 'estar+ger' || tense === 'estaba+ger')) {
    const parts = form.split(' ')
    const head = parts.slice(0, -1).join(' ')
    const last = parts[parts.length - 1]!
    variants.push(no + head + ' ' + attachClitics(last, clitics))
  }
  return variants
}

function renderInstance(inst: Instance, content: Content): Rendered | null {
  const { template: t, subject } = inst
  const esParts: string[][] = [] // alternatives per token
  const deParts: string[] = []
  let deTail = ''

  const tokens = tokenize(t.es)
  const deTokens = tokenize(t.de)

  for (const tok of tokens) {
    if (tok.lit !== undefined) { esParts.push([tok.lit]); continue }
    const name = tok.slot!
    const slot = t.slots[name]
    if (!slot) return null
    switch (slot.type) {
      case 'subj': {
        if (subject.phrase) esParts.push([subject.phrase.es])
        else {
          const pron = subjectPronoun(subject.person, subject.gender)
          esParts.push(['', pron]) // canonical pro-drop, pronoun accepted
        }
        break
      }
      case 'verb': {
        const clitic = Object.entries(t.slots).find(([, s]) => s.type === 'clitic')
        const extra: string[] = []
        if (clitic) {
          const c = inst.fillers[clitic[0]] as { es: string; de: string }
          extra.push(c.es)
        }
        if ((slot.valence ?? '') === 'gustar') {
          // gustar: IO clitic from subject-axis person, verb agrees with theme
          const themeSlot = Object.entries(t.slots).find(([, s]) => s.type === 'noun')
          const themePerson: Person = themeSlot && inst.plural[themeSlot[0]] ? '3p' : '3s'
          const io = IO_CLITIC[subject.person]
          const no = inst.negated ? 'no ' : ''
          esParts.push([no + io + ' ' + conjugate(inst.verb!, inst.tense, themePerson)])
        } else {
          esParts.push(verbCluster(inst.verb!, inst.tense, subject, inst.negated, extra))
        }
        break
      }
      case 'noun': {
        const n = inst.fillers[name] as Noun
        const g = n.gender === 'mf' ? 'm' : n.gender
        const plural = !!inst.plural[name]
        // mass nouns take no indefinite article (compro pan / ich kaufe Brot)
        const noArt = slot.article === 'none' || (n.mass && slot.article === 'indef')
        const art = noArt ? '' : article(slot.article as 'def' | 'indef', g, plural, isElAgua(n)) + ' '
        const personalA = slot.role === 'do' && n.tags.includes('human') ? 'a ' : ''
        esParts.push([personalA + art + nounForm(n, g, plural)])
        break
      }
      case 'adj': {
        const a = inst.fillers[name] as Adjective
        const plural = ['1p', '2p', '3p'].includes(subject.person)
        // genderFree (ich/du/wir/ihr): canonical masculine, feminine accepted too
        const g = subject.genderFree ? 'm' : subject.gender
        const forms = [adjForm(a, g, plural)]
        if (subject.genderFree) {
          const fem = adjForm(a, 'f', plural)
          if (fem !== forms[0]) forms.push(fem)
        }
        esParts.push(forms)
        break
      }
      case 'clitic': break // rendered inside the verb cluster
      case 'time':
      case 'lit': {
        const pair = inst.fillers[name] as { es: string; de: string }
        esParts.push([pair.es])
        break
      }
      case 'inf': {
        const iv = inst.fillers[name] as Verb
        const inf = infinitive(iv)
        esParts.push([iv.reflexive ? attachClitics(inf, [REFLEXIVE[subject.person]]) : inf])
        break
      }
    }
  }

  // German: finite verb at {v} position, non-finite tail at clause end
  for (const tok of deTokens) {
    if (tok.lit !== undefined) { deParts.push(tok.lit); continue }
    const name = tok.slot!
    if (name === 'nicht') { deParts.push(inst.negated ? 'nicht' : ''); continue }
    const slot = t.slots[name]
    if (!slot) return null
    switch (slot.type) {
      case 'subj': {
        // gustar templates: German experiencer pronoun — dative (mir gefällt …), or
        // accusative for verbs like interesar (mich interessiert …)
        const verbSlot = Object.values(t.slots).find(s => s.type === 'verb')
        if (verbSlot && (verbSlot as { valence?: string }).valence === 'gustar' && !subject.phrase) {
          deParts.push((inst.verb?.de.experiencerAkk ? DE_DO : DE_IO)[subject.person])
          break
        }
        deParts.push(subject.phrase ? subject.phrase.de : deSubjectPronoun(subject.person, subject.gender))
        break
      }
      case 'verb': {
        if ((slot.valence ?? '') === 'gustar') {
          const themeSlot = Object.entries(t.slots).find(([, s]) => s.type === 'noun')
          const themePerson: Person = themeSlot && inst.plural[themeSlot[0]] ? '3p' : '3s'
          const f = deVerb(inst.verb!, inst.tense, themePerson)
          deParts.push(f.finite); deTail = f.tail
        } else {
          const f = deVerb(inst.verb!, inst.tense, subject.person)
          deParts.push(f.finite); deTail = f.tail
        }
        break
      }
      case 'noun': {
        const n = inst.fillers[name] as Noun
        const plural = !!inst.plural[name]
        const kind = slot.article === 'none' || (n.mass && slot.article === 'indef') ? 'none' : slot.article
        const art = deArticle(kind, n.de.g, plural, slot.deCase)
        deParts.push((art ? art + ' ' : '') + (plural ? n.de.plural ?? n.de.noun : n.de.noun))
        break
      }
      case 'adj':
        deParts.push(inst.adjSense!.de)
        break
      case 'clitic':
      case 'time':
      case 'lit': {
        const pair = inst.fillers[name] as { es: string; de: string }
        deParts.push(pair.de)
        break
      }
      case 'inf': {
        const iv = inst.fillers[name] as Verb
        deParts.push(iv.de.inf + (iv.de.reflexive ? ' ' + DE_REFLEXIVE[subject.person] : ''))
        break
      }
    }
  }

  const de = finishDe(deParts, deTail)
  const esVariants = cartesian(esParts).map(parts => finishEs(parts))
  return { de, esVariants }
}

function tokenize(pattern: string): { lit?: string; slot?: string }[] {
  const out: { lit?: string; slot?: string }[] = []
  const re = /\{([a-z0-9_]+)\}/gi
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(pattern))) {
    if (m.index > last) out.push({ lit: pattern.slice(last, m.index) })
    out.push({ slot: m[1]! })
    last = m.index + m[0].length
  }
  if (last < pattern.length) out.push({ lit: pattern.slice(last) })
  return out
}

const joinParts = (parts: string[]) => parts.join('').replace(/\s+/g, ' ').replace(/\s+([?!.,])/g, '$1').trim()

function finishEs(parts: string[]): string {
  let s = joinParts(parts)
  s = contract(euphony(s))
  s = /^[¿¡]/.test(s) ? s.charAt(0) + s.charAt(1).toUpperCase() + s.slice(2) : s.charAt(0).toUpperCase() + s.slice(1)
  if (!/[.?!]$/.test(s)) s += '.'
  return s
}

const DE_CONTRACTIONS: [RegExp, string][] = [
  [/\bin dem\b/g, 'im'], [/\bin das\b/g, 'ins'], [/\ban dem\b/g, 'am'], [/\ban das\b/g, 'ans'],
  [/\bzu dem\b/g, 'zum'], [/\bzu der\b/g, 'zur'], [/\bbei dem\b/g, 'beim'], [/\bvon dem\b/g, 'vom'],
]

function finishDe(parts: string[], tail: string): string {
  let s = joinParts(parts)
  if (tail) s = s.replace(/([.?!])?$/, m => ' ' + tail + (m || ''))
  for (const [re, to] of DE_CONTRACTIONS) s = s.replace(re, to)
  s = s.replace(/\s+/g, ' ').trim()
  s = s.charAt(0).toUpperCase() + s.slice(1)
  if (!/[.?!]$/.test(s)) s += '.'
  return s
}

function cartesian(parts: string[][]): string[][] {
  let acc: string[][] = [[]]
  for (const alts of parts) {
    const next: string[][] = []
    for (const a of acc) for (const alt of alts) next.push([...a, alt])
    acc = next
    if (acc.length > 32) acc = acc.slice(0, 32)
  }
  return acc
}

// ---------- generation ----------

const DE_DO: Record<Person, string> = { '1s': 'mich', '2s': 'dich', '3s': 'ihn', '1p': 'uns', '2p': 'euch', '3p': 'sie' }
const DE_IO: Record<Person, string> = { '1s': 'mir', '2s': 'dir', '3s': 'ihm', '1p': 'uns', '2p': 'euch', '3p': 'ihnen' }

export function generate(
  t: Template, content: Content, user: UserState, rnd: Rng,
  vocabWeight?: (key: string) => number,
): Exercise | null {
  const known = new Set(user.grammar.known)
  const pool = knownEntries(content, user)
  const weighted = <T extends LexEntry>(cands: T[]): T | undefined => {
    if (!cands.length) return undefined
    if (!vocabWeight) return pick(cands, rnd)
    const ws = cands.map(c => Math.max(0.1, vocabWeight(vocabKey(c))))
    let r = rnd() * ws.reduce((a, b) => a + b, 0)
    for (let i = 0; i < cands.length; i++) { r -= ws[i]!; if (r <= 0) return cands[i] }
    return cands[cands.length - 1]
  }

  // tense & verb (templates without a verb slot — chunk-style like "me gustaría {inf}" —
  // are fixed-presente and exercise no verb cell)
  const slotEntries = Object.entries(t.slots)
  const verbSlotEntry = slotEntries.find(([, s]) => s.type === 'verb')
  let tense: Tense = 'presente'
  let verb: Verb | undefined
  if (verbSlotEntry) {
    const verbSlot = verbSlotEntry[1] as Extract<Template['slots'][string], { type: 'verb' }>
    const tenses = verbSlot.tense ? [verbSlot.tense] : allowedTenses(t, known)
    if (!tenses.length) return null
    tense = pick(tenses, rnd)
    let verbs = pool.filter((e): e is Verb => e.kind === 'verb')
    if (verbSlot.lemmas) verbs = content.lexicon.filter((e): e is Verb => e.kind === 'verb' && verbSlot.lemmas!.includes(e.lemma))
    else {
      if (verbSlot.reflexive !== undefined) verbs = verbs.filter(v => !!v.reflexive === verbSlot.reflexive)
      if (verbSlot.valence === 'intrans') verbs = verbs.filter(v => !v.valence.object && !v.valence.gustar && !v.valence.inf)
      if (verbSlot.valence === 'trans') verbs = verbs.filter(v => !!v.valence.object)
      if (verbSlot.valence === 'inf') verbs = verbs.filter(v => !!v.valence.inf)
      if (verbSlot.valence === 'gustar') verbs = verbs.filter(v => !!v.valence.gustar)
    }
    verb = weighted(verbs)
    if (!verb) return null
  }

  // subject
  const subjSlot = slotEntries.find(([, s]) => s.type === 'subj')
  const subject: Subject = subjSlot
    ? fillSubject(subjSlot[1] as SubjSlot, pool, content.names, rnd)
    : { person: '3s', gender: 'm', genderFree: false, tags: ['thing'] }
  if (tense === 'imperativo' && !['2s', '2p', '3s', '3p'].includes(subject.person)) return null

  // other slots
  const fillers: Instance['fillers'] = {}
  const plural: Record<string, boolean> = {}
  let adjSense: AdjSense | undefined
  for (const [name, slot] of slotEntries) {
    if (slot.type === 'noun') {
      // object must fit the verb's valence tags when the verb is lexicon-drawn
      const want = verb?.valence.object && slot.role === 'do' ? verb.valence.object.tags : slot.tags
      const tags = slot.tags.filter(x => want.includes(x)).length ? slot.tags.filter(x => want.includes(x)) : slot.tags
      const used = new Set(Object.values(fillers).map(f => (f as Noun).lemma).filter(Boolean))
      const subjLemma = subject.phrase?.es.split(' ').pop()
      const nouns = pool.filter((e): e is Noun =>
        e.kind === 'noun' && !e.plural_only
        && tags.some(tag => e.tags.includes(tag)) && !used.has(e.lemma) && e.lemma !== subjLemma
        && (!slot.lemmas || slot.lemmas.includes(e.lemma)))
      const n = weighted(nouns)
      if (!n) return null
      fillers[name] = n
      plural[name] = slot.number === 'pl' || (slot.number === 'both' && rnd() < 0.4)
    } else if (slot.type === 'adj') {
      const copula = slot.copula ?? (verb?.lemma === 'estar' ? 'estar' : 'ser')
      const adjs = pool.filter((e): e is Adjective => {
        if (e.kind !== 'adj') return false
        if (slot.shiftOnly && e.copula !== 'shift') return false
        if (slot.tags?.length && !slot.tags.some(x => e.tags?.includes(x))) return false
        // gender-restricted adjectives need a subject with *known* matching gender
        if (e.gender && (subject.genderFree || e.gender !== subject.gender)) return false
        const sense = e.senses.find(s => s.copula === copula) ?? (e.copula === 'both' ? e.senses[0] : undefined)
        if (!sense) return false
        return sense.applies_to.some(x => subject.tags.includes(x))
      })
      const a = weighted(adjs)
      if (!a) return null
      fillers[name] = a
      adjSense = a.senses.find(s => s.copula === copula) ?? a.senses[0]
    } else if (slot.type === 'lit') {
      fillers[name] = pick(slot.options, rnd)
    } else if (slot.type === 'inf') {
      const infs = content.lexicon.filter((e): e is Verb => e.kind === 'verb' && slot.lemmas.includes(e.lemma))
      const iv = weighted(infs)
      if (!iv) return null
      fillers[name] = iv
    } else if (slot.type === 'clitic') {
      // never the subject's own person family (te veo — not *nos escuchamos, *du gibst euch)
      const persons = (slot.persons ?? (['1s', '2s', '1p', '2p'] as Person[]))
        .filter(p => p[0] !== subject.person[0])
      if (!persons.length) return null
      const p = pick(persons, rnd)
      fillers[name] = slot.role === 'do'
        ? { es: doClitic(p, 'm'), de: DE_DO[p] }
        : { es: IO_CLITIC[p], de: DE_IO[p] }
    } else if (slot.type === 'time') {
      const times = content.times.filter(x => x.tenses.includes(tense))
      if (!times.length) return null
      const time = pick(times, rnd)
      fillers[name] = { es: time.es, de: time.de }
    }
  }

  const negated = !!t.polarity && rnd() < 0.3
  const inst: Instance = { template: t, tense, negated, subject, fillers, plural, verb, adjSense }
  const rendered = renderInstance(inst, content)
  if (!rendered) return null

  // both_same copula: accept the sentence with the other copula as well
  let accepted = rendered.esVariants
  const adjFillerEntry = Object.values(fillers).find(f => (f as Adjective).kind === 'adj') as Adjective | undefined
  if (adjFillerEntry?.copula === 'both' && (verb?.lemma === 'ser' || verb?.lemma === 'estar')) {
    const otherLemma = verb.lemma === 'ser' ? 'estar' : 'ser'
    const other = content.lexicon.find((e): e is Verb => e.kind === 'verb' && e.lemma === otherLemma)
    if (other) {
      const altInst = { ...inst, verb: other }
      const alt = renderInstance(altInst, content)
      if (alt) accepted = [...accepted, ...alt.esVariants]
    }
  }

  // future prompts: both futuro and ir a + inf are correct Spanish for plans;
  // ir-a-inf prompts (German präsens + plan adverb) also accept plain presente
  const alsoAccept: Tense[] = tense === 'futuro' ? ['ir-a-inf'] : tense === 'ir-a-inf' ? ['presente'] : []
  for (const altTense of alsoAccept) {
    const alt = renderInstance({ ...inst, tense: altTense }, content)
    if (alt) accepted = [...accepted, ...alt.esVariants]
  }

  const vocabKeys = Object.values(fillers)
    .filter((f): f is LexEntry => 'kind' in (f as object))
    .map(f => vocabKey(f as LexEntry, adjSense))
  if (verb) vocabKeys.push(vocabKey(verb))

  return {
    de: rendered.de,
    es: rendered.esVariants[0]!,
    accepted,
    vocabKeys,
    verbCells: verb ? [{ lemma: verb.lemma, cell: `${tense}.${subject.person}` }] : [],
    templateId: t.id,
    notes_de: t.notes_de,
  }
}

export function vocabKey(e: LexEntry, sense?: AdjSense): string {
  if (e.kind === 'adj' && e.copula === 'shift') return `${e.lemma}/${(sense ?? e.senses[0]!).copula}`
  return e.kind === 'chunk' ? e.es : e.lemma
}

export { gerund, infinitive }
