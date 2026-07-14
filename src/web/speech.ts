// Web Speech API wrapper for spoken answers (Chrome/Android, iOS Safari).
// Recognition is network-backed in most browsers and needs a secure context
// (HTTPS or localhost) — typing stays as the fallback everywhere else.

const Ctor: any = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  : undefined

export const speechSupported: boolean = !!Ctor

// Chrome exposes the constructor on insecure origins too, but starting fails there —
// only offer the mic where it can actually work.
export const speechAvailable: boolean = speechSupported && typeof window !== 'undefined' && window.isSecureContext

// Errors after which restarting is pointless (denied permission, no mic, offline).
const FATAL = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network']

export interface SpeechHandlers {
  onText: (text: string, final: boolean) => void
  // fires when recognition ends on its own (silence, error) — NOT after abort;
  // fatal = don't restart (denied permission, no mic, offline)
  onEnd: (fatal: boolean) => void
}

// How long to wait after the last recognized speech before submitting. In
// continuous mode the API finalizes each chunk separately ("mucho", then
// "gusto"), so submitting on the first isFinal would cut a multi-word answer
// short. Instead we accumulate every segment and only submit once the speaker
// has paused — a touch longer while text is still forming (interim only).
const SILENCE_AFTER_FINAL_MS = 900
const SILENCE_INTERIM_MS = 1400

// Starts a recognition pass and returns an abort function (aborting skips onEnd).
export function startListening(lang: string, h: SpeechHandlers): () => void {
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = true
  rec.continuous = true
  rec.maxAlternatives = 1
  let aborted = false
  let fatal = false
  let pending = '' // the full accumulated transcript, not yet submitted
  let timer: ReturnType<typeof setTimeout> | null = null
  const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null } }
  const flush = () => { clearTimer(); if (!pending) return; const t = pending; pending = ''; h.onText(t, true) }

  rec.onresult = (ev: any) => {
    // Rebuild the whole utterance from every segment so far (multi-word answers
    // arrive as several chunks). Chrome sometimes finalizes a short segment
    // ("el") and then emits a longer one that restates it ("el chico") as a
    // separate result — blindly concatenating gives "elel chico". So merge a
    // segment that restates/extends the running text instead of appending it.
    let full = ''
    let hasFinal = false
    for (let i = 0; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) hasFinal = true
      const seg = ev.results[i][0].transcript.trim()
      if (!seg) continue
      if (!full) { full = seg; continue }
      const lf = full.toLowerCase()
      const ls = seg.toLowerCase()
      if (ls.startsWith(lf)) full = seg            // seg restates and extends full
      else if (!lf.endsWith(ls)) full += ' ' + seg // genuine continuation (else already included)
    }
    if (!full) return
    pending = full
    h.onText(full, false)
    // Restart the pause timer on every new token so the phrase finishes first.
    clearTimer()
    timer = setTimeout(flush, hasFinal ? SILENCE_AFTER_FINAL_MS : SILENCE_INTERIM_MS)
  }
  rec.onerror = (e: any) => { fatal ||= FATAL.includes(e?.error) }
  rec.onend = () => {
    clearTimer()
    if (aborted) return
    // Silence ended the pass before the pause timer fired — submit what we have
    // rather than dropping it, otherwise just signal end (restart / stop).
    if (pending) flush()
    else h.onEnd(fatal)
  }
  rec.start()
  return () => { aborted = true; clearTimer(); try { rec.abort() } catch { /* already stopped */ } }
}
