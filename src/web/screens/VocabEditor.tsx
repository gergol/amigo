import { useMemo, useState } from 'preact/hooks'
import type { AppCtx } from '../app'
import { content } from '../content'
import type { LexEntry } from '../engine'
import { displayForms, theme, isVocabKnown, knownVocabCount } from '../lexicon'
import { Header } from '../components/ui'
import { Search } from '../components/icons'

const THEME_ORDER = ['Menschen', 'Familie', 'Berufe', 'Orte', 'Nomen', 'Adjektive', 'Verben', 'Wendungen']

export function VocabEditor({ ctx }: { ctx: AppCtx }) {
  const { user } = ctx
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState('Alle')

  // precompute display forms + theme once
  const items = useMemo(
    () => content.lexicon.map(e => ({ e, ...displayForms(e), theme: theme(e) })),
    [],
  )
  const themes = useMemo(() => {
    const present = new Set(items.map(i => i.theme))
    return ['Alle', ...THEME_ORDER.filter(t => present.has(t))]
  }, [items])

  const q = query.toLowerCase().trim()
  const filtered = items.filter(i =>
    (sel === 'Alle' || i.theme === sel) &&
    (!q || i.de.toLowerCase().includes(q) || i.es.toLowerCase().includes(q)))

  const known = knownVocabCount(user, content.lexicon)

  return (
    <div class="screen" style="height:100vh;height:100dvh">
      <div style="padding:22px 24px 12px;border-bottom:1px solid var(--color-divider)">
        <Header title="Vokabeln, die ich kann" onBack={() => ctx.go('settings')}
          trailing={<span class="num" style="font-size:12.5px;color:var(--color-accent);white-space:nowrap">{known} bekannt</span>} />
        <p class="t55" style="font-size:12px;line-height:1.5;margin:10px 0 12px">Abgehakte Wörter gelten als bekannt und werden nicht mehr gedrillt. Filtere nach Thema oder suche gezielt.</p>
        <div style="position:relative;margin-bottom:11px">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:color-mix(in srgb,var(--color-text) 42%,transparent);display:grid"><Search size={16} /></span>
          <input class="input" value={query} placeholder="Suchen — deutsch oder spanisch …"
            style="min-height:42px;padding-left:36px" onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        </div>
        <div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:2px">
          {themes.map(t => (
            <button class="chip" aria-pressed={sel === t} onClick={() => setSel(t)} style="font-size:12px;padding:6px 13px">
              {t === 'Alle' ? 'Alle' : t}
            </button>
          ))}
        </div>
      </div>

      <div style="flex:1;overflow-y:auto;padding:6px 24px 10px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 2px 9px">
          <span class="kicker" style="color:color-mix(in srgb,var(--color-text) 48%,transparent)">{sel === 'Alle' ? 'Alle Themen' : sel} · {filtered.length}</span>
          <button class="btn btn-ghost" style="font-size:12px" onClick={() => ctx.markGroupKnown(filtered.map(i => i.e))}>Alle hier als bekannt</button>
        </div>
        <div style="display:flex;flex-direction:column;border-top:1px solid var(--color-divider)">
          {filtered.map(({ e, de, es, note }) => {
            const on = isVocabKnown(user, e as LexEntry)
            return (
              <button class="list-row" onClick={() => ctx.toggleVocabKnown(e as LexEntry)} style="padding:12px 2px">
                <span style={`width:22px;height:22px;flex:none;border-radius:var(--radius-sm);border:1.5px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'};background:${on ? 'var(--color-accent)' : 'transparent'};color:#fff;display:grid;place-items:center;font-size:13px`}>{on ? '✓' : ''}</span>
                <span style="flex:1;min-width:0">
                  <span style="display:block;font-size:14px;line-height:1.25">{de}</span>
                  {note && <span class="t45" style="display:block;font-size:11px;font-style:italic;margin-top:1px">{note}</span>}
                </span>
                <span class="answer" style="font-family:var(--font-heading);font-size:16px;text-align:right;white-space:nowrap">{es}</span>
              </button>
            )
          })}
        </div>
        {filtered.length === 0 && <p class="t45" style="text-align:center;font-size:13px;padding:30px 0">Keine Treffer.</p>}
      </div>
    </div>
  )
}
