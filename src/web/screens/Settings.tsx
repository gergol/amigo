import { useState } from 'preact/hooks'
import type { AppCtx } from '../app'
import { content } from '../content'
import { isKnown } from '../engine'
import { vocabCount } from '../lexicon'
import { exportYaml, importYaml } from '../store'
import { speechSupported } from '../speech'
import { Header, MarkSquare } from '../components/ui'
import { ChevronRight, CheckList } from '../components/icons'

export function Settings({ ctx }: { ctx: AppCtx }) {
  const { user } = ctx
  const [exportOpen, setExportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)

  const reverse = Math.round(user.settings.reverseVerbShare * 100)
  const fontPct = Math.round((user.settings.fontScale ?? 1) * 100)
  const vocabIn = vocabCount(user, content.lexicon)

  return (
    <div class="screen">
      <Header title="Einstellungen" onBack={() => ctx.go('home')} />

      <div style="flex:1;overflow-y:auto;padding:20px 24px 30px;display:flex;flex-direction:column;gap:24px">
        {/* knowledge editor */}
        <div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">
            <span style="font-family:var(--font-heading);font-size:17px">Was ich schon kann</span>
            <button class="btn btn-ghost" style="font-size:12px" onClick={ctx.knowAllA1}>Ich kann ganz A1</button>
          </div>
          <p class="t55" style="font-size:12px;line-height:1.5;margin:0 0 12px">Abgehakt = bekannt (freigeschaltet ohne Drill). Voraussetzungen werden automatisch mitgezogen.</p>
          <div style="display:flex;flex-direction:column;border-top:1px solid var(--color-divider)">
            {content.modules.map(m => {
              const total = m.points.length
              const got = m.points.filter(p => isKnown(user, p.id)).length
              const state = got === total ? 'on' : got > 0 ? 'partial' : 'off'
              const mark = got === total ? '✓' : got > 0 ? '~' : ''
              return (
                <button class="list-row" onClick={() => ctx.openDetail(m.id)}>
                  <MarkSquare mark={mark} state={state} />
                  <span class="num" style="font-family:var(--font-heading);font-size:12.5px;color:var(--color-accent);width:32px;flex:none">{m.id}</span>
                  <span style="flex:1;font-size:13px;line-height:1.3">{m.title}</span>
                  <span class="num t45" style="font-size:12px">{got}/{total}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* vocab i know */}
        <button class="row" onClick={() => ctx.go('vocab')}>
          <span style="width:40px;height:40px;flex:none;border-radius:var(--radius-md);border:1px solid var(--color-divider);display:grid;place-items:center;color:var(--color-accent)"><CheckList size={21} /></span>
          <span style="flex:1">
            <span style="display:block;font-family:var(--font-heading);font-size:17px;line-height:1.2">Mein Wortschatz</span>
            <span class="t55" style="display:block;font-size:12px;margin-top:2px">Wörter in die Wiederholung aufnehmen, Score ansehen & anpassen</span>
          </span>
          <span class="num t45" style="font-size:12.5px;white-space:nowrap">{vocabIn} / {content.lexicon.length}</span>
          <ChevronRight size={18} style="color:var(--color-accent)" />
        </button>

        {/* reverse slider */}
        <div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:9px">
            <span style="font-family:var(--font-heading);font-size:15px">Anteil Verb-Drills Spanisch → Deutsch</span>
            <span class="num" style="font-family:var(--font-heading);font-size:15px;color:var(--color-accent)">{reverse}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={reverse} style="width:100%"
            onInput={(e) => ctx.setSettings({ reverseVerbShare: +(e.target as HTMLInputElement).value / 100 })} />
        </div>

        {/* font scale */}
        <div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:9px">
            <span style="font-family:var(--font-heading);font-size:15px">Schriftgröße</span>
            <span class="num" style="font-family:var(--font-heading);font-size:15px;color:var(--color-accent)">{fontPct}%</span>
          </div>
          <input type="range" min={100} max={160} step={5} value={fontPct} style="width:100%"
            onInput={(e) => ctx.setSettings({ fontScale: +(e.target as HTMLInputElement).value / 100 })} />
        </div>

        {/* auto advance */}
        <div>
          <span style="font-family:var(--font-heading);font-size:15px">Automatisch weiter</span>
          <p class="t55" style="font-size:12px;line-height:1.5;margin:4px 0 12px">Nach dem Aufdecken geht es von selbst zur nächsten Frage — ein Tipp irgendwo auf den Bildschirm stoppt den Timer. 0 = aus.</p>
          {([['nach richtiger Antwort', 'autoNextCorrect'], ['nach falscher Antwort', 'autoNextWrong']] as const).map(([label, key]) => (
            <div style="margin-bottom:10px">
              <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:13px">{label}</span>
                <span class="num" style="font-family:var(--font-heading);font-size:14px;color:var(--color-accent)">{user.settings[key] > 0 ? `${user.settings[key].toFixed(1).replace('.', ',')} s` : 'aus'}</span>
              </div>
              <input type="range" min={0} max={5} step={0.5} value={user.settings[key]} style="width:100%"
                onInput={(e) => ctx.setSettings({ [key]: +(e.target as HTMLInputElement).value })} />
            </div>
          ))}
        </div>

        {/* lernstand */}
        <div>
          <span style="font-family:var(--font-heading);font-size:15px">Lernstand</span>
          <p class="t55" style="font-size:12px;line-height:1.5;margin:4px 0 12px">Alles liegt in einer menschenlesbaren <span class="answer" style="font-family:var(--font-heading)">user.yaml</span> — direkt editier- und versionierbar.</p>
          <div style="display:flex;gap:9px">
            <button class="btn btn-secondary" style="flex:1;min-height:40px" onClick={() => setExportOpen(v => !v)}>{exportOpen ? 'Ausblenden' : 'Exportieren'}</button>
            <button class="btn btn-secondary" style="flex:1;min-height:40px" onClick={() => setImporting(v => !v)}>Importieren</button>
          </div>
          {exportOpen && (
            <pre style="margin:12px 0 0;padding:14px;background:var(--color-neutral-900);color:var(--color-neutral-200);border-radius:var(--radius-md);font-size:11.5px;line-height:1.55;overflow-x:auto;white-space:pre">{exportYaml(user)}</pre>
          )}
          {importing && (
            <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
              <textarea class="input" style="min-height:120px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px" placeholder="user.yaml hier einfügen …"
                value={importText} onInput={(e) => setImportText((e.target as HTMLTextAreaElement).value)} />
              <button class="btn btn-primary" style="min-height:40px" disabled={!importText.trim()}
                onClick={() => { try { ctx.setUser(importYaml(importText)); setImporting(false); setImportText('') } catch { /* ignore bad yaml */ } }}>
                Übernehmen
              </button>
            </div>
          )}
        </div>

        {/* build + capability info */}
        <p class="t45" style="font-size:11.5px;line-height:1.6;text-align:center;margin:0">
          Build <span class="mono" style="font-size:11px">{__COMMIT__}</span>
          <br />
          Spracheingabe: {!speechSupported
            ? 'von diesem Browser nicht unterstützt (Chrome/Android oder iOS Safari nötig)'
            : !window.isSecureContext
              ? 'braucht HTTPS oder localhost'
              : 'verfügbar — Mikrofon-Knopf neben dem Eingabefeld beim Üben'}
        </p>
      </div>
    </div>
  )
}
