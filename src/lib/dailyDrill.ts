// The Daily Drill — one shared question a day. Pure, like lib/daily.ts next to it: a date in, a
// question out, so everyone opening the app on the same local date sees the same spot. What a
// player answered is a row in the database instead (see the migration), whose constraint — never
// UI state — rejects the second submission.

import { dailySeed } from './daily'
import { nextDrill } from './drills'
import type { Drill } from './drills/types'

/** One stored attempt. `local_date` is resolved by the server. */
export interface DailyAttempt {
  local_date: string
  answer: string
  correct_answer: string
}

export interface DailyView {
  today: { dateKey: string; drill: Drill; attempt: DailyAttempt | null }
  yesterday: DailyAttempt | null
}

/** The calendar date in a timezone; `en-CA` formats exactly `YYYY-MM-DD`. */
export const localDateKey = (now: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)

export function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}

/** The question for a date: same date, same spot, everywhere, forever. `which-hand-wins` because
 *  it is free forever, and a shared question half the players cannot open is not a shared one. */
export const dailyDrill = (dateKey: string): Drill =>
  nextDrill('which-hand-wins', dailySeed(`daily-drill:${dateKey}`))

/**
 * Today's card and yesterday's record — nothing older, there is no archive. The read-only
 * invariant falls out of reading the record rather than UI state: a date that has one renders it,
 * so a clock moving backward onto an answered date shows that card, not a second chance at it.
 */
export function resolveDaily(dateKey: string, attempts: DailyAttempt[]): DailyView {
  const at = (key: string) => attempts.find((a) => a.local_date === key) ?? null
  return {
    today: { dateKey, drill: dailyDrill(dateKey), attempt: at(dateKey) },
    yesterday: at(previousDateKey(dateKey)),
  }
}
