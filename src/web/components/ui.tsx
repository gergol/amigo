import { ChevronLeft } from './icons'

// Screen header with a back button + title, and an optional trailing node.
export function Header({ title, onBack, trailing }: { title: string; onBack: () => void; trailing?: any }) {
  return (
    <div style="display:flex;align-items:center;gap:12px;padding:22px 24px 12px;border-bottom:1px solid var(--color-divider)">
      <button class="iconbtn" onClick={onBack} aria-label="Zurück" style="width:26px;height:26px">
        <ChevronLeft size={20} />
      </button>
      <span style="font-family:var(--font-heading);font-size:20px;line-height:1.2;flex:1">{title}</span>
      {trailing}
    </div>
  )
}

// 8-segment session progress bar.
export function ProgressSegments({ filled }: { filled: number }) {
  return (
    <div style="flex:1;display:flex;gap:4px">
      {Array.from({ length: 8 }, (_, i) => (
        <span style={`flex:1;height:3px;border-radius:2px;background:${i < filled ? 'var(--color-accent)' : 'var(--color-divider)'}`} />
      ))}
    </div>
  )
}

// A 22px check/mark square with three visual states.
export function MarkSquare({ mark, state }: { mark: string; state: 'on' | 'partial' | 'off' }) {
  const border = state === 'off' ? 'var(--color-divider)' : 'var(--color-accent)'
  const bg = state === 'on' ? 'var(--color-accent)' : 'transparent'
  const fg = state === 'on' ? '#fff' : 'var(--color-accent)'
  return (
    <span style={`width:22px;height:22px;flex:none;border-radius:var(--radius-sm);border:1.5px solid ${border};background:${bg};color:${fg};display:grid;place-items:center;font-family:var(--font-heading);font-size:13px`}>
      {mark}
    </span>
  )
}

// The á é í … helper row above the keyboard.
const ACCENT_KEYS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡']
export function AccentKeys({ onInsert }: { onInsert: (ch: string) => void }) {
  return (
    <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
      {ACCENT_KEYS.map(ch => (
        <button class="akey" type="button" onClick={() => onInsert(ch)} tabIndex={-1}>{ch}</button>
      ))}
    </div>
  )
}
