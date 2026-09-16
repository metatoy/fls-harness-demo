/**
 * The session recap for one **sitting** at a cash / ring table (the Rail).
 *
 * A sitting starts when the seat is taken and ends when it is forfeited — standing up, or walking
 * away from a busted stack without buying back in. A refresh, a closed tab or a dead connection
 * does not end it: the table snapshot (`pip.table`, store/game) carries the sitting's own counters,
 * so resuming the same seat continues the same sitting and there is still exactly one recap at the
 * end of it. Rebuys are part of the sitting, which is why the net result counts every chip that
 * went in and not just the first buy-in.
 *
 * Two deliberate differences from the tournament recap (lib/recap):
 *
 * **It is persisted, once.** A tournament recap is shown at the moment the run ends and then it is
 * gone. A sitting can end with nobody watching — the tab died, the seat timed out — so the facts
 * are written to localStorage at forfeiture and the screen is delivered the next time the player
 * opens the app. It is still shown once and there is still no recap inbox: the delivery clears it.
 *
 * **It reports the sitting and nothing else.** Three figures, no sentences, no lifetime totals, no
 * hand history, no opponents. Anything that aggregates across sittings is a different feature and
 * belongs on /stats.
 *
 * Pure, apart from the two thin localStorage wrappers at the foot, so the arithmetic that tells a
 * player what a session cost them is testable without a browser.
 */

import type { Recap } from './recap'
import { formatChips } from './useMoney'

/** Everything the recap is allowed to know: one sitting, as it stood when the seat was forfeited. */
export interface Sitting {
  /** Where it was played, for the screen's subtitle. */
  venueName: string
  /** Hands dealt while the seat was held. Zero is a real answer. */
  hands: number
  /** The biggest pot the player won this sitting, in chips. 0 if they won none. */
  biggestPot: number
  /** The initial buy-in plus every rebuy and top-up taken during the sitting. */
  invested: number
  /** What the stack was worth in Roll chips at forfeiture (`cashOutValue`). */
  cashOut: number
}

/** Cash out minus everything put in, signed. Negative means the sitting cost chips. */
export const netResult = (s: Sitting): number => s.cashOut - s.invested

/**
 * The three figures, in the shape the tournament summary card already renders (`RunRecap`). No
 * lines: a sitting has no finish to narrate and a sentence about how you played belongs to the
 * run recap, which has the sample to say it honestly.
 */
export function buildSittingRecap(s: Sitting): Recap {
  return {
    stats: [
      { label: 'Hands', value: formatChips(s.hands) },
      { label: 'Biggest pot', value: formatChips(s.biggestPot) },
      { label: 'Net', value: signedChips(netResult(s)) },
    ],
    lines: [],
  }
}

/** "+1,200", "-50", "0" — the sign is carried by the text, never by colour alone. */
function signedChips(delta: number): string {
  if (delta === 0) return '0'
  return `${delta > 0 ? '+' : '-'}${formatChips(Math.abs(delta))}`
}

/**
 * Read a stored sitting back. Pure, and fail-closed: anything that is not a complete, finite
 * record is no recap at all, because a screen reporting `NaN` chips to a player is worse than a
 * screen they never see.
 */
export function parseSitting(raw: string | null): Sitting | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const s = value as Record<string, unknown>
  if (typeof s.venueName !== 'string') return null
  const numbers = ['hands', 'biggestPot', 'invested', 'cashOut'] as const
  if (!numbers.every((k) => typeof s[k] === 'number' && Number.isFinite(s[k]))) return null
  return {
    venueName: s.venueName,
    hands: s.hands as number,
    biggestPot: s.biggestPot as number,
    invested: s.invested as number,
    cashOut: s.cashOut as number,
  }
}

/** Where the pending recap waits for the player. One slot: the newest sitting is the one owed. */
const SITTING_KEY = 'pip.sitting'

/** Called at forfeiture, including when nobody is watching. */
export function saveSitting(s: Sitting): void {
  try {
    localStorage.setItem(SITTING_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable — the recap is not worth taking the stand-up down for */
  }
}

/** The recap owed to this player, if any. */
export function loadSitting(): Sitting | null {
  try {
    return parseSitting(localStorage.getItem(SITTING_KEY))
  } catch {
    return null
  }
}

/** Delivered. Cleared on dismissal rather than on read, so a tab closed mid-read still owes it. */
export function clearSitting(): void {
  try {
    localStorage.removeItem(SITTING_KEY)
  } catch {}
}
