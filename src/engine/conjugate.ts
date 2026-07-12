import type { Person, Tense, Verb } from './types'

// Spanish verb conjugation for all A1/A2 tenses (Plan/04).
// Forms are generated from class + patterns; `overrides` win over everything.

const PRESENTE: Record<string, string[]> = {
  ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
  er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
  ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
}
const INDEFINIDO: Record<string, string[]> = {
  ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
  er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
  ir: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
}
const IMPERFECTO: Record<string, string[]> = {
  ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
  er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  ir: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
}
const FUTURO = ['é', 'ás', 'á', 'emos', 'éis', 'án']
const STRONG_PRET = ['e', 'iste', 'o', 'imos', 'isteis', 'ieron']
const HABER_PRES = ['he', 'has', 'ha', 'hemos', 'habéis', 'han']

const PIDX: Record<Person, number> = { '1s': 0, '2s': 1, '3s': 2, '1p': 3, '2p': 4, '3p': 5 }
const BOOT: Person[] = ['1s', '2s', '3s', '3p']

export const stem = (v: Verb): string => infinitive(v).slice(0, -2)
export const infinitive = (v: Verb): string => (v.reflexive ? v.lemma.slice(0, -2) : v.lemma)

function stemChange(s: string, pattern: string): string {
  // change the last occurrence of the pattern vowel in the stem (empezar → empiez)
  const [from, to] = pattern === 'e>ie' ? ['e', 'ie'] : pattern === 'o>ue' ? ['o', 'ue']
    : pattern === 'e>i' ? ['e', 'i'] : ['u', 'ue']
  const i = s.lastIndexOf(from!)
  return i === -1 ? s : s.slice(0, i) + to + s.slice(i + from!.length)
}

const bootPattern = (v: Verb) => v.patterns?.find(p => p !== 'strong-pret')

// -car/-gar/-zar before e: busqué, llegué, empecé; also usted-imperative busque
function orthE(stemEnd: string): string {
  return stemEnd.replace(/c$/, 'qu').replace(/g$/, 'gu').replace(/z$/, 'c')
}

export function gerund(v: Verb): string {
  if (v.gerund) return v.gerund
  const s = stem(v)
  if (v.class === 'ar') return s + 'ando'
  // -ir stem changers raise the vowel: pedir→pidiendo, preferir→prefiriendo, dormir→durmiendo
  let g = s
  if (v.class === 'ir') {
    const p = bootPattern(v)
    if (p === 'e>ie' || p === 'e>i') g = stemChange(s, 'e>i')
    else if (p === 'o>ue') { const i = s.lastIndexOf('o'); g = s.slice(0, i) + 'u' + s.slice(i + 1) }
  }
  return /[aeo]$/.test(g) ? g + 'yendo' : g + 'iendo' // leer → leyendo
}

export function participle(v: Verb): string {
  if (v.participle) return v.participle
  const s = stem(v)
  if (v.class === 'ar') return s + 'ado'
  return /[ae]$/.test(s) ? s + 'ído' : s + 'ido' // leer → leído, caer → caído
}

function presente(v: Verb, p: Person): string {
  let s = stem(v)
  const pat = bootPattern(v)
  if (pat && BOOT.includes(p)) s = stemChange(s, pat)
  return s + PRESENTE[v.class]![PIDX[p]]!
}

function indefinido(v: Verb, p: Person): string {
  if (v.patterns?.includes('strong-pret')) {
    const end = STRONG_PRET[PIDX[p]]!
    const st = v.pretStem!
    return st + (st.endsWith('j') && p === '3p' ? 'eron' : end) // dijeron
  }
  let s = stem(v)
  const pat = bootPattern(v)
  // -ir stem changers: 3rd persons pidió/durmió
  if (v.class === 'ir' && pat && (p === '3s' || p === '3p'))
    s = pat === 'o>ue' ? s.slice(0, s.lastIndexOf('o')) + 'u' + s.slice(s.lastIndexOf('o') + 1) : stemChange(s, 'e>i')
  let end = INDEFINIDO[v.class]![PIDX[p]]!
  if (v.class === 'ar' && p === '1s') s = orthE(s) // busqué
  // vowel-final -er/-ir stems: leyó/leyeron, oyó
  if (v.class !== 'ar' && /[aeiou]$/.test(s)) {
    if (p === '3s') end = 'yó'
    if (p === '3p') end = 'yeron'
    if (['2s', '1p', '2p'].includes(p)) end = 'í' + end.slice(1) // leíste, leímos, leísteis
  }
  return s + end
}

