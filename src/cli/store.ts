import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { emptyUser } from '../engine/types'
import type { Content, LexEntry, Template, UserState } from '../engine/types'

// The only file I/O in the app: content/*.yaml → Content, user.yaml ↔ UserState.

export function loadContent(dir: string): Content {
  const grammar = parse(readFileSync(join(dir, 'grammar.yaml'), 'utf8'))
  const misc = parse(readFileSync(join(dir, 'misc.yaml'), 'utf8'))
  const verbs = parse(readFileSync(join(dir, 'verbs.yaml'), 'utf8'))

  const lexicon: LexEntry[] = verbs.verbs.map((v: object) => ({ kind: 'verb', ...v }))
  const lexDir = join(dir, 'lexicon')
  for (const file of readdirSync(lexDir).filter(f => f.endsWith('.yaml')).sort()) {
    const doc = parse(readFileSync(join(lexDir, file), 'utf8'))
    for (const n of doc.nouns ?? []) lexicon.push({ kind: 'noun', ...n })
    for (const a of doc.adjectives ?? []) lexicon.push({ kind: 'adj', ...a })
    for (const c of doc.chunks ?? []) lexicon.push({ kind: 'chunk', ...c })
  }

  const templates: Template[] = []
  const tplDir = join(dir, 'templates')
  if (existsSync(tplDir))
    for (const file of readdirSync(tplDir).filter(f => f.endsWith('.yaml')).sort())
      templates.push(...(parse(readFileSync(join(tplDir, file), 'utf8')).templates ?? []))

  return { modules: grammar.modules, lexicon, templates, names: misc.names, times: misc.times }
}

// ---------- user.yaml ----------

export function loadUser(path: string): UserState {
  if (!existsSync(path)) return emptyUser()
  const raw = parse(readFileSync(path, 'utf8')) ?? {}
  const u = emptyUser()
  return { ...u, ...raw, grammar: { ...u.grammar, ...raw.grammar } }
}

export function saveUser(path: string, user: UserState): void {
  user.grammar.known.sort()
  writeFileSync(path, stringify(user, { sortMapEntries: true }))
}
