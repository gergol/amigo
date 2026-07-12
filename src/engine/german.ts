import type { DeGender, Person, Tense, Verb } from './types'

// German rendering: just enough morphology to generate unambiguous prompts.
// German output is never scored, only read — correctness matters, completeness doesn't.
// Authoring constraints that keep this small: German adjectives only predicative
// (uninflected), German patterns written in präsens V2 order (the engine moves
// non-finite parts to the end per tense).

type Case = 'nom' | 'akk' | 'dat'

const DEF: Record<Case, Record<DeGender | 'pl', string>> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  akk: { m: 'den', f: 'die', n: 'das', pl: 'die' },
  dat: { m: 'dem', f: 'der', n: 'dem', pl: 'den' },
}
const INDEF: Record<Case, Record<DeGender, string>> = {
  nom: { m: 'ein', f: 'eine', n: 'ein' },
  akk: { m: 'einen', f: 'eine', n: 'ein' },
  dat: { m: 'einem', f: 'einer', n: 'einem' },
}

export function deArticle(kind: 'def' | 'indef' | 'none', g: DeGender, plural: boolean, c: Case): string {
  if (kind === 'none') return ''
  if (kind === 'def') return DEF[c][plural ? 'pl' : g]
  return plural ? '' : INDEF[c][g] // no indefinite plural article in German
}

export const DE_SUBJ: Record<Person, string> = {
  '1s': 'ich', '2s': 'du', '3s': 'er', '1p': 'wir', '2p': 'ihr', '3p': 'sie',
}
export function deSubjectPronoun(p: Person, g: 'm' | 'f'): string {
  if (p === '3s') return g === 'f' ? 'sie' : 'er'
  return DE_SUBJ[p]
}

export const DE_REFLEXIVE: Record<Person, string> = {
  '1s': 'mich', '2s': 'dich', '3s': 'sich', '1p': 'uns', '2p': 'euch', '3p': 'sich',
}

// finite: goes in V2 position; tail: non-finite parts moved to clause end
export interface DeVerbForm { finite: string; tail: string }

const DE_ENDINGS: Record<Person, string> = { '1s': 'e', '2s': 'st', '3s': 't', '1p': 'en', '2p': 't', '3p': 'en' }

function dePraesens(v: Verb, p: Person): string {
  const irregular = v.de.praesens?.[p]
  if (irregular) return irregular
  const base = v.de.prefix ? v.de.inf.slice(v.de.prefix.length) : v.de.inf
  let s = base.replace(/e?n$/, '')
  if (/[tdmn]$/.test(s) && /^(st|t)$/.test(DE_ENDINGS[p]) && !/[lr][mn]$/.test(s)) s += 'e' // arbeitest
  if (/[sßxz]$/.test(s) && p === '2s') return s + 't' // heißt
  return s + DE_ENDINGS[p]
}

function dePartizip(v: Verb): string {
  if (v.de.partizip) return v.de.prefix ? v.de.prefix + v.de.partizip : v.de.partizip
  const base = v.de.prefix ? v.de.inf.slice(v.de.prefix.length) : v.de.inf
  const s = base.replace(/e?n$/, '')
  const pp = 'ge' + s + (/[td]$/.test(s) ? 'et' : 't')
  return (v.de.prefix ?? '') + pp
}

const WERDEN: Record<Person, string> = {
  '1s': 'werde', '2s': 'wirst', '3s': 'wird', '1p': 'werden', '2p': 'werdet', '3p': 'werden',
}

// German rendering choice per Spanish tense (Plan/05 sense principle):
//  presente → Präsens · perfecto/indefinido → Perfekt (Präteritum for sein/haben via stored forms)
//  imperfecto → Präteritum if stored, else "früher/immer"-cued Perfekt (cue is template text)
//  futuro → werden+Inf · ir-a-inf → Präsens (+ plan adverb in template) · estar+ger → "gerade"+Präsens
export function deVerb(v: Verb, tense: Tense, p: Person): DeVerbForm {
  const refl = v.de.reflexive ? ' ' + DE_REFLEXIVE[p] : ''
  switch (tense) {
    case 'presente':
    case 'ir-a-inf':
    case 'estar+ger':
      return { finite: dePraesens(v, p) + refl, tail: v.de.prefix ?? '' }
    case 'perfecto':
    case 'indefinido':
    case 'imperfecto': {
      const praet = v.de.praeteritum?.[p]
      if (praet) return { finite: praet + refl, tail: '' }
      const aux = v.de.aux === 'sein' ? SEIN_PRAES[p] : HABEN_PRAES[p]
      return { finite: aux + refl, tail: dePartizip(v) }
    }
    case 'estaba+ger': {
      const praet = v.de.praeteritum?.[p]
      if (praet) return { finite: praet + refl, tail: '' }
      const aux = v.de.aux === 'sein' ? SEIN_PRAES[p] : HABEN_PRAES[p]
      return { finite: aux + refl, tail: 'gerade ' + dePartizip(v) }
    }
    case 'futuro':
      return { finite: WERDEN[p] + refl, tail: (v.de.prefix ? v.de.prefix + base(v) : v.de.inf) }
    case 'imperativo': {
      const impRefl = v.de.reflexive ? ' ' + DE_REFLEXIVE[p === '3s' || p === '3p' ? '3s' : p] : ''
      if (p === '2s') {
        const st = v.de.imperativ2s ?? base(v).replace(/e?n$/, '')
        return { finite: st + impRefl, tail: v.de.prefix ?? '' }
      }
      if (p === '2p') return { finite: base(v).replace(/e?n$/, '') + 't' + (v.de.reflexive ? ' euch' : ''), tail: v.de.prefix ?? '' }
      return { finite: v.de.inf + ' Sie' + (v.de.reflexive ? ' sich' : ''), tail: '' } // usted(es) → Sie
    }
  }
}

const base = (v: Verb) => (v.de.prefix ? v.de.inf.slice(v.de.prefix.length) : v.de.inf)

const HABEN_PRAES: Record<Person, string> = {
  '1s': 'habe', '2s': 'hast', '3s': 'hat', '1p': 'haben', '2p': 'habt', '3p': 'haben',
}
const SEIN_PRAES: Record<Person, string> = {
  '1s': 'bin', '2s': 'bist', '3s': 'ist', '1p': 'sind', '2p': 'seid', '3p': 'sind',
}
