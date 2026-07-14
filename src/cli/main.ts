import { createInterface } from 'node:readline/promises'
import { stdin, stdout, exit, cwd } from 'node:process'
import { join } from 'node:path'
import { loadContent, loadUser, saveUser } from './store'
import { checkAnswer } from '../engine/check'
import { markKnown, markUnknown, isKnown, currentModule } from '../engine/learner'
import type { Focus } from '../engine/learner'
import { iso } from '../engine/srs'
import {
  gradeSentence, gradeVerb, gradeVocab, pickSentence, pickVerbDrill, pickVocabCard, NEW_PER_SESSION,
} from '../engine/trainer'

// A persistent line queue instead of rl.question(): buffered lines from piped
// stdin would otherwise be dropped between sequential question() calls.
const rl = createInterface({ input: stdin, output: stdout })
const pending: string[] = []
const waiters: ((s: string) => void)[] = []
let closed = false
rl.on('line', l => { const w = waiters.shift(); w ? w(l) : pending.push(l) })
rl.on('close', () => { closed = true; for (const w of waiters.splice(0)) w('0') })
function ask(q: string): Promise<string> {
  stdout.write(q)
  const l = pending.shift()
  if (l !== undefined) { stdout.write(l + '\n'); return Promise.resolve(l) }
  if (closed) return Promise.resolve('0')
  return new Promise(res => waiters.push(res))
}

const content = loadContent(new URL('../../content', import.meta.url).pathname)
const userPath = join(cwd(), 'user.yaml')
const user = loadUser(userPath)
const today = iso(new Date())
const rnd = Math.random
let focus: Focus = {}
const save = () => saveUser(userPath, user)

const SESSION = 8

function header(): void {
  const known = user.grammar.known.length
  const total = content.modules.flatMap(m => m.points).length
  const focusInfo = focus.grammar?.length || focus.modules?.length || focus.tags?.length
    ? `  ·  Fokus: ${[...(focus.grammar ?? []), ...(focus.modules ?? []), ...(focus.tags ?? [])].join(', ')}`
    : ''
  console.log(`\n¡Amigo!  ·  Grammatik: ${known}/${total}  ·  aktuelles Modul: ${currentModule(user, content)}${focusInfo}`)
}

async function feedback(correct: boolean, canonical: string, notes?: string): Promise<void> {
  console.log(correct ? `  ✓ ${canonical}` : `  ✗ richtig: ${canonical}`)
  if (notes) console.log(`  ℹ ${notes}`)
}

async function vocabSession(): Promise<void> {
  let done = 0
  let introduced = 0
  while (done < SESSION) {
    const card = pickVocabCard(content, user, focus, today, rnd, introduced < NEW_PER_SESSION)
    if (!card) { console.log('Keine passenden Vokabeln — erst ein Modul freischalten (4).'); return }
    if (!user.vocab[card.key]) introduced++
    const input = await ask(`\n[${done + 1}/${SESSION}] ${card.prompt}\n> `)
    const res = checkAnswer(input, card.accepted, card.canonical)
    await feedback(res.correct, card.canonical, card.entry.notes_de)
    gradeVocab(user, card.key, res.correct, today)
    done++
  }
  save()
}

async function verbSession(): Promise<void> {
  let done = 0
  while (done < SESSION) {
    const d = pickVerbDrill(content, user, focus, today, rnd)
    if (!d) { console.log('Keine passenden Verben — erst ein Modul freischalten (4).'); return }
    const hint = d.direction === 'es-de' ? '  (auf Deutsch)' : ''
    const input = await ask(`\n[${done + 1}/${SESSION}] ${d.prompt}${hint}\n> `)
    const res = checkAnswer(input, d.accepted, d.canonical)
    await feedback(res.correct, d.canonical, res.correct ? undefined : d.verb.notes_de)
    gradeVerb(user, d.verb.lemma, d.cell, res.correct, today)
    done++
  }
  save()
}

async function sentenceSession(): Promise<void> {
  let done = 0
  while (done < SESSION) {
    const ex = pickSentence(content, user, focus, today, rnd)
    if (!ex) { console.log('Keine passenden Satz-Übungen — erst ein Modul freischalten (4).'); return }
    const input = await ask(`\n[${done + 1}/${SESSION}] Übersetze: ${ex.de}\n> `)
    const res = checkAnswer(input, ex.accepted, ex.es)
    await feedback(res.correct, ex.es, ex.notes_de)
    gradeSentence(user, ex, res.correct, today)
    done++
  }
  save()
}

