import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conjugate, gerund, participle } from '../src/engine/conjugate'
import type { Verb } from '../src/engine/types'

const v = (partial: Partial<Verb> & { lemma: string; class: Verb['class'] }): Verb => ({
  kind: 'verb', valence: { subject: ['human'] }, de: { inf: '' }, gloss_de: '',
  level: 'A1', module: 'M03', ...partial,
})

const hablar = v({ lemma: 'hablar', class: 'ar' })
const comer = v({ lemma: 'comer', class: 'er' })
const vivir = v({ lemma: 'vivir', class: 'ir' })

test('regular presente', () => {
  assert.equal(conjugate(hablar, 'presente', '1s'), 'hablo')
  assert.equal(conjugate(hablar, 'presente', '2p'), 'habláis')
  assert.equal(conjugate(comer, 'presente', '3p'), 'comen')
  assert.equal(conjugate(vivir, 'presente', '1p'), 'vivimos')
  assert.equal(conjugate(vivir, 'presente', '2p'), 'vivís')
})

test('stem changes: boot pattern only', () => {
  const querer = v({ lemma: 'querer', class: 'er', patterns: ['e>ie'] })
  assert.equal(conjugate(querer, 'presente', '1s'), 'quiero')
  assert.equal(conjugate(querer, 'presente', '1p'), 'queremos') // no change outside boot
  const poder = v({ lemma: 'poder', class: 'er', patterns: ['o>ue'] })
  assert.equal(conjugate(poder, 'presente', '3s'), 'puede')
  assert.equal(conjugate(poder, 'presente', '2p'), 'podéis')
  const pedir = v({ lemma: 'pedir', class: 'ir', patterns: ['e>i'] })
  assert.equal(conjugate(pedir, 'presente', '3p'), 'piden')
  const jugar = v({ lemma: 'jugar', class: 'ar', patterns: ['u>ue'] })
  assert.equal(conjugate(jugar, 'presente', '1s'), 'juego')
  const empezar = v({ lemma: 'empezar', class: 'ar', patterns: ['e>ie'] })
  assert.equal(conjugate(empezar, 'presente', '3s'), 'empieza') // change the right e
})

test('regular indefinido + orthographic changes', () => {
  assert.equal(conjugate(hablar, 'indefinido', '1s'), 'hablé')
  assert.equal(conjugate(hablar, 'indefinido', '3s'), 'habló')
  assert.equal(conjugate(comer, 'indefinido', '3p'), 'comieron')
  const buscar = v({ lemma: 'buscar', class: 'ar' })
  assert.equal(conjugate(buscar, 'indefinido', '1s'), 'busqué')
  const llegar = v({ lemma: 'llegar', class: 'ar' })
  assert.equal(conjugate(llegar, 'indefinido', '1s'), 'llegué')
  const empezar = v({ lemma: 'empezar', class: 'ar', patterns: ['e>ie'] })
  assert.equal(conjugate(empezar, 'indefinido', '1s'), 'empecé')
  assert.equal(conjugate(empezar, 'indefinido', '3s'), 'empezó') // -ar verbs: no vowel raise
})

test('-ir stem changers raise vowel in 3rd-person indefinido and gerund', () => {
  const pedir = v({ lemma: 'pedir', class: 'ir', patterns: ['e>i'] })
  assert.equal(conjugate(pedir, 'indefinido', '3s'), 'pidió')
  assert.equal(conjugate(pedir, 'indefinido', '3p'), 'pidieron')
  assert.equal(conjugate(pedir, 'indefinido', '1s'), 'pedí')
  assert.equal(gerund(pedir), 'pidiendo')
  const dormir = v({ lemma: 'dormir', class: 'ir', patterns: ['o>ue'] })
  assert.equal(conjugate(dormir, 'indefinido', '3s'), 'durmió')
  assert.equal(gerund(dormir), 'durmiendo')
  const preferir = v({ lemma: 'preferir', class: 'ir', patterns: ['e>ie'] })
  assert.equal(conjugate(preferir, 'indefinido', '3s'), 'prefirió')
  assert.equal(gerund(preferir), 'prefiriendo')
})

