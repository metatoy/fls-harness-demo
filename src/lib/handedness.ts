/**
 * Left-handed mode, as pure data.
 *
 * The phone is held in one hand and the thumb travels from one bottom corner. The app assumes the
 * right one, so a left-handed player stretches across the screen for the button the clock is
 * waiting on, and stretching is how you hit the wrong one. Mirroring the row is the whole
 * mechanism: the touch targets move, nothing else does — text direction, card faces and chip
 * counts are unchanged, because none of those is a thing a thumb has to reach.
 *
 * It says nothing to the player about the hand, so it sits on the safe side of the north star:
 * every seat can see where every button is, and the layout carries no information at all.
 */

/** The one action that cannot be taken back. */
const FOLD = 'fold'

/**
 * A row read from the other end — the mirror, and nothing else.
 *
 * Returns a copy, so a caller can pass the array it renders from without having its own order
 * quietly rewritten. It moves the DOM rather than painting a row backwards (no `flex-row-reverse`)
 * so reading order, tab order and what the eye sees stay the same thing.
 */
export function mirrorRow<T>(row: readonly T[], leftHanded: boolean): T[] {
  return leftHanded ? [...row].reverse() : [...row]
}

/**
 * The action row's slots, nearest the thumb first.
 *
 * Mirroring is the mechanism, but the invariant outranks it: **Fold occupies the slot farthest
 * from the thumb origin, whatever the row's length.** They agree on the base row (Fold /
 * Check-Call / Bet-Raise) and disagree the moment a row appends All-in or Check-Fold, where a
 * plain mirror would slide Fold inward and leave the irreversible action a thumb's width from the
 * one you meant. So Fold is moved back out to the far end afterwards.
 *
 * Right-handed is the row exactly as authored: the thumb starts bottom-right, and Fold is already
 * at the far end of it.
 */
export function actionRowOrder(keys: readonly string[], leftHanded: boolean): string[] {
  const mirrored = mirrorRow(keys, leftHanded)
  if (!leftHanded) return mirrored
  const rest = mirrored.filter((key) => key !== FOLD)
  return mirrored.length === rest.length ? mirrored : [...rest, FOLD]
}

/** The layout a hand is being played under, and the hand it was settled for. */
export interface AppliedHandedness {
  leftHanded: boolean
  handIndex: number
}

/**
 * The layout that applies right now.
 *
 * Toggling takes effect at the next hand boundary, never mid-hand: a button that moves while the
 * clock is on you moves under a thumb already travelling towards it, and the action it lands on is
 * one you did not choose. The setting is remembered immediately; only the row waits.
 *
 * Returns the value it was given when nothing changed, so a render that reads it does not churn.
 */
export function settleHandedness(
  applied: AppliedHandedness,
  setting: boolean,
  handIndex: number,
): AppliedHandedness {
  if (handIndex === applied.handIndex) return applied
  return { leftHanded: setting, handIndex }
}
