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

export function checkAnswer(input: string, accepted: string[], canonical: string): CheckResult {
  const n = normalize(input)
  return { correct: accepted.some(a => normalize(a) === n), canonical }
}
