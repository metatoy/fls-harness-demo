/**
 * Live opponent reads — one phrase per bot seat, guessing at its holding from the way it has
 * played THIS hand.
 *
 * Where this sits against the north star: the read is built from the two things everyone at the
 * table can already see — the betting and the board. It never touches a hole card; `observe()` is
 * not given one and `label()` cannot reach one. So it hands the player no information the table
 * does not have, only the arithmetic done out loud, and a player can tell because the phrase moves
 * with the action and nothing else: replay the same betting with different cards behind it and the
 * phrase is identical (`tests/liveRead.test.ts`).
 *
 * The vocabulary is fixed and short on purpose. No percentages and no equity — a number would read
 * as a claim to precision this has no right to.
 */

import type { Card } from './poker/cards'
import type { ActionType, Street } from './poker/engine'

/** Every phrase a seat can say. Fixed, ≤ 20 characters, one line. */
export type ReadLabel = 'probably a pair' | 'probably a draw' | 'probably air' | 'unclear'

/**
 * What one seat has done this hand, boiled down to the shape of it. Streets are lists rather than
 * counts so a street counts once however many times the seat acts on it, and so a check-then-raise
 * lands where it belongs: the seat took the lead, and the check before it is not a passive street.
 */
export interface ReadSignal {
  /** Postflop streets on which the seat bet or raised. */
  aggressive: Street[]
  /** Postflop streets on which the seat only checked or called. */
  passive: Street[]
  /** How many of those bets were at least `BIG_BET` of the pot they went into. */
  bigBets: number
  /** Did the seat raise before the flop? A call is not a claim; a raise is. */
  preflopRaise: boolean
  /** Has the seat taken any action at all? A seat that has only posted a blind has not. */
  acted: boolean
  /** Folded seats say nothing, immediately. */
  folded: boolean
}

/** A bet of at least this share of the pot is "near pot" rather than a stab. */
const BIG_BET = 0.6

export const emptyReadSignal = (): ReadSignal => ({
  aggressive: [],
  passive: [],
  bigBets: 0,
  preflopRaise: false,
  acted: false,
  folded: false,
})

/** One action, as the whole table saw it. No cards. */
export interface ReadAction {
  street: Street
  type: ActionType
  /** Chips this action actually put in the middle (0 for a check or a fold). */
  chipsIn: number
  /** The pot before those chips went in. Used for sizing only, never for strength. */
  potBefore: number
}

/**
 * Fold one action into a seat's signal, returning a new one. The caller keeps the running signal
 * per seat, so the read is recomputed after each bot action rather than replayed from the top.
 */
export function observe(signal: ReadSignal, action: ReadAction): ReadSignal {
  const next: ReadSignal = { ...signal, acted: true }
  if (action.type === 'fold') return { ...next, folded: true }

  const aggressive = action.type === 'bet' || action.type === 'raise'
  if (action.street === 'preflop') {
    if (aggressive) next.preflopRaise = true
    return next
  }

  if (aggressive) {
    if (!signal.aggressive.includes(action.street))
      next.aggressive = [...signal.aggressive, action.street]
    next.passive = signal.passive.filter((s) => s !== action.street)
    if (action.potBefore > 0 && action.chipsIn / action.potBefore >= BIG_BET) next.bigBets++
  } else if (
    !signal.aggressive.includes(action.street) &&
    !signal.passive.includes(action.street)
  ) {
    next.passive = [...signal.passive, action.street]
  }
  return next
}

/** Does the board give a caller something to be drawing to? */
export function isDrawy(board: Card[]): boolean {
  if (board.length < 3) return false
  const bySuit = new Map<string, number>()
  for (const card of board) bySuit.set(card.suit, (bySuit.get(card.suit) ?? 0) + 1)
  // Two of a suit is enough: the flush draw is the draw a check-call is most often on.
  return [...bySuit.values()].some((n) => n >= 2)
}

/**
 * The phrase for one seat, or `null` when it shows nothing — it folded, or it has only posted a
 * blind. The rules are ordered, and each is a shape a player could name out loud at the table.
 */
export function label(signal: ReadSignal | undefined, board: Card[]): ReadLabel | null {
  if (!signal?.acted || signal.folded) return null

  const agg = signal.aggressive.length
  const passive = signal.passive.length

  // Nothing postflop yet, so only the preflop decision to go on: a raise is a claim, a call is
  // genuinely ambiguous and gets the word for it.
  if (agg === 0 && passive === 0) return signal.preflopRaise ? 'probably a pair' : 'unclear'

  const drawy = isDrawy(board)

  // Never once took the lead. On a board with a draw on it that is the check-call line; on a dry
  // one it is a hand too weak to bet and too cheap to fold, which this vocabulary calls air.
  if (agg === 0) return drawy ? 'probably a draw' : 'probably air'

  // Fired big more than once: the line a made hand takes when it wants to get paid.
  if (agg >= 2 && signal.bigBets >= 2) return 'probably a pair'

  // Showed no interest, then fired anyway, on a board where a draw could have just missed. The
  // one shape this read is willing to call air off aggression alone.
  if (passive > 0 && drawy) return 'probably air'

  // Bet every street it saw without ever giving up the lead.
  if (agg >= 2 || (passive === 0 && signal.bigBets > 0)) return 'probably a pair'

  // A single small stab into an unremarkable board. Could be anything; say so.
  return 'unclear'
}

/** The phrase for every seat that has one. Seats with nothing to say are absent from the map. */
export function labels(
  signals: Record<string, ReadSignal>,
  board: Card[],
): Record<string, ReadLabel> {
  const out: Record<string, ReadLabel> = {}
  for (const [id, signal] of Object.entries(signals)) {
    const phrase = label(signal, board)
    if (phrase) out[id] = phrase
  }
  return out
}
