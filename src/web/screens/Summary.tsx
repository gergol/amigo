import type { AppCtx } from '../app'
import { SESSION } from '../session'

export function Summary({ ctx }: { ctx: AppCtx }) {
  const s = ctx.session
  if (!s) return null
  const correct = s.results.filter(r => r.correct).length
  const review = s.results.filter(r => !r.correct)

  return (
    <div class="screen" style="padding:24px 26px 26px">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px">
        <span class="kicker">Sitzung beendet</span>
        <div class="num" style="font-family:var(--font-heading);font-size:64px;line-height:1">
          {correct}<span style="font-size:34px;color:color-mix(in srgb,var(--color-text) 40%,transparent)"> / {SESSION}</span>
        </div>
        <div class="t62" style="font-size:14px">{correct} von {SESSION} richtig</div>

        <div style="width:100%;text-align:left;margin-top:22px">
          {review.length > 0 ? (
            <>
              <span class="kicker" style="color:color-mix(in srgb,var(--color-text) 48%,transparent)">Nochmal ansehen</span>
              <div style="display:flex;flex-direction:column;margin-top:8px;border-top:1px solid var(--color-divider)">
                {review.map(r => (
                  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--color-divider)">
                    <span style="font-size:13.5px;color:color-mix(in srgb,var(--color-text) 70%,transparent)">{r.de}</span>
                    <span class="answer" style="font-family:var(--font-heading);font-size:15px;text-align:right">{r.es}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div class="answer" style="text-align:center;font-family:var(--font-heading);font-size:22px">¡Perfecto! Alles richtig.</div>
          )}
        </div>
      </div>

      <div class="t45" style="font-size:11.5px;line-height:1.5;text-align:center;margin:18px 0 16px">
        Richtige Sätze schreiben auch ihren Wörtern und Verben Fortschritt gut.
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary btn-block" style="min-height:48px" onClick={() => ctx.start(s.trainer)}>Nochmal üben</button>
        <button class="btn btn-secondary btn-block" style="min-height:46px" onClick={() => ctx.go('home')}>Zur Übersicht</button>
      </div>
    </div>
  )
}
