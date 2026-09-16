'use client'

// The Daily Drill's record, server side. Both calls hand the server the browser's IANA timezone
// and let it resolve the date: a date the client picks is a date it can pick twice. Null means no
// account or no project in this build — an answer kept on one device is not a record.

import type { DailyAttempt } from './dailyDrill'
import { getSupabase } from './sync/client'

export async function fetchDailyAttempts(timeZone: string): Promise<DailyAttempt[] | null> {
  const sb = await getSupabase()
  if (!sb) return null
  const { data, error } = await sb.rpc('daily_drill_recent', { p_time_zone: timeZone })
  return error || !data ? null : data
}

/** Store today's answer, or get back the stored one: a second submission is not special-cased
 *  here — the constraint rejects the write and the row already there comes back. */
export async function submitDailyAttempt(
  timeZone: string,
  answer: string,
  correctAnswer: string,
): Promise<DailyAttempt | null> {
  const sb = await getSupabase()
  if (!sb) return null
  const { data, error } = await sb.rpc('daily_drill_submit', {
    p_time_zone: timeZone,
    p_answer: answer,
    p_correct_answer: correctAnswer,
  })
  return error || !data ? null : data
}
