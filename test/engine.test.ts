import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadContent } from '../src/cli/store'
import { markKnown, markUnknown, allPoints } from '../src/engine/learner'
import { review, fresh, addDays, score, setScore, weight } from '../src/engine/srs'
import { checkAnswer } from '../src/engine/check'
import { generate, eligibleTemplates } from '../src/engine/templates'
import { pickVerbDrill, pickVocabCard, pickSentence, gradeVocab, gradeVerb, gradeSentence } from '../src/engine/trainer'
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

test('srs: errors are counted and boost the pick weight', () => {
  const today = '2026-07-14'
  let s = fresh(today)
  s = review(s, false, today)
  s = review(s, false, today)
  assert.equal(s.errors, 2)
  assert.ok(weight(s, today) > weight({ ...s, errors: 0 }, today)) // error-prone first
  assert.ok(weight(s, today) > weight(undefined, today)) // due beats unseen
})

test('weight is a smooth readiness ramp, not a due-day cliff', () => {
  const today = '2026-07-14'
  const at = (daysLeft: number) => weight({ due: addDays(today, daysLeft), interval: 40, ease: 2.5, errors: 0 }, today)
  assert.ok(at(35) < at(20) && at(20) < at(5) && at(5) < at(0)) // rises toward due
  assert.ok(weight(undefined, today) > at(35)) // unseen beats freshly reviewed …
  assert.ok(weight(undefined, today) < at(5)) // … but not almost-due
  assert.ok(at(0) - at(1) < 2) // no cliff at the due date
})

test('the previous card never repeats back-to-back', () => {
  const user: UserState = { ...emptyUser(), grammar: { known: allPoints(content).map(p => p.id) } }
  user.vocab['casa'] = fresh('2026-07-14')
  user.vocab['perro'] = fresh('2026-07-14')
  let seed = 17
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31 }
  let prev: string | undefined
  for (let i = 0; i < 40; i++) {
    const c = pickVocabCard(content, user, {}, '2026-07-14', rnd, false, prev)!
    assert.notEqual(c.key, prev)
    prev = c.key
  }
  // sole candidate → the block yields rather than starving the session
  delete user.vocab['perro']
  assert.equal(pickVocabCard(content, user, {}, '2026-07-14', rnd, false, 'casa')?.key, 'casa')
})

test('score maps interval to 0–100 and back', () => {
  const today = '2026-07-14'
  assert.equal(score(undefined), 0)
  assert.equal(score(fresh(today)), 0)
  assert.equal(score({ due: today, interval: 90, ease: 2.5 }), 100)
  const top = setScore(fresh(today), 100, today)
  assert.equal(top.interval, 90)
  assert.equal(top.due, addDays(today, 90))
  const half = setScore(fresh(today), 50, today)
  assert.ok(half.interval > 0 && half.interval < 90)
  assert.ok(Math.abs(score(half) - 50) <= 2) // integer intervals → round-trip within rounding
})

test('pickVocabCard with allowNew=false only serves words already in the vocab', () => {
  const user: UserState = { ...emptyUser(), grammar: { known: allPoints(content).map(p => p.id) } }
  let seed = 11
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31 }
  assert.equal(pickVocabCard(content, user, {}, '2026-07-14', rnd, false), undefined)
  user.vocab['casa'] = fresh('2026-07-14')
  for (let i = 0; i < 20; i++) {
    const c = pickVocabCard(content, user, {}, '2026-07-14', rnd, false)
    assert.equal(c?.key, 'casa')
  }
})

test('grading a verb cell also schedules its tense constellation', () => {
  const u = emptyUser()
  gradeVerb(u, 'hablar', 'presente.1s', false, '2026-07-14')
  assert.equal(u.grammar.srs!['presente.regular']!.errors, 1)
  gradeVerb(u, 'comer', 'indefinido.3p', true, '2026-07-14')
  assert.ok(u.grammar.srs!['indefinido.regular'])
  assert.equal(u.grammar.srs!['indefinido.regular']!.errors, 0)
})

test('verb drills stick to encountered verbs once any exist', () => {
  const user: UserState = { ...emptyUser(), grammar: { known: allPoints(content).map(p => p.id) } }
  user.vocab['hablar'] = fresh('2026-07-14')
  let seed = 21
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31 }
  for (let i = 0; i < 30; i++) {
    const d = pickVerbDrill(content, user, {}, '2026-07-14', rnd)
    assert.equal(d?.verb.lemma, 'hablar')
  }
  // empty vocab → fallback to all unlocked verbs, the trainer never goes dead
  const virgin: UserState = { ...emptyUser(), grammar: { known: allPoints(content).map(p => p.id) } }
  assert.ok(pickVerbDrill(content, virgin, {}, '2026-07-14', rnd))
})

