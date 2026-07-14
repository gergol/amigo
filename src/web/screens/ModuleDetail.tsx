import { useState } from 'preact/hooks'
import type { AppCtx } from '../app'
import { content } from '../content'
import { isKnown, score } from '../engine'
import { Header } from '../components/ui'

export function ModuleDetail({ ctx }: { ctx: AppCtx }) {
  const { user, today } = ctx
  const [open, setOpen] = useState<string | null>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const m = content.modules.find(mm => mm.id === ctx.detailModule)
  if (!m) return null
  const allKnown = m.points.every(p => isKnown(user, p.id))

  return (
    <div class="screen">
      <Header title={`${m.id} — ${m.title}`} onBack={() => ctx.go('settings')}
        trailing={<button class="btn btn-ghost" style="font-size:12px" onClick={() => ctx.toggleModuleAll(m.id)}>{allKnown ? 'Alle abwählen' : 'Modul komplett'}</button>} />

      <div style="flex:1;padding:18px 24px 28px">
        <p class="t55" style="font-size:12px;line-height:1.5;margin:0 0 14px">Ein Grammatikpunkt abhaken hakt seine Voraussetzungen mit ab; das Abwählen einer Voraussetzung wählt abhängige Punkte ab. Sobald ein Punkt geübt wurde, zeigt er seinen Score (0–100, niedrig = kommt oft dran) — antippen zum Anpassen.</p>
        <div style="display:flex;flex-direction:column;border-top:1px solid var(--color-divider)">
          {m.points.map(p => {
            const on = isKnown(user, p.id)
            const st = user.grammar.srs?.[p.id]
            const isOpen = on && !!st && open === p.id
            const sc = isOpen && preview !== null ? preview : score(st)
            const errors = st?.errors ?? 0
            return (
              <div style="border-bottom:1px solid color-mix(in srgb,var(--color-divider) 55%,transparent)">
                <div class="list-row" role="button" onClick={() => ctx.togglePoint(p.id)} style="padding:13px 2px;border:none">
                  <span style={`width:22px;height:22px;flex:none;border-radius:var(--radius-sm);border:1.5px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'};background:${on ? 'var(--color-accent)' : 'transparent'};color:#fff;display:grid;place-items:center;font-size:13px`}>{on ? '✓' : ''}</span>
                  <span style="flex:1;font-size:13.5px;line-height:1.35">{p.de}</span>
                  <span style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
                    <span class="mono t45" style="font-size:10.5px">{p.id}</span>
                    {on && st && (
                      <button class="num" onClick={(ev) => { ev.stopPropagation(); setPreview(null); setOpen(isOpen ? null : p.id) }}
                        style={`font-family:var(--font-heading);font-size:11.5px;padding:1px 8px;border-radius:999px;border:1px solid ${sc < 40 ? 'var(--color-wrong)' : 'var(--color-accent)'};color:${sc < 40 ? 'var(--color-wrong)' : 'var(--color-accent)'};background:transparent`}>
                        {sc}{errors > 0 ? ` · ✗${errors}` : ''}
                      </button>
                    )}
                  </span>
                </div>
                {isOpen && (
                  <div style="padding:2px 2px 14px 32px" onClick={(ev) => ev.stopPropagation()}>
                    <input type="range" min={0} max={100} step={1} value={sc} style="width:100%"
                      onInput={(ev) => setPreview(+(ev.target as HTMLInputElement).value)}
                      onChange={(ev) => { ctx.setPointScore(p.id, +(ev.target as HTMLInputElement).value); setPreview(null) }} />
                    <p class="t55" style="font-size:11.5px;margin:4px 0 0">
                      Score {sc} · {errors} Fehler · {st!.due <= today ? 'jetzt fällig' : `fällig am ${st!.due}`}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
