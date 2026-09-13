/**
 * Table reactions — the vocabulary, and how an opponent picks one.
 *
 * A reaction is an emoji plus a word. Never the emoji alone: a glyph renders differently on every
 * platform and says nothing to a screen reader, so the word is what actually carries the meaning
 * (the same reason the design system's Badge always spells its state out).
 *
 * Opponents react **only once a hand is over**, and only to a result every seat can already see on
 * the table. That is the line in brand/northstar.md: nothing here tells the player something about
 * a live hand that the rest of the table could not obtain. A bot wincing mid-hand would be a tell,
 * and a tell is private information; a bot wincing at a pot it just lost is table manners.
 *
 * Pure and React-free, so it can be unit-tested and so a replay of the same hand shows the same
 * faces: the choice is a hash of (seat, hand number, outcome), never Math.random().
 */

/** One reaction in the vocabulary. */
export interface Reaction {
  key: string
  /** The glyph. Decorative — the word is the content. */
  emoji: string
  /** What the reaction says, in words. Read aloud, and shown next to the emoji. */
  word: string
}

/**
 * The whole vocabulary. Deliberately small and deliberately mild: no taunt, no near-miss theatre,
 * nothing that reads as needling a player who just lost a pot (docs/brand.md).
 */
export const REACTIONS: readonly Reaction[] = [
  { key: 'clap', emoji: '👏', word: 'nice hand' },
  { key: 'wince', emoji: '😬', word: 'ouch' },
  { key: 'laugh', emoji: '😄', word: 'ha' },
  { key: 'think', emoji: '🤔', word: 'hmm' },
]

export function reactionByKey(key: string): Reaction | null {
  return REACTIONS.find((r) => r.key === key) ?? null
}

/** How a hand ended for one seat, from the seat's own point of view. */
export type Outcome = 'won' | 'lost' | 'folded'

/** What an opponent might say to each ending. */
const POOL: Record<Outcome, readonly string[]> = {
  won: ['clap', 'laugh'],
  lost: ['wince', 'think'],
  folded: ['think', 'wince'],
}

/**
 * How often an opponent says anything at all, per hand, as a percentage. Most hands pass in
 * silence — the same rationing table talk uses, for the same reason: a table where everybody
 * reacts to everything is noise, and noise is not character.
 */
const CHANCE = 40

/** FNV-1a. Any stable string→number hash would do; this one is short and has no dependencies. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * The reaction this opponent shows for this hand, or null for silence.
 *
 * Deterministic in its arguments, so the same hand always wears the same faces — a re-render, a
 * resumed snapshot and a screenshot all agree.
 */
export function botReaction(seatId: string, handIndex: number, outcome: Outcome): Reaction | null {
  const h = hash(`${seatId}:${handIndex}:${outcome}`)
  if (h % 100 >= CHANCE) return null
  const pool = POOL[outcome]
  return reactionByKey(pool[(h >>> 8) % pool.length])
}