test('vowel-final -er stems: y-forms and accents', () => {
  const leer = v({ lemma: 'leer', class: 'er' })
  assert.equal(conjugate(leer, 'indefinido', '3s'), 'leyó')
  assert.equal(conjugate(leer, 'indefinido', '3p'), 'leyeron')
  assert.equal(conjugate(leer, 'indefinido', '2s'), 'leíste')
  assert.equal(gerund(leer), 'leyendo')
  assert.equal(participle(leer), 'leído')
})

test('strong preterites', () => {
  const tener = v({ lemma: 'tener', class: 'er', patterns: ['e>ie', 'strong-pret'], pretStem: 'tuv', overrides: { 'presente.1s': 'tengo' } })
  assert.equal(conjugate(tener, 'indefinido', '1s'), 'tuve')
  assert.equal(conjugate(tener, 'indefinido', '3s'), 'tuvo')
  assert.equal(conjugate(tener, 'indefinido', '3p'), 'tuvieron')
  const decir = v({ lemma: 'decir', class: 'ir', patterns: ['e>i', 'strong-pret'], pretStem: 'dij', overrides: { 'presente.1s': 'digo' }, gerund: 'diciendo', participle: 'dicho' })
  assert.equal(conjugate(decir, 'indefinido', '3p'), 'dijeron') // j-stem drops i
  assert.equal(conjugate(decir, 'presente', '1s'), 'digo')
  assert.equal(conjugate(decir, 'presente', '2s'), 'dices')
})

test('imperfecto', () => {
  assert.equal(conjugate(hablar, 'imperfecto', '1s'), 'hablaba')
  assert.equal(conjugate(hablar, 'imperfecto', '1p'), 'hablábamos')
  assert.equal(conjugate(comer, 'imperfecto', '3s'), 'comía')
})

test('futuro with irregular stems', () => {
  assert.equal(conjugate(hablar, 'futuro', '1s'), 'hablaré')
  const tener = v({ lemma: 'tener', class: 'er', futStem: 'tendr' })
  assert.equal(conjugate(tener, 'futuro', '3s'), 'tendrá')
})

test('perfecto and periphrases', () => {
  const hacer = v({ lemma: 'hacer', class: 'er', participle: 'hecho' })
  assert.equal(conjugate(hacer, 'perfecto', '1s'), 'he hecho')
  assert.equal(conjugate(comer, 'perfecto', '2p'), 'habéis comido')
  assert.equal(conjugate(comer, 'estar+ger', '1s'), 'estoy comiendo')
  assert.equal(conjugate(comer, 'estaba+ger', '3s'), 'estaba comiendo')
  assert.equal(conjugate(comer, 'ir-a-inf', '1p'), 'vamos a comer')
})

test('imperativo', () => {
  assert.equal(conjugate(hablar, 'imperativo', '2s'), 'habla')
  assert.equal(conjugate(hablar, 'imperativo', '2p'), 'hablad')
  assert.equal(conjugate(hablar, 'imperativo', '3s'), 'hable')
  assert.equal(conjugate(comer, 'imperativo', '3s'), 'coma')
  const pedir = v({ lemma: 'pedir', class: 'ir', patterns: ['e>i'] })
  assert.equal(conjugate(pedir, 'imperativo', '2s'), 'pide')
  assert.equal(conjugate(pedir, 'imperativo', '3s'), 'pida')
  const buscar = v({ lemma: 'buscar', class: 'ar' })
  assert.equal(conjugate(buscar, 'imperativo', '3s'), 'busque') // orthographic
  const tener = v({ lemma: 'tener', class: 'er', patterns: ['e>ie'], overrides: { 'presente.1s': 'tengo', 'imperativo.2s': 'ten' } })
  assert.equal(conjugate(tener, 'imperativo', '2s'), 'ten')
  assert.equal(conjugate(tener, 'imperativo', '3s'), 'tenga')
  const hacer = v({ lemma: 'hacer', class: 'er', overrides: { 'presente.1s': 'hago', 'imperativo.2s': 'haz' } })
  assert.equal(conjugate(hacer, 'imperativo', '3s'), 'haga')
})

test('reflexive lemma strips -se', () => {
  const levantarse = v({ lemma: 'levantarse', class: 'ar', reflexive: true })
  assert.equal(conjugate(levantarse, 'presente', '1s'), 'levanto')
  assert.equal(conjugate(levantarse, 'imperativo', '2s'), 'levanta')
})
