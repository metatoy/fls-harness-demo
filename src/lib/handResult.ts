/**
 * The verdict on a finished hand, in plain language.
 *
 * A player should not have to read chip stacks to learn how the hand went. Four outcomes, one
 * short sentence each, and the sentence is the whole message: the tone only tints a badge that
 * already says the word, so nothing here is carried by colour alone.
 *
 * It says nothing the table does not already know — a fold, a pot pushed, a chop, a showdown lost
 * are all public events, and the line appears only once the hand has ended for this player. That
 * is the side of brand/northstar.md it sits on: no in-hand information that others cannot see.
 *
 * Pure, so the store can call it at the moment of the fold and again when the hand resolves, and
 * get the same answer both times.
 */

import type { HandResult } from './poker/engine'

/** A badge tone from the design system's Badge. `turn` is never one of them: the signal colour
 *  means the clock is waiting on you, and a finished hand is waiting on nobody. */
export type VerdictTone = 'neutral' | 'win' | 'lose'

export interface HandVerdict {
  text: string
  tone: VerdictTone
}

export interface VerdictInput {
  /** Has this player folded? True the instant the fold is taken, not at resolution. */
  folded: boolean
  /** The hand's result, or null/undefined while the hand is still running. */
  result: HandResult | null | undefined
  /** The player the verdict is for. */
  playerId: string
}

/**
 * The verdict, or `null` when there is nothing to say yet — a hand in progress that this player
 * has not folded out of.
 *
 * First match wins, in this order: folded, won, split, lost at showdown. "Won" means won outright;
 * a pot this player shared is a chop and reads as one, which is the only reason the two are not
 * one branch. Anyone still live at the end who was paid nothing lost the showdown — those are the
 * only two ways a hand can end.
 */
export function handVerdict({ folded, result, playerId }: VerdictInput): HandVerdict | null {
  if (folded) return { text: 'You folded', tone: 'neutral' }
  if (!result) return null

  const pots = result.potsAwarded.filter((p) => p.winners.includes(playerId))
  if (pots.length > 0) {
    const shared = pots.some((p) => p.winners.length > 1)
    return shared
      ? { text: 'You split the pot', tone: 'neutral' }
      : { text: 'You won', tone: 'win' }
  }
  return { text: 'Lost at showdown', tone: 'lose' }
}
