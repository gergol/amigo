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

// Starts a recognition pass and returns an abort function (aborting skips onEnd).
export function startListening(lang: string, h: SpeechHandlers): () => void {
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = true
  rec.continuous = true
  rec.maxAlternatives = 1
  let aborted = false
  let fatal = false
  rec.onresult = (ev: any) => {
    let interim = ''
    let final = ''
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i]
      if (r.isFinal) final += r[0].transcript
      else interim += r[0].transcript
    }
    if (final) h.onText(final.trim(), true)
    else if (interim) h.onText(interim.trim(), false)
  }
  rec.onerror = (e: any) => { fatal ||= FATAL.includes(e?.error) }
  rec.onend = () => { if (!aborted) h.onEnd(fatal) }
  rec.start()
  return () => { aborted = true; try { rec.abort() } catch { /* already stopped */ } }
}
