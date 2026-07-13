import type { AppCtx } from '../app'
import { content } from '../content'
import { allPoints, currentModule } from '../engine'
import type { Focus } from '../engine'
import { Gear, ChevronRight, BookIcon, TableIcon, SpeechIcon, X } from '../components/icons'

export function focusLabel(f: Focus): string {
  return [...(f.grammar ?? []), ...(f.modules ?? []), ...(f.tags ?? [])].join(', ')
}
export const focusActive = (f: Focus): boolean =>
  !!(f.grammar?.length || f.modules?.length || f.tags?.length)

function TrainerRow({ icon, title, sub, onClick }: { icon: any; title: string; sub: string; onClick: () => void }) {
  return (
    <button class="row" onClick={onClick}>
      <span style="width:40px;height:40px;flex:none;border-radius:var(--radius-md);border:1px solid var(--color-divider);display:grid;place-items:center;color:var(--color-accent)">{icon}</span>
      <span style="flex:1">
        <span style="display:block;font-family:var(--font-heading);font-size:19px;line-height:1.2">{title}</span>
        <span class="t55" style="display:block;font-size:12px;margin-top:2px">{sub}</span>
      </span>
      <ChevronRight size={18} style="color:var(--color-accent)" />
    </button>
  )
}

export function Home({ ctx }: { ctx: AppCtx }) {
  const { user, focus } = ctx
  const known = user.grammar.known.length
  const total = allPoints(content).length
  const curId = currentModule(user, content)
  const curTitle = content.modules.find(m => m.id === curId)?.title ?? ''
  const firstRun = known === 0

  return (
    <div class="screen">
      <div style="display:flex;align-items:baseline;justify-content:space-between;padding:24px 24px 16px">
        <div style="display:flex;align-items:baseline;gap:9px">
          <span style="font-family:var(--font-heading);font-size:28px;letter-spacing:-.01em">amigo</span>
          <span class="kicker" style="font-size:11px">A1 · A2</span>
        </div>
        <button class="btn btn-icon btn-secondary" onClick={() => ctx.go('settings')} aria-label="Einstellungen"><Gear size={19} /></button>
      </div>

      {firstRun ? (
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:20px;padding:24px 30px 40px;text-align:center">
          <div style="font-family:var(--font-heading);font-size:30px;line-height:1.18">¡Bienvenido!<br />Willkommen bei amigo.</div>
          <p class="t62" style="font-size:14px;line-height:1.6;margin:0">Noch nichts freigeschaltet — starte mit <i>Modul freischalten</i>, oder markiere Bekanntes unter <i>Einstellungen</i>.</p>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
            <button class="btn btn-primary btn-block" style="min-height:48px;font-size:14px" onClick={() => ctx.go('modules')}>Modul freischalten</button>
            <button class="btn btn-secondary btn-block" style="min-height:48px;font-size:14px" onClick={() => ctx.go('settings')}>Einstellungen öffnen</button>
          </div>
        </div>
      ) : (
        <>
          <div style="padding:0 24px;display:flex;flex-direction:column;gap:20px">
            <div style="border:1px solid var(--color-divider);border-radius:var(--radius-lg);padding:16px 18px;display:flex;flex-direction:column;gap:13px">
              <div>
                <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:7px">
                  <span class="t62" style="font-size:12.5px">Grammatik gelernt</span>
                  <span class="num" style="font-family:var(--font-heading);font-size:15px">{known} <span style="opacity:.4">/</span> {total}</span>
                </div>
                <div style="height:4px;border-radius:2px;background:var(--color-divider);overflow:hidden"><div style={`width:${total ? (known / total) * 100 : 0}%;height:100%;background:var(--color-accent)`} /></div>
              </div>
              <div style="height:1px;background:var(--color-divider)" />
              <div style="display:flex;flex-direction:column;gap:3px">
                <span class="kicker" style="color:color-mix(in srgb,var(--color-text) 48%,transparent)">Aktuelles Modul</span>
                <span style="font-family:var(--font-heading);font-size:16px;line-height:1.25">{curId} — {curTitle}</span>
              </div>
              {focusActive(focus) && (
                <div style="display:flex;align-items:center;gap:7px">
                  <span style="display:inline-flex;align-items:center;gap:7px;font-size:11.5px;padding:4px 6px 4px 11px;border-radius:999px;background:var(--color-accent-100);color:var(--color-accent-800);white-space:nowrap">
                    Fokus: {focusLabel(focus)}
                    <button class="iconbtn" onClick={ctx.dismissFocus} aria-label="Fokus entfernen" style="color:var(--color-accent-800);width:18px;height:18px;border-radius:50%"><X size={12} /></button>
                  </span>
                </div>
              )}
            </div>

            <div style="display:flex;flex-direction:column;gap:11px">
              <TrainerRow icon={<BookIcon size={21} />} title="Vokabeln" sub="Vokabelkarten · DE → ES" onClick={() => ctx.start('vokabeln')} />
              <TrainerRow icon={<TableIcon size={21} />} title="Verbformen" sub="Konjugations-Drill · alle Zeiten" onClick={() => ctx.start('verbformen')} />
              <TrainerRow icon={<SpeechIcon size={21} />} title="Sätze" sub="Generierte Satzübersetzung" onClick={() => ctx.start('saetze')} />
            </div>
          </div>

          <div style="margin-top:auto;padding:24px;display:flex;gap:9px;flex-wrap:wrap">
            <button class="btn btn-secondary" style="flex:1;min-height:40px" onClick={() => ctx.go('modules')}>Modul freischalten</button>
            <button class="btn btn-secondary" style="flex:1;min-height:40px" onClick={() => ctx.go('focus')}>Fokus</button>
          </div>
        </>
      )}
    </div>
  )
}
