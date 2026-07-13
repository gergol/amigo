import { parse, stringify } from 'yaml'
import { emptyUser } from '../engine/types'
import type { UserState } from '../engine/types'

// Browser analogue of src/cli/store.ts (user side only — content is prebuilt).
// State is stored as YAML text: identical bytes to a CLI user.yaml, so a learner can
// copy-paste their progress between terminal and phone.

const KEY = 'amigo.user'

const hydrate = (raw: unknown): UserState => {
  const u = emptyUser()
  const p = (raw ?? {}) as Partial<UserState>
  return {
    ...u, ...p,
    grammar: { ...u.grammar, ...p.grammar },
    settings: { ...u.settings, ...p.settings },
  }
}

export function loadUser(): UserState {
  const raw = localStorage.getItem(KEY)
  if (!raw) return emptyUser()
  try { return hydrate(parse(raw)) } catch { return emptyUser() }
}

export function saveUser(user: UserState): void {
  user.grammar.known.sort()
  localStorage.setItem(KEY, stringify(user, { sortMapEntries: true }))
}

export const exportYaml = (user: UserState): string =>
  stringify(user, { sortMapEntries: true })

export const importYaml = (text: string): UserState => hydrate(parse(text))