test('overriding a wrong grade restores the schedule as if answered correctly', () => {
  // The "I said it right" override snapshots SRS before the wrong grade, then
  // restores it and re-grades as correct. The result must match a plain correct
  // grade — no leftover error count or ease penalty from the wrong attempt.
  const today = '2026-07-14'
  const scheduled = review(fresh(today), true, today) // an item due again in 1 day
  const day = scheduled.due
  const key = 'casa'

  const direct: UserState = { ...emptyUser(), vocab: { [key]: { ...scheduled } } }
  gradeVocab(direct, key, true, day)

  const override: UserState = { ...emptyUser(), vocab: { [key]: { ...scheduled } } }
  const snapshot = structuredClone(override.vocab) // taken before grading (session.grade)
  gradeVocab(override, key, false, day)
  assert.equal(override.vocab[key]!.errors, 1, 'wrong grade records an error')
  override.vocab = snapshot // overrideCorrect restores…
  gradeVocab(override, key, true, day) // …then re-grades as correct

  assert.deepEqual(override.vocab[key], direct.vocab[key])
  assert.equal(override.vocab[key]!.errors ?? 0, 0, 'override leaves no lingering error')
})

test('sentence exercises schedule their grammar constellations', () => {
  const user: UserState = { ...emptyUser(), grammar: { known: allPoints(content).map(p => p.id) } }
  let seed = 9
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31 }
  for (let i = 0; i < 50; i++) {
    const ex = pickSentence(content, user, {}, '2026-07-14', rnd)
    assert.ok(ex)
    if (!ex.points.length) continue
    gradeSentence(user, ex, false, '2026-07-14')
    for (const p of ex.points) assert.ok((user.grammar.srs![p]!.errors ?? 0) >= 1, `${p} not punished`)
    return
  }
  assert.fail('no sentence with grammar points generated')
})

test('checkAnswer ignores accents, case, punctuation', () => {
  const r = checkAnswer('donde esta maria', ['¿Dónde está María?'], '¿Dónde está María?')
  assert.ok(r.correct)
  assert.ok(!checkAnswer('donde estas maria', ['¿Dónde está María?'], 'x').correct)
})

test('checkAnswer accepts a different word order (same words)', () => {
  // Spanish word order is flexible; the generator emits only one ordering.
  assert.ok(checkAnswer('Hoy como pan.', ['Como pan hoy.'], 'Como pan hoy.').correct)
  assert.ok(checkAnswer('el gato negro', ['negro el gato'], 'x').correct)
  // A different word set is still wrong, and single-word answers stay exact.
  assert.ok(!checkAnswer('como carne hoy', ['Como pan hoy.'], 'x').correct)
  assert.ok(!checkAnswer('gatos', ['gato'], 'x').correct)
})

test('deVerbPhrase renders natural German cues, no doubled separable prefix', () => {
  assert.equal(deVerbPhrase(verb('hablar'), 'presente', '3p'), 'sie sprechen')
  assert.equal(deVerbPhrase(verb('hablar'), 'indefinido', '3p'), 'sie haben gestern gesprochen')
  assert.equal(deVerbPhrase(verb('empezar'), 'presente', '3s'), 'er fängt an') // not "fängt an an"
  assert.equal(deVerbPhrase(verb('salir'), 'presente', '3s'), 'er geht aus')
  assert.equal(deVerbPhrase(verb('lavarse'), 'presente', '3s'), 'er wäscht sich')
})

test('deVerbPhrase gives gustar-type verbs an idiomatic experiencer framing', () => {
  assert.equal(deVerbPhrase(verb('gustar'), 'presente', '3s'), 'das gefällt mir')
  assert.equal(deVerbPhrase(verb('gustar'), 'presente', '3p'), 'die gefallen mir')
  assert.equal(deVerbPhrase(verb('gustar'), 'perfecto', '3s'), 'das hat mir schon gefallen')
  assert.equal(deVerbPhrase(verb('doler'), 'presente', '3s'), 'das tut mir weh')
  assert.equal(deVerbPhrase(verb('interesar'), 'presente', '3s'), 'das interessiert mich') // accusative
})

test('verb drill: both directions accept their own canonical', () => {
  const base: UserState = { ...emptyUser(), grammar: { known: allPoints(content).map(p => p.id) } }
  for (const share of [0, 1]) {
    const user: UserState = { ...base, settings: { ...emptyUser().settings, reverseVerbShare: share } }
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
