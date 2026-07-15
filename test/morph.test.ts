import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adjForm, article, attachClitics, contract, euphony, pluralize, stressIndex } from '../src/engine/morph'
import { normalize } from '../src/engine/check'
import type { Adjective } from '../src/engine/types'

const adj = (lemma: string, agreement: Adjective['agreement']): Adjective => ({
  kind: 'adj', lemma, agreement, copula: 'ser',
  senses: [{ copula: 'ser', de: '', applies_to: ['human'] }], level: 'A1', module: 'M01',
})

test('pluralize', () => {
  assert.equal(pluralize('casa'), 'casas')
  assert.equal(pluralize('ciudad'), 'ciudades')
  assert.equal(pluralize('lápiz'), 'lápices')
  assert.equal(pluralize('canción'), 'canciones') // accent dropped
  assert.equal(pluralize('alemán'), 'alemanes')
  assert.equal(pluralize('autobús'), 'autobuses')
  assert.equal(pluralize('café'), 'cafés')
})

test('adjective agreement', () => {
  assert.equal(adjForm(adj('pequeño', 'o/a'), 'f', false), 'pequeña')
  assert.equal(adjForm(adj('pequeño', 'o/a'), 'm', true), 'pequeños')
  assert.equal(adjForm(adj('grande', 'e'), 'f', false), 'grande')
  assert.equal(adjForm(adj('fácil', 'cons'), 'f', false), 'fácil')
  assert.equal(adjForm(adj('fácil', 'cons'), 'f', true), 'fáciles')
  assert.equal(adjForm(adj('alemán', 'nat'), 'f', false), 'alemana')
  assert.equal(adjForm(adj('español', 'nat'), 'f', true), 'españolas')
})

test('articles and contractions', () => {
  assert.equal(article('def', 'm', false), 'el')
  assert.equal(article('indef', 'f', true), 'unas')
  assert.equal(contract('voy a el parque'), 'voy al parque')
  assert.equal(contract('vengo de el cine'), 'vengo del cine')
})

test('euphony', () => {
  assert.equal(euphony('madre y hija'), 'madre e hija')
  assert.equal(euphony('siete o ocho'), 'siete u ocho')
})

test('stress detection', () => {
  assert.equal(stressIndex('hablo'), 1) // ha-blo → a
  assert.equal(stressIndex('comer'), 3) // co-mer → e
  assert.equal(stressIndex('está'), 3)
  assert.equal(stressIndex('levanta'), 3) // le-van-ta → a of van
})

test('clitic attachment with accent shift', () => {
  assert.equal(attachClitics('da', ['me', 'lo']), 'dámelo')
  assert.equal(attachClitics('di', ['me', 'lo']), 'dímelo')
  assert.equal(attachClitics('levanta', ['te']), 'levántate')
  assert.equal(attachClitics('pon', ['te']), 'ponte')
  assert.equal(attachClitics('da', ['me']), 'dame')
  assert.equal(attachClitics('levantando', ['me']), 'levantándome')
  assert.equal(attachClitics('levantar', ['me']), 'levantarme')
  assert.equal(attachClitics('levantad', ['os'], '2p'), 'levantaos')
  assert.equal(attachClitics('compra', ['lo']), 'cómpralo')
})

test('normalization for answer checking', () => {
  assert.equal(normalize('¿Dónde está el niño?'), 'donde esta el nino')
  assert.equal(normalize('  Sí,   claro. '), 'si claro')
  // the "…" placeholder is dropped: the phrase matches with or without it
  assert.equal(normalize('delante de …'), 'delante de')
  assert.equal(normalize('me llamo …'), 'me llamo')
  assert.equal(normalize('tener … años'), 'tener anos')
})
