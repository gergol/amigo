import type { Content, GrammarPoint, LexEntry, ModuleId, Tag, UserState } from './types'

// Learner model (Plan/00): the known-grammar set with prerequisite cascade,
// module shortcuts, and focus filters. Pure functions over UserState.

export function allPoints(content: Content): GrammarPoint[] {
  return content.modules.flatMap(m => m.points)
}

const pointMap = (content: Content) => new Map(allPoints(content).map(p => [p.id, p]))

// Checking a point auto-checks its prerequisites (transitively).
export function markKnown(user: UserState, content: Content, pointId: string): void {
  const map = pointMap(content)
  const add = (id: string) => {
    if (user.grammar.known.includes(id)) return
    user.grammar.known.push(id)
    for (const pre of map.get(id)?.prereqs ?? []) add(pre)
  }
  add(pointId)
  user.grammar.known.sort()
}

// Unchecking a point unchecks its dependents (transitively).
export function markUnknown(user: UserState, content: Content, pointId: string): void {
  const points = allPoints(content)
  const drop = new Set([pointId])
  let grew = true
  while (grew) {
    grew = false
    for (const p of points)
      if (!drop.has(p.id) && p.prereqs.some(pre => drop.has(pre))) { drop.add(p.id); grew = true }
  }
  user.grammar.known = user.grammar.known.filter(id => !drop.has(id))
  if (user.grammar.srs) for (const id of drop) delete user.grammar.srs[id]
}

export const isKnown = (user: UserState, pointId: string): boolean =>
  user.grammar.known.includes(pointId)

export function moduleKnown(user: UserState, content: Content, moduleId: ModuleId): boolean {
  const m = content.modules.find(m => m.id === moduleId)
  return !!m && m.points.every(p => isKnown(user, p.id))
}

// The default path: the first module (in order) with unknown points is "current".
export function currentModule(user: UserState, content: Content): ModuleId {
  for (const m of content.modules) if (!moduleKnown(user, content, m.id)) return m.id
  return content.modules[content.modules.length - 1]!.id
}

// ---------- focus (Plan/00 focused practice) ----------

export interface Focus { grammar?: string[]; tags?: Tag[]; modules?: ModuleId[] }

// grammar entries may be exact ids or prefixes ending in '*' (copula.*)
export function focusMatchesPoint(focus: Focus, pointId: string): boolean {
  if (!focus.grammar?.length) return true
  return focus.grammar.some(g => (g.endsWith('*') ? pointId.startsWith(g.slice(0, -1)) : pointId === g))
}

export function focusMatchesEntry(focus: Focus, e: LexEntry): boolean {
  if (focus.modules?.length && !focus.modules.includes(e.module)) return false
  if (focus.tags?.length) {
    const tags: Tag[] = e.kind === 'noun' ? e.tags : e.kind === 'verb' ? (e.tags ?? []) : []
    if (!focus.tags.some(t => tags.includes(t))) return false
  }
  return true
}

// vocab key for an entry (shift adjectives are tracked per sense: lemma/ser, lemma/estar)
export function vocabKeys(e: LexEntry): string[] {
  if (e.kind === 'adj' && e.copula === 'shift') return e.senses.map(s => `${e.lemma}/${s.copula}`)
  return [e.kind === 'chunk' ? e.es : e.lemma]
}
