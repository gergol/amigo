// Answer normalization & checking (Plan/00, 05): compare after stripping
// diacritics (incl. ñ→n), case, and punctuation. Feedback shows the real form.

export function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // á→a, ñ→n, ü→u
    .toLowerCase()
    .replace(/[¿?¡!.,;:'"„“”()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface CheckResult { correct: boolean; canonical: string }

const words = (s: string): string[] => normalize(s).split(' ').filter(Boolean)

// Same words, any order. Spanish word order is flexible (time adverbs, subject
// placement, …) and the generator only ever emits one ordering, so a multi-word
// answer that permutes an accepted one is treated as correct too.
function sameWords(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort(), sb = [...b].sort()
  return sa.every((w, i) => w === sb[i])
}

export function checkAnswer(input: string, accepted: string[], canonical: string): CheckResult {
  const n = normalize(input)
  const nw = words(input)
  const correct = accepted.some(a => {
    if (normalize(a) === n) return true
    return nw.length > 1 && sameWords(nw, words(a))
  })
  return { correct, canonical }
}
