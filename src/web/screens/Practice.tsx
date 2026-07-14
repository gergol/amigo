import { useEffect, useRef, useState } from 'preact/hooks'
import type { AppCtx } from '../app'
import { SESSION } from '../session'
import type { CardVM } from '../session'
import { speechAvailable, startListening } from '../speech'
import { ProgressSegments, AccentKeys } from '../components/ui'
import { X, Mic } from '../components/icons'

const pad = (n: number) => (n < 10 ? '0' + n : '' + n)

function Prompt({ card }: { card: CardVM }) {
  if (card.kind === 'sentence') return (
    <>
      <span class="kicker">Übersetze</span>
      <div style="font-family:var(--font-heading);font-size:33px;line-height:1.16">{card.prompt}</div>
    </>
  )
  if (card.kind === 'vocab') return (
    <>
      <div style="font-family:var(--font-heading);font-size:40px;line-height:1.12">{card.prompt}</div>
      {card.promptHint && <span class="t45" style="font-size:11.5px;font-style:italic">{card.promptHint}</span>}
    </>
  )
  if (card.kind === 'verb') return (
    <>
      <span class="t55" style="font-size:12px">Konjugiere auf Spanisch</span>
      <div style="font-family:var(--font-heading);font-size:36px;line-height:1.12">{card.prompt}</div>
    </>
  )
  if (card.kind === 'verbrev') return (
    <>
      <div class="answer" style="font-family:var(--font-heading);font-size:40px;line-height:1.12">{card.prompt}</div>
      <span class="t55" style="font-size:12px">(auf Deutsch)</span>
    </>
  )
  // gender
  return (
    <>
      <span style="font-family:var(--font-heading);font-size:15px;color:color-mix(in srgb,var(--color-accent) 65%,transparent)">el · la</span>
      <div style="font-family:var(--font-heading);font-size:32px;line-height:1.14">{card.prompt}</div>
    </>
  )
}

function Feedback({ ctx, card }: { ctx: AppCtx; card: CardVM }) {
  const s = ctx.session!
  if (s.lastCorrect) return (
    <>
      <div style="width:46px;height:46px;border-radius:50%;border:1.5px solid var(--color-accent);color:var(--color-accent);display:grid;place-items:center;font-size:23px">✓</div>
      <div class="t45" style="font-size:12px">{card.prompt}</div>
      <div class="answer" style="font-family:var(--font-heading);font-size:29px;line-height:1.18">{card.canonical}</div>
      {s.lastAccent && <div class="t55" style="font-size:12px">Achte auf die Akzente: <span class="answer">{card.canonical}</span></div>}
      {card.note && (
        <>
          <button class="btn btn-ghost" style="font-size:13px" onClick={ctx.toggleWhy}><span style="font-size:15px">›</span> warum?</button>
          {s.whyOpen && <div class="note">{card.note}</div>}
        </>
      )}
    </>
  )
  return (
    <>
      <div style="width:46px;height:46px;border-radius:50%;border:1.5px solid var(--color-wrong);color:var(--color-wrong);display:grid;place-items:center;font-size:23px">✗</div>
      <div style="font-size:13px;color:var(--color-wrong)">deine Antwort: <span style="text-decoration:line-through;opacity:.75">{s.lastYour || '—'}</span></div>
      <div class="kicker" style="color:color-mix(in srgb,var(--color-text) 45%,transparent);margin-top:2px">richtig</div>
      <div class="answer" style="font-family:var(--font-heading);font-size:27px;line-height:1.2">{card.canonical}</div>
      {card.note && <div class="note" style="margin-top:6px">{card.note}</div>}
      <button class="btn btn-secondary btn-block" style="min-height:46px;margin-top:10px;font-size:15px;gap:7px;color:var(--color-accent);border-color:var(--color-accent)" onClick={ctx.overrideCorrect}>
        <span style="font-size:18px">✓</span> Ich hatte recht — als korrekt werten
      </button>
    </>
  )
}

