import type { AppCtx } from '../app'
import { content } from '../content'
import { isKnown } from '../engine'
import { Header } from '../components/ui'

export function ModuleDetail({ ctx }: { ctx: AppCtx }) {
  const { user } = ctx
  const m = content.modules.find(mm => mm.id === ctx.detailModule)
  if (!m) return null
  const allKnown = m.points.every(p => isKnown(user, p.id))

  return (
    <div class="screen">
      <Header title={`${m.id} — ${m.title}`} onBack={() => ctx.go('settings')}
        trailing={<button class="btn btn-ghost" style="font-size:12px" onClick={() => ctx.toggleModuleAll(m.id)}>{allKnown ? 'Alle abwählen' : 'Modul komplett'}</button>} />

      <div style="flex:1;padding:18px 24px 28px">
        <p class="t55" style="font-size:12px;line-height:1.5;margin:0 0 14px">Ein Grammatikpunkt abhaken hakt seine Voraussetzungen mit ab; das Abwählen einer Voraussetzung wählt abhängige Punkte ab.</p>
        <div style="display:flex;flex-direction:column;border-top:1px solid var(--color-divider)">
          {m.points.map(p => {
            const on = isKnown(user, p.id)
            return (
              <button class="list-row" onClick={() => ctx.togglePoint(p.id)} style="padding:13px 2px">
                <span style={`width:22px;height:22px;flex:none;border-radius:var(--radius-sm);border:1.5px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'};background:${on ? 'var(--color-accent)' : 'transparent'};color:#fff;display:grid;place-items:center;font-size:13px`}>{on ? '✓' : ''}</span>
                <span style="flex:1;font-size:13.5px;line-height:1.35">{p.de}</span>
                <span class="mono t45" style="font-size:10.5px">{p.id}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
