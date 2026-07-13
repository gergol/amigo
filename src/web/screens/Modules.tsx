import type { AppCtx } from '../app'
import { content } from '../content'
import { moduleKnown } from '../engine'
import type { CurriculumModule } from '../engine'
import { Header } from '../components/ui'
import { Lock } from '../components/icons'

type Status = 'done' | 'next' | 'locked'

export function Modules({ ctx }: { ctx: AppCtx }) {
  const { user } = ctx
  const mods = content.modules
  const done = mods.map(m => moduleKnown(user, content, m.id))
  const nextIdx = done.indexOf(false)
  const doneCount = done.filter(Boolean).length
  const status = (i: number): Status => (done[i] ? 'done' : i === nextIdx ? 'next' : 'locked')

  const openModule = mods.find(m => m.id === ctx.unlockOpen)

  const Row = ({ m, i }: { m: CurriculumModule; i: number }) => {
    const st = status(i)
    const badge =
      st === 'done' ? <span style="display:grid;place-items:center;width:22px;height:22px;flex:none;border-radius:50%;border:1.5px solid var(--color-accent);color:var(--color-accent);font-size:12px">✓</span>
      : st === 'next' ? <span class="tag tag-outline" style="white-space:nowrap">Freischalten</span>
      : <Lock size={16} style="color:color-mix(in srgb,var(--color-text) 34%,transparent)" stroke-width={1.7} />
    return (
      <button
        onClick={() => st === 'next' && ctx.openUnlock(m.id)} disabled={st !== 'next'}
        style={`display:flex;align-items:center;gap:13px;text-align:left;cursor:${st === 'next' ? 'pointer' : 'default'};background:${st === 'next' ? 'var(--color-accent-100)' : 'transparent'};border:1px solid ${st === 'next' ? 'var(--color-accent)' : 'var(--color-divider)'};border-radius:var(--radius-md);padding:12px 14px;font-family:var(--font-body);color:var(--color-text);width:100%;opacity:${st === 'locked' ? '0.55' : '1'}`}>
        <span class="num" style="font-family:var(--font-heading);font-size:13px;color:var(--color-accent);width:34px;flex:none">{m.id}</span>
        <span style="flex:1;font-size:13.5px;line-height:1.3">{m.title}</span>
        {badge}
      </button>
    )
  }

  const Section = ({ level, label }: { level: 'A1' | 'A2'; label: string }) => (
    <div>
      <div class="kicker" style="margin-bottom:9px">{label}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        {mods.map((m, i) => (m.level === level ? <Row m={m} i={i} /> : null))}
      </div>
    </div>
  )

  return (
    <div class="screen">
      <Header title="Modul freischalten" onBack={() => ctx.go('home')}
        trailing={<span class="num t45" style="font-size:12.5px">{doneCount} / {mods.length}</span>} />

      <div style="flex:1;overflow-y:auto;padding:18px 24px 28px;display:flex;flex-direction:column;gap:20px">
        {doneCount === mods.length && (
          <div class="answer" style="text-align:center;font-family:var(--font-heading);font-size:20px;padding:8px 0">Alles freigeschaltet — ¡enhorabuena!</div>
        )}
        <Section level="A1" label="Niveau A1" />
        <Section level="A2" label="Niveau A2" />
      </div>

      {openModule && (
        <div class="dialog-backdrop" onClick={ctx.closeUnlock}>
          <div class="dialog" onClick={(e) => e.stopPropagation()}>
            <div>
              <span class="kicker">{openModule.id}</span>
              <div style="font-family:var(--font-heading);font-size:22px;line-height:1.2;margin-top:3px">{openModule.title}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:7px;margin:2px 0">
              {openModule.points.map(p => (
                <div style="display:flex;gap:9px;font-size:13px;line-height:1.4;color:color-mix(in srgb,var(--color-text) 78%,transparent)">
                  <span style="color:var(--color-accent)">·</span>{p.de}
                </div>
              ))}
            </div>
            <div style="display:flex;justify-content:flex-end;gap:9px;margin-top:6px">
              <button class="btn btn-secondary" style="min-height:42px" onClick={ctx.closeUnlock}>Abbrechen</button>
              <button class="btn btn-primary" style="min-height:42px" onClick={() => ctx.doUnlock(openModule.id)}>Freischalten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