export function Practice({ ctx }: { ctx: AppCtx }) {
  const s = ctx.session

  // Persistent voice mode: once tapped on, the mic listens through every question
  // until tapped off. Recognition restarts after silence; hard failures (denied
  // permission, no mic, offline) switch the mode off. Language follows the card
  // (verbrev asks for German), the final transcript is checked immediately.
  const [micOn, setMicOn] = useState(false)
  const [micTick, setMicTick] = useState(0) // bump → restart recognition
  useEffect(() => {
    const card = s?.card
    if (!micOn || !card || card.input !== 'text' || s.revealed) return
    return startListening(card.kind === 'verbrev' ? 'de-DE' : 'es-ES', {
      onText: (text, final) => {
        ctx.setInput(text)
        if (final) ctx.submitAnswer(text)
      },
      onEnd: (fatal) => (fatal ? setMicOn(false) : setMicTick(t => t + 1)),
    })
  }, [micOn, micTick, s?.index, s?.revealed])

  // Auto-focus (= soft keyboard on phones) only in typing flow: with the mic on,
  // the keyboard stays hidden until the field is tapped explicitly.
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (s && !s.revealed && s.card?.input === 'text' && !micOn) inputRef.current?.focus()
  }, [s?.index, s?.revealed, s?.card?.input])

  // Auto-advance after the reveal (correct/wrong each have their own delay, 0 = off).
  // Any tap on the screen stops the timer; the Weiter button shows it as a filling bar.
  const [autoStop, setAutoStop] = useState(false)
  useEffect(() => setAutoStop(false), [s?.index])
  const autoDur = s?.revealed && s.card
    ? (s.lastCorrect ? ctx.user.settings.autoNextCorrect : ctx.user.settings.autoNextWrong)
    : 0
  useEffect(() => {
    if (!autoDur || autoStop) return
    const id = setTimeout(ctx.next, autoDur * 1000)
    return () => clearTimeout(id)
  }, [s?.index, s?.revealed, autoStop, autoDur])

  // Physical-keyboard shortcuts (desktop): 1/2 answer el/la, Enter advances the
  // reveal. Harmless on phones (no keyboard); text submit stays on the input.
  useEffect(() => {
    if (!s?.card) return
    const onKey = (e: KeyboardEvent) => {
      if (s.revealed) {
        if (e.key === 'Enter') { e.preventDefault(); ctx.next() }
      } else if (s.card!.input === 'buttons') {
        if (e.key === '1') { e.preventDefault(); ctx.submitAnswer('el') }
        else if (e.key === '2') { e.preventDefault(); ctx.submitAnswer('la') }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s?.index, s?.revealed, s?.card?.input])

  if (!s) return null
  const card = s.card
  const filled = s.index + (s.revealed ? 1 : 0)

  return (
    <div class="screen" style="padding:18px 24px 24px" onClick={() => { if (s.revealed) setAutoStop(true) }}>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <button class="iconbtn" onClick={ctx.exitSession} aria-label="Beenden" style="width:26px;height:26px;color:color-mix(in srgb,var(--color-text) 55%,transparent)"><X size={18} /></button>
        <ProgressSegments filled={filled} />
      </div>

      {!card ? (
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;padding:24px">
          <p class="t55" style="font-size:14px;line-height:1.5">Keine passenden Übungen — erst ein Modul freischalten oder den Fokus lockern.</p>
          <button class="btn btn-primary" style="min-height:44px" onClick={ctx.exitSession}>Zur Übersicht</button>
        </div>
      ) : (
        <>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <span class="num t45" style="font-family:var(--font-heading);font-size:14px">{pad(s.index + 1)} / {pad(SESSION)}</span>
            <span class="tag tag-outline">{card.tag}</span>
          </div>

          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;padding:24px 4px">
            {s.revealed ? <Feedback ctx={ctx} card={card} /> : <Prompt card={card} />}
          </div>

          {!s.revealed ? (
            card.input === 'buttons' ? (
              <div style="display:flex;gap:10px">
                <button class="btn btn-secondary" style="flex:1;font-size:19px;min-height:54px;font-family:var(--font-heading)" onClick={() => ctx.submitAnswer('el')}>el<span class="kbd">1</span></button>
                <button class="btn btn-secondary" style="flex:1;font-size:19px;min-height:54px;font-family:var(--font-heading)" onClick={() => ctx.submitAnswer('la')}>la<span class="kbd">2</span></button>
              </div>
            ) : (
              <div style="display:flex;flex-direction:column;gap:14px">
                <div style="display:flex;gap:9px;align-items:stretch">
                  <input
                    ref={inputRef} class="input" value={s.input}
                    placeholder={micOn ? '… ich höre zu' : card.placeholder}
                    autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck={false}
                    style="flex:1;text-align:center;min-height:46px;font-size:16px"
                    onInput={(e) => ctx.setInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ctx.submitAnswer(s.input) } }}
                  />
                  {speechAvailable && (
                    <button class="btn" type="button" onClick={() => setMicOn(on => !on)}
                      aria-label={micOn ? 'Mikrofon ausschalten' : 'Mit Mikrofon antworten'} aria-pressed={micOn}
                      style={`flex:none;width:46px;min-height:46px;border-radius:var(--radius-md);display:grid;place-items:center;border:1.5px solid var(--color-accent);color:${micOn ? '#fff' : 'var(--color-accent)'};background:${micOn ? 'var(--color-accent)' : 'transparent'}`}>
                      <Mic size={20} />
                    </button>
                  )}
                </div>
                <AccentKeys onInsert={ctx.insertChar} />
                <button class="btn btn-primary btn-block" style="min-height:48px" onClick={() => ctx.submitAnswer(s.input)}>Prüfen<span class="kbd">↵</span></button>
              </div>
            )
          ) : (
            <button class="btn btn-primary btn-block" style="min-height:48px;position:relative;overflow:hidden" onClick={ctx.next}>
              {autoDur > 0 && !autoStop && (
                <span style={`position:absolute;inset:0;transform-origin:left;background:color-mix(in srgb,var(--color-accent) 22%,transparent);animation:autofill ${autoDur}s linear forwards`} />
              )}
              <span style="position:relative">{s.index >= SESSION - 1 ? 'Ergebnis' : 'Weiter'}<span class="kbd">↵</span></span>
            </button>
          )}
        </>
      )}
    </div>
  )
}