async function unlockNext(): Promise<void> {
  const m = content.modules.find(m => m.points.some(p => !isKnown(user, p.id)))
  if (!m) { console.log('Alles freigeschaltet — ¡enhorabuena!'); return }
  console.log(`\nNächstes Modul: ${m.id} — ${m.title}`)
  for (const p of m.points) console.log(`  ${isKnown(user, p.id) ? '✓' : '·'} ${p.de}`)
  if ((await ask('Freischalten? (j/n) ')).toLowerCase().startsWith('j')) {
    for (const p of m.points) markKnown(user, content, p.id)
    save()
    console.log(`${m.id} freigeschaltet.`)
  }
}

async function settings(): Promise<void> {
  for (;;) {
    console.log('\nEinstellungen — Module (✓ = komplett bekannt):')
    content.modules.forEach((m, i) => {
      const known = m.points.filter(p => isKnown(user, p.id)).length
      const mark = known === m.points.length ? '✓' : known > 0 ? '~' : ' '
      console.log(`  ${String(i + 1).padStart(2)} [${mark}] ${m.id} ${m.title} (${known}/${m.points.length})`)
    })
    console.log('Nummer = Modul umschalten · pNummer = einzelne Punkte · v = Verb-Rückrichtung · 0 = zurück')
    console.log('(SRS-Feinjustierung: user.yaml direkt editieren — due/interval/ease)')
    const input = (await ask('> ')).trim()
    if (input === '0' || input === '') return
    if (input === 'v') {
      const cur = Math.round(user.settings.reverseVerbShare * 100)
      const s = (await ask(`Anteil Verb-Drills Spanisch→Deutsch in % (0–100, aktuell ${cur}): `)).trim()
      const n = parseInt(s, 10)
      if (!Number.isNaN(n) && n >= 0 && n <= 100) { user.settings.reverseVerbShare = n / 100; save() }
      continue
    }
    const pointMode = input.startsWith('p')
    const idx = parseInt(pointMode ? input.slice(1) : input, 10) - 1
    const m = content.modules[idx]
    if (!m) continue
    if (!pointMode) {
      const allKnown = m.points.every(p => isKnown(user, p.id))
      for (const p of m.points) allKnown ? markUnknown(user, content, p.id) : markKnown(user, content, p.id)
      save()
      continue
    }
    for (;;) {
      console.log(`\n${m.id} ${m.title}:`)
      m.points.forEach((p, i) =>
        console.log(`  ${i + 1} [${isKnown(user, p.id) ? '✓' : ' '}] ${p.de}  (${p.id})`))
      const s = (await ask('Nummer = umschalten · 0 = zurück > ')).trim()
      if (s === '0' || s === '') break
      const p = m.points[parseInt(s, 10) - 1]
      if (!p) continue
      isKnown(user, p.id) ? markUnknown(user, content, p.id) : markKnown(user, content, p.id)
      save()
    }
  }
}

async function chooseFocus(): Promise<void> {
  console.log('\nFokus: 1 = Grammatikpunkt · 2 = Modul · 3 = Preset laden · 4 = aktuellen Fokus speichern · 0 = kein Fokus')
  const c = (await ask('> ')).trim()
  if (c === '0') { focus = {}; return }
  if (c === '1') {
    const known = content.modules.flatMap(m => m.points).filter(p => isKnown(user, p.id))
    if (!known.length) { console.log('Noch nichts freigeschaltet.'); return }
    known.forEach((p, i) => console.log(`  ${i + 1} ${p.de}  (${p.id})`))
    const p = known[parseInt(await ask('> '), 10) - 1]
    if (p) focus = { grammar: [p.id] }
  } else if (c === '2') {
    content.modules.forEach((m, i) => console.log(`  ${i + 1} ${m.id} ${m.title}`))
    const m = content.modules[parseInt(await ask('> '), 10) - 1]
    if (m) focus = { modules: [m.id] }
  } else if (c === '3') {
    const names = Object.keys(user.presets)
    if (!names.length) { console.log('Keine Presets gespeichert.'); return }
    names.forEach((n, i) => console.log(`  ${i + 1} ${n}`))
    const n = names[parseInt(await ask('> '), 10) - 1]
    if (n) focus = user.presets[n]!
  } else if (c === '4') {
    const name = (await ask('Name: ')).trim()
    if (name) { user.presets[name] = focus; save() }
  }
}

async function main(): Promise<void> {
  if (user.grammar.known.length === 0)
    console.log('\nWillkommen! Noch nichts freigeschaltet — starte mit (4), oder markiere Bekanntes unter (6).')
  for (;;) {
    header()
    console.log('1 Vokabeln · 2 Verbformen · 3 Sätze · 4 Modul freischalten · 5 Fokus · 6 Einstellungen · 0 Ende')
    const c = (await ask('> ')).trim()
    if (c === '1') await vocabSession()
    else if (c === '2') await verbSession()
    else if (c === '3') await sentenceSession()
    else if (c === '4') await unlockNext()
    else if (c === '5') await chooseFocus()
    else if (c === '6') await settings()
    else if (c === '0') { save(); rl.close(); exit(0) }
  }
}

main()
