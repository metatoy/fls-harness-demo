import { readFileSync } from 'node:fs'
import test from 'ava'
import { type DailyAttempt, dailyDrill, localDateKey, resolveDaily } from '@/lib/dailyDrill'

// Two load-bearing claims: one calendar date is one question for everybody, and a date with a
// record is read-only forever. The constraint enforcing the second is checked as text below.

const attempt = (local_date: string, answer = 'a'): DailyAttempt => ({
  local_date,
  answer,
  correct_answer: 'a',
})

test('a calendar date is one question, the same one for everybody', (t) => {
  const mine = dailyDrill('2026-09-16')
  t.deepEqual(mine, dailyDrill('2026-09-16'))
  t.not(dailyDrill('2026-09-17').seed, mine.seed, 'a different date is a different question')
})

test('the local date comes from the timezone the client sent, not from UTC', (t) => {
  // 22:30 UTC is already tomorrow in Auckland and still today in Los Angeles.
  const now = new Date('2026-09-16T22:30:00Z')
  t.is(localDateKey(now, 'Pacific/Auckland'), '2026-09-17')
  t.is(localDateKey(now, 'America/Los_Angeles'), '2026-09-16')
})

test('an unanswered date is answerable, with yesterday beside it and nothing older', (t) => {
  const view = resolveDaily('2026-09-16', [attempt('2026-09-15'), attempt('2026-09-10')])
  t.is(view.today.attempt, null, 'today is answerable')
  t.is(view.yesterday?.local_date, '2026-09-15', 'and the 10th is nowhere on the screen')
  t.is(resolveDaily('2026-09-16', [attempt('2026-09-16')]).yesterday, null, 'or today')
})

test('a date with a record is read-only, wherever the clock has been', (t) => {
  const records = [attempt('2026-09-16', 'b')]
  // A device with no local state shows the stored card; and a computed date moving backward onto
  // an answered date shows that record rather than a second chance at it.
  t.is(resolveDaily('2026-09-16', records).today.attempt?.answer, 'b')
  t.is(resolveDaily('2026-09-16', [...records, attempt('2026-09-17')]).today.attempt?.answer, 'b')
})

const sql = readFileSync(
  new URL('../supabase/migrations/20260916120000_daily_drill_attempts.sql', import.meta.url),
  'utf-8',
)

test('one row per user per local date, and the server resolves that date', (t) => {
  t.regex(sql, /primary key \(user_id, local_date\)/i)
  // A second submission resolves to the stored row rather than raising or overwriting.
  t.regex(sql, /on conflict \(user_id, local_date\) do nothing/i)
  t.regex(sql, /\(now\(\) at time zone p_time_zone\)::date/i)
})

test('a stored attempt can never be edited or deleted by the client', (t) => {
  const kinds = [...sql.matchAll(/^create policy\s+"[^"]+"[\s\S]*?for\s+(\w+)/gim)]
  t.deepEqual(
    kinds.map((m) => m[1]?.toLowerCase()).sort(),
    ['insert', 'select'],
    'select and insert, and nothing else',
  )
})
