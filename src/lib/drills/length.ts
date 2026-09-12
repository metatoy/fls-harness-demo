import type { DrillKind } from '@/config/drills'

/**
 * How long a kind takes, said on its tile so a player can pick one that fits the
 * time they have.
 *
 * **An estimate of a typical run, never a cap.** Nothing in the drills counts
 * down, locks, or ends on its own (see the note at the top of config/drills.ts),
 * and this is the surface where that would be easiest to erode: a number on a
 * tile reads as an allowance if the screen it opens then stops at it. It does
 * not. You may play one hand or a hundred; the line is there so "I have five
 * minutes" has an answer before you walk in.
 *
 * It is also study, not play: this is the room outside a hand, so it tells
 * nobody anything about a live hand that the table would not.
 *
 * The minutes are derived rather than authored, so the two halves of the line
 * cannot drift apart — a kind's pace is the one thing to edit in the registry.
 */

/** Minutes a typical run of this kind takes, rounded, never below one. */
export function sessionMinutes(kind: DrillKind): number {
  return Math.max(1, Math.round((kind.sessionHands * kind.secondsPerHand) / 60))
}

/** The chip: the count with its unit, because a bare number is not a fact. */
export function handsLabel(kind: DrillKind): string {
  return `${kind.sessionHands} ${kind.sessionHands === 1 ? 'hand' : 'hands'}`
}

/** The estimate beside it. "about" is doing real work: it is not a promise. */
export function minutesLabel(kind: DrillKind): string {
  return `about ${sessionMinutes(kind)} min`
}
