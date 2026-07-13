import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadContent } from '../src/cli/store'
import { markKnown, markUnknown, allPoints } from '../src/engine/learner'
import { review, fresh, addDays } from '../src/engine/srs'
import { checkAnswer } from '../src/engine/check'
import { generate, eligibleTemplates } from '../src/engine/templates'
import { pickVerbDrill } from '../src/engine/trainer'
import { deVerbPhrase } from '../src/engine/german'
import { emptyUser } from '../src/engine/types'
import type { UserState, Verb } from '../src/engine/types'

const content = loadContent(new URL('../content', import.meta.url).pathname)
const verb = (l: string) => content.lexicon.find(e => e.kind === 'verb' && e.lemma === l) as Verb

test('markKnown pulls in prerequisites transitively', () => {
  const u = emptyUser()
  markKnown(u, content, 'perfecto.regular')
  assert.ok(u.grammar.known.includes('perfecto.regular'))
  assert.ok(u.grammar.known.includes('presente.irregular'))
  assert.ok(u.grammar.known.includes('presente.regular'))
  assert.ok(u.grammar.known.includes('pron.subject'))
})

test('markUnknown drops dependents transitively', () => {
  const u = emptyUser()
  markKnown(u, content, 'past.contrast')
  assert.ok(u.grammar.known.includes('indefinido.regular'))
  markUnknown(u, content, 'indefinido.regular')
  assert.ok(!u.grammar.known.includes('indefinido.regular'))
  assert.ok(!u.grammar.known.includes('indefinido.irregular'))
  assert.ok(!u.grammar.known.includes('past.contrast'))
  assert.ok(u.grammar.known.includes('presente.regular')) // prerequisite stays
})

test('srs: correct grows interval, wrong resets and lowers ease', () => {
  const s0 = fresh('2026-07-12')
  const s1 = review(s0, true, '2026-07-12')
  assert.equal(s1.interval, 1)
  const s2 = review(s1, true, addDays('2026-07-12', 1))
  assert.ok(s2.interval > 1)
  const s3 = review(s2, false, s2.due)
  assert.equal(s3.interval, 1)
  assert.ok(s3.ease < s2.ease)
})

test('checkAnswer ignores accents, case, punctuation', () => {
  const r = checkAnswer('donde esta maria', ['¿Dónde está María?'], '¿Dónde está María?')
  assert.ok(r.correct)
  assert.ok(!checkAnswer('donde estas maria', ['¿Dónde está María?'], 'x').correct)
})

test('deVerbPhrase renders natural German cues, no doubled separable prefix', () => {
  assert.equal(deVerbPhrase(verb('hablar'), 'presente', '3p'), 'sie sprechen')
  assert.equal(deVerbPhrase(verb('hablar'), 'indefinido', '3p'), 'sie haben gestern gesprochen')
  assert.equal(deVerbPhrase(verb('empezar'), 'presente', '3s'), 'er fängt an') // not "fängt an an"
  assert.equal(deVerbPhrase(verb('salir'), 'presente', '3s'), 'er geht aus')
  assert.equal(deVerbPhrase(verb('lavarse'), 'presente', '3s'), 'er wäscht sich')
})

test('verb drill: both directions accept their own canonical', () => {
  const base: UserState = { ...emptyUser(), grammar: { known: allPoints(content).map(p => p.id) } }
  for (const share of [0, 1]) {
    const user: UserState = { ...base, settings: { reverseVerbShare: share } }
    let seed = 3
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31 }
    for (let i = 0; i < 60; i++) {
      const d = pickVerbDrill(content, user, {}, '2026-07-13', rnd)
      assert.ok(d, 'drill produced nothing')
      assert.equal(d.direction, share === 1 ? 'es-de' : 'de-es')
      assert.ok(d.prompt.length > 0 && d.canonical.length > 0)
      assert.ok(checkAnswer(d.canonical, d.accepted, d.canonical).correct, `canonical not accepted: ${d.canonical}`)
    }
  }
})

test('every template generates and accepts its own canonical answer', () => {
  const user: UserState = { ...emptyUser(), grammar: { known: allPoints(content).map(p => p.id) } }
  let seed = 7
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31 }
  const eligible = eligibleTemplates(content, user)
  assert.ok(eligible.length >= 10)
  for (const t of eligible) {
    let produced = 0
    for (let i = 0; i < 30 && produced < 3; i++) {
      const ex = generate(t, content, user, rnd)
      if (!ex) continue
      produced++
      assert.ok(ex.de.length > 3, `${t.id}: empty prompt`)
      assert.ok(checkAnswer(ex.es, ex.accepted, ex.es).correct, `${t.id}: canonical not accepted: ${ex.es}`)
      assert.ok(!/\{|\}/.test(ex.es + ex.de), `${t.id}: unresolved token: ${ex.de} → ${ex.es}`)
    }
    assert.ok(produced > 0, `${t.id}: produced nothing`)
  }
})
