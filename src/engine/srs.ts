import type { SrsState } from './types'

// SM-2-lite over the three human-editable fields in user.yaml (Plan/00):
// due (date), interval (days), ease (growth factor).

export const iso = (d: Date) => d.toISOString().slice(0, 10)

export function addDays(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

export const fresh = (today: string): SrsState => ({ due: today, interval: 0, ease: 2.5 })

// Plan/00: "known" = mature state, still resurfaces occasionally
export const mature = (today: string): SrsState => ({ due: addDays(today, 90), interval: 90, ease: 2.5 })

export function review(s: SrsState, correct: boolean, today: string): SrsState {
  if (!correct) return { due: today, interval: 1, ease: Math.max(1.3, s.ease - 0.2) }
  const interval = s.interval === 0 ? 1 : Math.max(s.interval + 1, Math.round(s.interval * s.ease))
  return { due: addDays(today, interval), interval, ease: Math.min(2.8, s.ease + 0.02) }
}

export const isDue = (s: SrsState | undefined, today: string): boolean => !s || s.due <= today

// Weight for exercise selection: due-and-overdue items first, unseen next, mature last.
export function weight(s: SrsState | undefined, today: string): number {
  if (!s) return 3
  if (s.due <= today) return 5
  return s.interval >= 30 ? 0.5 : 1
}
