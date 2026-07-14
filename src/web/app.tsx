import { useState } from 'preact/hooks'
import { content } from './content'
import { loadUser, saveUser } from './store'
import { markKnown, markUnknown, isKnown, iso } from './engine'
import type { Focus, UserState, ModuleId } from './engine'
import {
  startSession, grade, advance, SESSION,
} from './session'
import type { SessionState, Trainer } from './session'
import { setInVocab, inVocab, setEntryScore } from './lexicon'
import type { LexEntry } from './engine'
import { Home } from './screens/Home'
import { Practice } from './screens/Practice'
import { Summary } from './screens/Summary'
import { Modules } from './screens/Modules'
import { Settings } from './screens/Settings'
import { ModuleDetail } from './screens/ModuleDetail'
import { VocabEditor } from './screens/VocabEditor'
import { FocusScreen } from './screens/Focus'

export type Screen =
  | 'home' | 'practice' | 'summary' | 'modules'
  | 'settings' | 'detail' | 'vocab' | 'focus'

// Everything a screen needs: current state + the actions that mutate it.
export interface AppCtx {
  user: UserState
  focus: Focus
  session: SessionState | null
  today: string
  // navigation
  go: (s: Screen) => void
  openDetail: (m: ModuleId) => void
  detailModule: ModuleId | null
  // session
  start: (t: Trainer) => void
  setInput: (v: string) => void
  insertChar: (ch: string) => void
  submitAnswer: (answer: string) => void
  toggleWhy: () => void
  next: () => void
  exitSession: () => void
  // modules / unlock
  unlockOpen: ModuleId | null
  openUnlock: (m: ModuleId) => void
  closeUnlock: () => void
  doUnlock: (m: ModuleId) => void
  // knowledge editor
  togglePoint: (id: string) => void
  toggleModuleAll: (m: ModuleId) => void
  knowAllA1: () => void
  setReverse: (pct: number) => void
  // vocab editor
  toggleVocab: (e: LexEntry) => void
  addGroupToVocab: (entries: LexEntry[]) => void
  setVocabScore: (e: LexEntry, pct: number) => void
  // focus
  setFocus: (f: Focus) => void
  dismissFocus: () => void
  savePreset: (name: string) => void
  // state import/export
  setUser: (u: UserState) => void
}

const rnd = Math.random

export function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [user, setUserState] = useState<UserState>(loadUser)
  const [focus, setFocusState] = useState<Focus>({})
  const [session, setSession] = useState<SessionState | null>(null)
  const [detailModule, setDetailModule] = useState<ModuleId | null>(null)
  const [unlockOpen, setUnlockOpen] = useState<ModuleId | null>(null)
  const [today] = useState(() => iso(new Date()))

  // Engine grade/mark functions mutate `user` in place; persist + re-render.
  const commit = () => { saveUser(user); setUserState({ ...user }) }
  const setUser = (u: UserState) => { saveUser(u); setUserState(u) }

  const moduleById = (id: ModuleId) => content.modules.find(m => m.id === id)

  const ctx: AppCtx = {
    user, focus, session, today, detailModule, unlockOpen,
    go: setScreen,
    openDetail: (m) => { setDetailModule(m); setScreen('detail') },

    start: (t) => { setSession(startSession(t, user, focus, today, rnd)); setScreen('practice') },
    setInput: (v) => setSession(s => (s ? { ...s, input: v } : s)),
    insertChar: (ch) => setSession(s => (s ? { ...s, input: s.input + ch } : s)),
    submitAnswer: (answer) => {
      if (!session?.card || session.revealed) return
      setSession(grade(session, user, answer, today))
      commit()
    },
    toggleWhy: () => setSession(s => (s ? { ...s, whyOpen: !s.whyOpen } : s)),
    next: () => {
      if (!session) return
      const finished = session.index >= SESSION - 1
      setSession(advance(session, user, focus, today, rnd))
      if (finished) setScreen('summary')
    },
    exitSession: () => { setSession(null); setScreen('home') },

    openUnlock: setUnlockOpen,
    closeUnlock: () => setUnlockOpen(null),
    doUnlock: (id) => {
      const m = moduleById(id)
      if (m) m.points.forEach(p => markKnown(user, content, p.id))
      commit(); setUnlockOpen(null)
    },

    togglePoint: (id) => {
      isKnown(user, id) ? markUnknown(user, content, id) : markKnown(user, content, id)
      commit()
    },
    toggleModuleAll: (id) => {
      const m = moduleById(id)
      if (!m) return
      const allKnown = m.points.every(p => isKnown(user, p.id))
      m.points.forEach(p => (allKnown ? markUnknown(user, content, p.id) : markKnown(user, content, p.id)))
      commit()
    },
    knowAllA1: () => {
      content.modules.filter(m => m.level === 'A1')
        .forEach(m => m.points.forEach(p => markKnown(user, content, p.id)))
      commit()
    },
    setReverse: (pct) => { user.settings.reverseVerbShare = pct / 100; commit() },

    toggleVocab: (e) => { setInVocab(user, e, !inVocab(user, e), today); commit() },
    addGroupToVocab: (entries) => { entries.forEach(e => setInVocab(user, e, true, today)); commit() },
    setVocabScore: (e, pct) => { setEntryScore(user, e, pct, today); commit() },

    setFocus: setFocusState,
    dismissFocus: () => setFocusState({}),
    savePreset: (name) => {
      user.presets[name] = { grammar: focus.grammar, tags: focus.tags, modules: focus.modules }
      commit()
    },

    setUser,
  }

  const view =
    screen === 'practice' ? <Practice ctx={ctx} />
    : screen === 'summary' ? <Summary ctx={ctx} />
    : screen === 'modules' ? <Modules ctx={ctx} />
    : screen === 'settings' ? <Settings ctx={ctx} />
    : screen === 'detail' ? <ModuleDetail ctx={ctx} />
    : screen === 'vocab' ? <VocabEditor ctx={ctx} />
    : screen === 'focus' ? <FocusScreen ctx={ctx} />
    : <Home ctx={ctx} />

  return <div class="frame-outer"><div class="frame">{view}</div></div>
}
