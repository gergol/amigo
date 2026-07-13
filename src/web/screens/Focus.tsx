import { useState } from 'preact/hooks'
import type { AppCtx } from '../app'
import { content } from '../content'
import { allPoints, isKnown } from '../engine'
import type { Focus, Tag } from '../engine'
import { Header } from '../components/ui'
import { Bookmark } from '../components/icons'

// Real engine Tag values that make sensible focus filters (Open Question #1:
// the design's gender_trap / false_friend aren't in the Tag union — omitted).
const FOCUS_TAGS: Tag[] = ['nationality', 'profession', 'family-role', 'place', 'food', 'thing']

const has = (arr: string[] | undefined, v: string) => !!arr?.includes(v)
const toggle = (arr: string[] | undefined, v: string): string[] => {
  const s = new Set(arr ?? [])
  s.has(v) ? s.delete(v) : s.add(v)
  return [...s]
}

export function FocusScreen({ ctx }: { ctx: AppCtx }) {
  const { user, focus } = ctx
  const [name, setName] = useState('')

  const knownPoints = allPoints(content).filter(p => isKnown(user, p.id))
  const set = (f: Focus) => ctx.setFocus(f)

  const Chip = ({ on, label, mono, onClick }: { on: boolean; label: string; mono?: boolean; onClick: () => void }) => (
    <button class={`chip${mono ? ' mono' : ''}`} aria-pressed={on} onClick={onClick}>{label}</button>
  )

  const Group = ({ label, children }: { label: string; children: any }) => (
    <div>
      <div class="kicker" style="margin-bottom:10px">{label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">{children}</div>
    </div>
  )

  const presetNames = Object.keys(user.presets)

  return (
    <div class="screen">
      <Header title="Fokus" onBack={() => ctx.go('home')} />

      <div style="flex:1;overflow-y:auto;padding:18px 24px 24px;display:flex;flex-direction:column;gap:22px">
        <p class="t62" style="font-size:12.5px;line-height:1.55;margin:0">Ein Fokus filtert, <i>was</i> gedrillt wird — nicht wie. Kombinierbar und als Preset speicherbar.</p>

        <Group label="Grammatikpunkt">
          {knownPoints.length === 0
            ? <span class="t45" style="font-size:12.5px">Erst Grammatik freischalten.</span>
            : knownPoints.map(p => (
              <Chip on={has(focus.grammar, p.id)} label={p.de}
                onClick={() => set({ ...focus, grammar: toggle(focus.grammar, p.id) })} />
            ))}
        </Group>

        <Group label="Modul">
          {content.modules.map(m => (
            <Chip on={has(focus.modules, m.id)} label={m.id}
              onClick={() => set({ ...focus, modules: toggle(focus.modules, m.id) })} />
          ))}
        </Group>

        <Group label="Tag / Thema">
          {FOCUS_TAGS.map(t => (
            <Chip mono on={has(focus.tags, t)} label={t}
              onClick={() => set({ ...focus, tags: toggle(focus.tags, t) as Tag[] })} />
          ))}
        </Group>

        <div style="border-top:1px solid var(--color-divider);padding-top:18px">
          <div class="kicker" style="color:color-mix(in srgb,var(--color-text) 48%,transparent);margin-bottom:10px">Gespeicherte Presets</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            {presetNames.length === 0
              ? <span class="t45" style="font-size:12.5px">Noch keine Presets.</span>
              : presetNames.map(n => (
                <button class="row" style="gap:10px;padding:11px 14px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px"
                  onClick={() => set(user.presets[n]!)}>
                  <Bookmark size={15} style="color:var(--color-accent);flex:none" />{n}
                </button>
              ))}
          </div>
          <div style="display:flex;gap:9px;margin-top:12px">
            <input class="input" placeholder="Preset-Name …" style="flex:1;min-height:40px"
              value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
            <button class="btn btn-secondary" style="min-height:40px;white-space:nowrap" disabled={!name.trim()}
              onClick={() => { ctx.savePreset(name.trim()); setName('') }}>Speichern</button>
          </div>
        </div>
      </div>

      <div style="padding:16px 24px 24px;border-top:1px solid var(--color-divider);display:flex;gap:10px">
        <button class="btn btn-secondary" style="min-height:46px" onClick={() => { ctx.dismissFocus(); ctx.go('home') }}>Fokus entfernen</button>
        <button class="btn btn-primary" style="flex:1;min-height:46px" onClick={() => ctx.go('home')}>Fokus übernehmen</button>
      </div>
    </div>
  )
}
