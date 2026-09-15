/**
 * The weak spot — one named thing to practise, pulled from the player's own recent play.
 *
 * Reads finished sessions only, on the stats screen: it knows nothing about a hand in progress and
 * could not help inside one, which is the right side of the north star (brand/northstar.md) by
 * construction. Pure and deterministic — the same history always gives the same answer. Every
 * metric is written so that **higher is better**, so one rule ("how far below its target?") covers
 * all of them and the card always asks for more of something rather than less.
 */

import type { SeatStats } from './reads'

/** The window: the player's recent form. Before it, the baseline, read only to notice a decline. */
export const WINDOW = 10
export const BASELINE = 30
/** Below this many measurable sessions in the window there is nothing worth naming. */
export const MIN_SESSIONS = 5
/** How much better a challenger must score before the named metric changes. */
export const STICKINESS = 1.2
/** A point of decline against the player's own baseline, priced against a point below target. */
const DECLINE_WEIGHT = 1
/** Sessions worth keeping: one window plus its baseline. */
export const SESSION_LOG_CAP = WINDOW + BASELINE

export interface Metric {
  id: string
  /** The name the card says out loud, and what both its figures measure, in words. */
  name: string
  unit: string
  /** The rate this session, 0..1, or null when the session cannot measure it. */
  rate: (s: SeatStats) => number | null
  /** Authored, and fixed: a target that follows the player is a mirror, not a thing to aim at. And
   *  the corrective line under it says what to do differently, not how you did. */
  target: number
  action: string
  /** What a point below this target is worth next to a point below another one. */
  weight: number
}

const rateOf = (top: number, bottom: number): number | null => (bottom > 0 ? top / bottom : null)

/** The metrics, targets and corrective lines — all authored, none derived from the player. */
export const METRICS: Metric[] = [
  {
    id: 'aggression',
    name: 'Betting over calling',
    unit: 'share of your bets, raises and calls that were bets or raises',
    rate: (s) => rateOf(s.raises, s.raises + s.calls),
    target: 0.45,
    action: 'Pick one hand a session you would have called with, and raise it instead.',
    weight: 1.2,
  },
  {
    id: 'discipline',
    name: 'Folding before the flop',
    unit: 'share of hands you were dealt that you let go preflop',
    rate: (s) => rateOf(s.handsDealt - s.vpipHands, s.handsDealt),
    target: 0.6,
    action: 'Fold your weakest offsuit hands from the first two seats for a whole session.',
    weight: 1,
  },
  {
    id: 'stand-up',
    name: 'Standing up to a bet',
    unit: 'share of the bets you faced that you did not fold to',
    rate: (s) => rateOf(s.betsFaced - s.foldsToBet, s.betsFaced),
    target: 0.45,
    action: 'Before folding to a single bet, say out loud what hand you are folding to.',
    weight: 1,
  },
]

export type WeakSpotResult =
  | { state: 'insufficient'; sessions: number; needed: number }
  | { state: 'clear'; window: number }
  // `current` is the player's own value and `target` the authored one, both in whole percent.
  | { state: 'named'; metric: Metric; current: number; target: number; action: string }

/** A session counts towards the minimum when at least one metric can be read off it. */
const measurable = (s: SeatStats): boolean => METRICS.some((m) => m.rate(s) !== null)

/** A metric's mean rate across the sessions that could measure it, or null if none could. */
function mean(metric: Metric, sessions: SeatStats[]): number | null {
  const rates = sessions.map((s) => metric.rate(s)).filter((r): r is number => r !== null)
  if (rates.length === 0) return null
  return rates.reduce((a, b) => a + b, 0) / rates.length
}

/** `score` is the weighted distance below target plus the decline against the player's own
 *  baseline; `decline` is that second term alone, the tie-break, so a slide beats a flat line. */
interface Score {
  metric: Metric
  current: number
  score: number
  decline: number
}

/** Score every metric the window can measure, worst first. */
function scores(window: SeatStats[], baseline: SeatStats[]): Score[] {
  const out: Score[] = []
  for (const metric of METRICS) {
    const current = mean(metric, window)
    if (current === null) continue
    const before = mean(metric, baseline)
    const decline = before === null ? 0 : Math.max(0, before - current)
    const shortfall = Math.max(0, metric.target - current)
    out.push({
      metric,
      current,
      decline,
      score: metric.weight * shortfall + DECLINE_WEIGHT * decline,
    })
  }
  return out.sort((a, b) => b.score - a.score || b.decline - a.decline)
}

/**
 * Which metric the card names after one more session, given the one it named before. Stickiness,
 * both halves: the name changes only when a challenger scores `STICKINESS`× the incumbent, or when
 * the incumbent has climbed back above its own target. A card that reshuffled every night would be
 * a ranked list with one row showing, and nothing would be practised long enough to fix.
 */
function next(ranked: Score[], incumbentId: string | null): Score | null {
  const leader = ranked[0]
  if (!leader || leader.score <= 0) return null
  const held = ranked.find((s) => s.metric.id === incumbentId)
  if (!held || held.score <= 0) return leader
  if (held.current >= held.metric.target) return leader
  return leader.score >= STICKINESS * held.score ? leader : held
}

/**
 * The weak spot, replayed session by session over `sessions` (oldest first). Stickiness needs to
 * know what was named last time and the honest source is the history itself — re-derived rather
 * than remembered, so the store carries no field that can go stale, and "does one more session
 * change the card?" is a question a test asks by appending one session.
 */
export function weakSpot(sessions: SeatStats[]): WeakSpotResult {
  const recent = sessions.slice(-SESSION_LOG_CAP)
  const counted = recent.slice(-WINDOW).filter(measurable).length
  if (counted < MIN_SESSIONS)
    return { state: 'insufficient', sessions: counted, needed: MIN_SESSIONS }

  let named: Score | null = null
  for (let end = MIN_SESSIONS; end <= recent.length; end++) {
    const window = recent.slice(Math.max(0, end - WINDOW), end)
    if (window.filter(measurable).length < MIN_SESSIONS) continue
    const baseline = recent.slice(Math.max(0, end - WINDOW - BASELINE), Math.max(0, end - WINDOW))
    named = next(scores(window, baseline), named?.metric.id ?? null)
  }

  if (!named) return { state: 'clear', window: WINDOW }
  return {
    state: 'named',
    metric: named.metric,
    current: Math.round(named.current * 100),
    target: Math.round(named.metric.target * 100),
    action: named.metric.action,
  }
}