function futuro(v: Verb, p: Person): string {
  return (v.futStem ?? infinitive(v)) + FUTURO[PIDX[p]]!
}

function imperativo(v: Verb, p: Person): string {
  if (p === '2s') return presente(v, '3s') // habla, pide
  if (p === '2p') return infinitive(v).slice(0, -1) + 'd' // hablad
  // usted/ustedes: subjunctive from yo-form (tenga, haga); -ar verbs get the
  // orthographic change before e (busque, llegue, empiece)
  const yo = conjugate(v, 'presente', '1s')
  const base = v.class === 'ar' ? orthE(yo.slice(0, -1)) : yo.slice(0, -1)
  const vowel = v.class === 'ar' ? 'e' : 'a'
  return base + vowel + (p === '3p' ? 'n' : '')
}

export function conjugate(v: Verb, tense: Tense, p: Person): string {
  const key = `${tense}.${p}`
  const o = v.overrides?.[key]
  if (o) return o
  switch (tense) {
    case 'presente': return presente(v, p)
    case 'indefinido': return indefinido(v, p)
    case 'imperfecto': return stem(v) + IMPERFECTO[v.class]![PIDX[p]]!
    case 'futuro': return futuro(v, p)
    case 'perfecto': return HABER_PRES[PIDX[p]]! + ' ' + participle(v)
    case 'estar+ger': return conjugate(ESTAR_REF, 'presente', p) + ' ' + gerund(v)
    case 'estaba+ger': return conjugate(ESTAR_REF, 'imperfecto', p) + ' ' + gerund(v)
    case 'ir-a-inf': return conjugate(IR_REF, 'presente', p) + ' a ' + infinitive(v)
    case 'imperativo': return imperativo(v, p)
  }
}

// estar and ir are needed by periphrases; minimal self-contained definitions,
// content-level entries for them carry the same overrides (validated at load).
const minimalVerb = (lemma: string, cls: 'ar' | 'er' | 'ir', overrides: Record<string, string>): Verb => ({
  kind: 'verb', lemma, class: cls, overrides, valence: { subject: [] },
  de: { inf: '' }, gloss_de: '', level: 'A1', module: 'M02',
})

export const ESTAR_OVERRIDES: Record<string, string> = {
  'presente.1s': 'estoy', 'presente.2s': 'estás', 'presente.3s': 'está', 'presente.3p': 'están',
  'indefinido.1s': 'estuve', 'indefinido.2s': 'estuviste', 'indefinido.3s': 'estuvo',
  'indefinido.1p': 'estuvimos', 'indefinido.2p': 'estuvisteis', 'indefinido.3p': 'estuvieron',
  'imperativo.2s': 'está', 'imperativo.3s': 'esté', 'imperativo.3p': 'estén',
}
export const IR_OVERRIDES: Record<string, string> = {
  'presente.1s': 'voy', 'presente.2s': 'vas', 'presente.3s': 'va',
  'presente.1p': 'vamos', 'presente.2p': 'vais', 'presente.3p': 'van',
  'indefinido.1s': 'fui', 'indefinido.2s': 'fuiste', 'indefinido.3s': 'fue',
  'indefinido.1p': 'fuimos', 'indefinido.2p': 'fuisteis', 'indefinido.3p': 'fueron',
  'imperfecto.1s': 'iba', 'imperfecto.2s': 'ibas', 'imperfecto.3s': 'iba',
  'imperfecto.1p': 'íbamos', 'imperfecto.2p': 'ibais', 'imperfecto.3p': 'iban',
  'imperativo.2s': 've', 'imperativo.3s': 'vaya', 'imperativo.2p': 'id', 'imperativo.3p': 'vayan',
}
const ESTAR_REF = minimalVerb('estar', 'ar', ESTAR_OVERRIDES)
const IR_REF = minimalVerb('ir', 'ir', IR_OVERRIDES)
