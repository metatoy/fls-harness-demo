import test from 'ava'
import type { SeatStats } from '@/lib/reads'
import { MIN_SESSIONS, weakSpot } from '@/lib/weakSpot'

/** One run's hero tendencies, written as the rates the metrics read off it rather than counters. */
const session = (
  parts: { aggression?: number; discipline?: number; stand?: number } = {},
): SeatStats => {
  const { aggression = 0.5, discipline = 0.7, stand = 0.6 } = parts
  return {
    handsDealt: 100,
    vpipHands: Math.round(100 * (1 - discipline)),
    raises: Math.round(100 * aggression),
    calls: 100 - Math.round(100 * aggression),
    betsFaced: 100,
    foldsToBet: Math.round(100 * (1 - stand)),
    showdowns: 10,
  }
}

const many = (n: number, parts: Parameters<typeof session>[0]) =>
  Array.from({ length: n }, () => session(parts))

/** The named metric, or the state that says none was named. */
const named = (sessions: SeatStats[]): string => {
  const r = weakSpot(sessions)
  return r.state === 'named' ? r.metric.id : r.state
}

test('fewer than five sessions in the window names nothing', (t) => {
  // Acceptance 5. Four runs is noise, and a weakness named off noise is a week of wrong practice.
  for (let n = 0; n < MIN_SESSIONS; n++) {
    const result = weakSpot(many(n, { aggression: 0.1 }))
    t.is(result.state, 'insufficient', `${n} sessions is not enough`)
    if (result.state === 'insufficient') t.is(result.needed, MIN_SESSIONS)
  }
  t.is(named(many(MIN_SESSIONS, { aggression: 0.1 })), 'aggression')
})

test('the worst metric against its target is the one named, and it carries value and action', (t) => {
  // Acceptance 1 and 2: one metric, the player's own current value, and something to do.
  const result = weakSpot(many(10, { aggression: 0.1, discipline: 0.9, stand: 0.9 }))
  t.is(result.state, 'named')
  if (result.state !== 'named') return
  t.is(result.metric.id, 'aggression')
  t.is(result.current, 10)
  t.is(result.target, Math.round(result.metric.target * 100))
  t.is(result.action, result.metric.action)
})

test('a metric that has always been this bad is still eligible to be named', (t) => {
  // Acceptance 3. Forty identical sessions: window equals baseline, so the decline term is zero
  // and only the distance below target is left. A score built on decline alone would name nothing
  // here — for the player who most needs telling.
  const result = weakSpot(many(40, { aggression: 0.15, discipline: 0.9, stand: 0.9 }))
  t.is(result.state === 'named' && result.metric.id, 'aggression')
  t.is(result.state === 'named' && result.current, 15)
})

test('one session that reorders the scores by less than 1.2x does not rename the weakness', (t) => {
  // Acceptance 4. Ten flat sessions make betting-over-calling the incumbent (0.10 below target at
  // weight 1.2 = 0.12, against 0.10 for standing up to a bet). Then one bad night at the wrong end
  // of a bet puts standing up ahead on 0.13 — 1.08x, short of the bar — and the card must hold.
  const settled = many(10, { aggression: 0.35, discipline: 0.9, stand: 0.35 })
  t.is(named(settled), 'aggression')

  const after = weakSpot([...settled, session({ aggression: 0.35, discipline: 0.9, stand: 0.2 })])
  t.is(after.state === 'named' && after.metric.id, 'aggression', 'the incumbent holds')
  t.is(after.state === 'named' && after.current, 35, 'and still reports the player’s own value')
})

test('a challenger that clears 1.2x takes the card', (t) => {
  // Sticky is not stuck: a collapse big enough to clear the bar moves the card.
  const settled = many(10, { aggression: 0.3, discipline: 0.9, stand: 0.9 })
  t.is(
    named([...settled, ...many(10, { aggression: 0.3, discipline: 0.9, stand: 0.05 })]),
    'stand-up',
  )
})

test('an incumbent that climbs above its target gives the card up', (t) => {
  const settled = many(10, { aggression: 0.1, discipline: 0.55, stand: 0.9 })
  t.is(named(settled), 'aggression')
  // Below 1.2x, but the incumbent is fixed and discipline is the only thing still short.
  t.is(
    named([...settled, ...many(10, { aggression: 0.9, discipline: 0.55, stand: 0.9 })]),
    'discipline',
  )
})

test('nothing below target and nothing declining names no weakness', (t) => {
  // Not a praise card: naming a "weakest" metric that is above its target invents a fault.
  t.is(named(many(10, { aggression: 0.95, discipline: 0.95, stand: 0.95 })), 'clear')
})

test('the window is the last ten sessions, and older play is only the baseline', (t) => {
  const result = weakSpot([...many(30, { aggression: 0.05 }), ...many(10, { aggression: 0.4 })])
  t.is(result.state === 'named' && result.current, 40)
})

test('a session with nothing to measure is skipped rather than counted as zero', (t) => {
  // A run that ended in two hands has no fold-to-bet rate; counting it as 0% would invent a
  // weakness out of a short night.
  const empty = { ...session(), handsDealt: 0, raises: 0, calls: 0, betsFaced: 0, foldsToBet: 0 }
  t.is(named([...many(4, { aggression: 0.1 }), empty]), 'insufficient')
})
