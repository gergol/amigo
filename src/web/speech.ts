// Web Speech API wrapper for spoken answers (Chrome/Android, iOS Safari).
// Recognition is network-backed in most browsers and needs a secure context
// (HTTPS or localhost) — typing stays as the fallback everywhere else.

const Ctor: any = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  : undefined

export const speechSupported: boolean = !!Ctor

export interface SpeechHandlers {
  onText: (text: string, final: boolean) => void
  onEnd: () => void // fires on result, silence, error, or denied permission
}

// Starts one recognition pass and returns an abort function (aborting also fires onEnd).
export function startListening(lang: string, h: SpeechHandlers): () => void {
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = true
  rec.maxAlternatives = 1
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
  rec.onend = () => h.onEnd()
  rec.onerror = () => h.onEnd()
  rec.start()
  return () => { try { rec.abort() } catch { /* already stopped */ } }
}
