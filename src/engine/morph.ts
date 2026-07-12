import type { Adjective, Gender, Noun, Person } from './types'

// Spanish non-verb morphology: plurals, agreement, articles, contractions,
// stress/accents for clitic attachment, euphony. (Plan/05 morphology rules.)

const ACCENTED: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }
const TO_ACCENT: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' }
const stripWordAccents = (w: string) => w.replace(/[áéíóú]/g, c => ACCENTED[c]!)

export function pluralize(word: string): string {
  if (/z$/.test(word)) return word.slice(0, -1) + 'ces' // lápiz → lápices
  if (/[aeiouáéó]$/.test(word)) return word + 's'
  // consonant-final: +es, dropping a now-unneeded final-syllable accent (canción → canciones)
  const syl = nuclei(word)
  if (syl.length > 1 && /[áéíóú]/.test(word.slice(syl[syl.length - 1]!)))
    return stripWordAccents(word) + 'es'
  return word + 'es'
}

// ---------- adjectives ----------

export function adjForm(a: Adjective, g: Gender, plural: boolean): string {
  let f = a.lemma
  if (g === 'f') {
    if (a.agreement === 'o/a') f = f.slice(0, -1) + 'a'
    if (a.agreement === 'nat') f = stripWordAccents(f) + 'a' // alemán → alemana
  }
  return plural ? pluralize(f) : f
}

// ---------- nouns & articles ----------

export function nounForm(n: Noun, g: Gender, plural: boolean): string {
  let f = n.lemma
  if (g === 'f' && n.fem) f = n.fem
  if (!plural) return f
  return n.plural ?? pluralize(f)
}

// elAgua: feminine noun starting with stressed a-/ha- takes el/un in the singular
export function article(kind: 'def' | 'indef', g: Gender, plural: boolean, elAgua = false): string {
  if (kind === 'def') return plural ? (g === 'm' ? 'los' : 'las') : g === 'm' || elAgua ? 'el' : 'la'
  return plural ? (g === 'm' ? 'unos' : 'unas') : g === 'm' || elAgua ? 'un' : 'una'
}

export const isElAgua = (n: { lemma: string; gender: string }): boolean =>
  n.gender === 'f' && /^h?a/.test(n.lemma) && stressIndex(n.lemma) <= 1

// a+el→al, de+el→del — applied on the joined sentence
export const contract = (s: string) => s.replace(/\ba el\b/g, 'al').replace(/\bde el\b/g, 'del')

// y→e before (h)i-, o→u before (h)o-
export const euphony = (s: string) =>
  s.replace(/\by (?=h?i)/g, 'e ').replace(/\bo (?=h?o)/g, 'u ')

// ---------- stress & clitic attachment ----------

// Indices of syllable nuclei (start of each vowel nucleus), left to right.
function nuclei(word: string): number[] {
  const w = stripWordAccents(word.toLowerCase())
  const isV = (c: string) => 'aeiouü'.includes(c)
  const strong = (c: string, orig: string) => 'aeo'.includes(c) || /[áéíóú]/.test(orig)
  const out: number[] = []
  let i = 0
  while (i < word.length) {
    if (!isV(w[i]!)) { i++; continue }
    out.push(i)
    // consume the rest of the vowel group, splitting at hiatus (strong+strong or accented weak)
    let j = i + 1
    while (j < word.length && isV(w[j]!)) {
      if (strong(w[j - 1]!, word[j - 1]!) && strong(w[j]!, word[j]!)) out.push(j)
      else if (/[íú]/.test(word[j]!)) out.push(j) // día: accented weak starts new nucleus
      j++
    }
    i = j
  }
  return out
}

// Char index of the stressed vowel.
export function stressIndex(word: string): number {
  const acc = word.search(/[áéíóú]/)
  if (acc !== -1) return acc
  const ns = nuclei(word)
  if (ns.length === 0) return -1
  const idx = /[aeiouns]$/i.test(stripWordAccents(word)) && ns.length > 1 ? ns.length - 2 : ns.length - 1
  const start = ns[idx]!
  // within a diphthong, stress the last strong vowel, else the last vowel
  const end = idx + 1 < ns.length ? ns[idx + 1]! : word.length
  let best = start
  for (let k = start; k < end && 'aeiouü'.includes(stripWordAccents(word[k]!.toLowerCase())); k++)
    if ('aeo'.includes(word[k]!)) best = k
  return best
}

// Attach clitics to an imperative/gerund/infinitive, adding a written accent when
// the stress would otherwise move (da+me+lo → dámelo, levantando+me → levantándome).
export function attachClitics(form: string, clitics: string[], person?: Person): string {
  if (clitics.length === 0) return form
  if (person === '2p' && clitics[0] === 'os' && form.endsWith('d'))
    return form.slice(0, -1) + clitics.join('') // levantad+os → levantaos
  const stressed = stressIndex(form)
  const combined = form + clitics.join('')
  if (/[áéíóú]/.test(form)) return combined // stress already written (está+te)
  if (stressIndex(combined) === stressed) return combined
  return form.slice(0, stressed) + TO_ACCENT[form[stressed]!]! + form.slice(stressed + 1) + clitics.join('')
}

// ---------- pronouns ----------

export const SUBJECT_PRONOUN: Record<Person, string> = {
  '1s': 'yo', '2s': 'tú', '3s': 'él', '1p': 'nosotros', '2p': 'vosotros', '3p': 'ellos',
}
export function subjectPronoun(p: Person, g: Gender): string {
  if (p === '3s') return g === 'f' ? 'ella' : 'él'
  if (p === '3p') return g === 'f' ? 'ellas' : 'ellos'
  if (p === '1p') return g === 'f' ? 'nosotras' : 'nosotros'
  if (p === '2p') return g === 'f' ? 'vosotras' : 'vosotros'
  return SUBJECT_PRONOUN[p]
}

export const REFLEXIVE: Record<Person, string> = {
  '1s': 'me', '2s': 'te', '3s': 'se', '1p': 'nos', '2p': 'os', '3p': 'se',
}
export const IO_CLITIC: Record<Person, string> = {
  '1s': 'me', '2s': 'te', '3s': 'le', '1p': 'nos', '2p': 'os', '3p': 'les',
}
export function doClitic(p: Person, g: Gender): string {
  if (p === '3s') return g === 'f' ? 'la' : 'lo'
  if (p === '3p') return g === 'f' ? 'las' : 'los'
  return REFLEXIVE[p]
}
