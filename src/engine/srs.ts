import type { SrsState } from './types'

// SM-2-lite over the human-editable fields in user.yaml (Plan/00): due (date),
// interval (days), ease (growth factor), errors (lifetime wrong-answer count).

export const iso = (d: Date) => d.toISOString().slice(0, 10)

export function addDays(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000)

export const fresh = (today: string): SrsState => ({ due: today, interval: 0, ease: 2.5, errors: 0 })

export function review(s: SrsState, correct: boolean, today: string): SrsState {
  if (!correct) return { due: today, interval: 1, ease: Math.max(1.3, s.ease - 0.2), errors: (s.errors ?? 0) + 1 }
  // correct before due (same-day repeats, sentence rewards): the schedule stays put —
  // otherwise items reviewed many times a day compound their interval absurdly
  if (s.due > today) return { ...s, errors: s.errors ?? 0 }
  const interval = s.interval === 0 ? 1 : Math.max(s.interval + 1, Math.round(s.interval * s.ease))
  return { due: addDays(today, interval), interval, ease: Math.min(2.8, s.ease + 0.02), errors: s.errors ?? 0 }
}

export const isDue = (s: SrsState | undefined, today: string): boolean => !s || s.due <= today

// Weight for exercise selection: smooth readiness instead of a due-day cliff.
// Probability rises quadratically as an item moves through its interval (just
// reviewed 0.2 → due 5), then overdue days and errors boost it further — so on
// heavy practice days the items closest to forgetting surface next. Unseen items
// sit at 1.5: ahead of freshly-reviewed, behind anything near-due.
export function weight(s: SrsState | undefined, today: string): number {
  if (!s) return 1.5
  const over = daysBetween(s.due, today) // positive = overdue
  if (s.interval <= 0 || over >= 0)
    return 5 + Math.min(Math.max(over, 0), 14) * 0.5 + Math.min(s.errors ?? 0, 5)
  const r = Math.max(0, 1 + over / s.interval) // 0 = just reviewed … 1 = due
  return 0.2 + 4.8 * r * r
}

// The 0–100 score shown and edited in the vocab list: a log-scaled view of the
// interval (0 = drill now … 100 = rest for 90 days). Editing it edits the schedule.
const MAX_INTERVAL = 90

export const score = (s: SrsState | undefined): number =>
  s ? Math.min(100, Math.round((100 * Math.log1p(s.interval)) / Math.log1p(MAX_INTERVAL))) : 0

export function setScore(s: SrsState, pct: number, today: string): SrsState {
  const p = Math.min(100, Math.max(0, pct))
  const interval = Math.round(Math.expm1((p / 100) * Math.log1p(MAX_INTERVAL)))
  return { ...s, interval, due: addDays(today, interval) }
}
