// Naming what the opponent holds, for the odds calculator.
//
// A random deal answers "how does my hand do against anybody?", which is the
// wrong question the moment you have a read. This turns a small, closed
// notation into the list of two-card combinations it stands for, so the equity
// underneath is an average over those and nothing else. It fails closed:
// anything unrecognised is an error the caller must show, never a quiet fall
// back to a random hand, because a calculator that silently answers a different
// question is worse than one that says it cannot.
//
// Pure and framework-free; tests/handRange.test.ts settles what it accepts.

import { type Card, type Rank, RANKS, SUITS, cardToString } from './cards'

/** Two distinct cards an opponent could be holding. */
export type Combo = readonly [Card, Card]

export interface RangeSpec {
  /** What was recognised, said back to the reader ("any pair"). */
  label: string
  /** Everything the notation covers, before blockers are removed. */
  combos: Combo[]
}

export type RangeParse = { ok: true; spec: RangeSpec } | { ok: false; message: string }

/** The whole grammar, as offered to someone who got it wrong: "unsupported"
 *  without the supported set is a dead end. */
export const SUPPORTED_FORMS: readonly string[] = [
  'an exact hand — As Kd',
  'a pair — JJ',
  'a shape — AKs or AKo',
  'any pair',
  'suited connectors',
  'any ace',
]

const EXACT = /^([2-9tjqka])([cdhs]) ?([2-9tjqka])([cdhs])$/i
const PAIR = /^([2-9tjqka])\1$/i
const SHAPE = /^([2-9tjqka])([2-9tjqka])([so])$/i

/** Every two-card combination the predicate keeps, in deck order. */
function combosWhere(keep: (a: Card, b: Card) => boolean): Combo[] {
  const deck: Card[] = []
  for (const rank of RANKS) for (const suit of SUITS) deck.push({ rank, suit })
  const out: Combo[] = []
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      if (keep(deck[i], deck[j])) out.push([deck[i], deck[j]])
    }
  }
  return out
}

/** Ranks next to each other, with the ace at both ends: A2s and AKs both count. */
function adjacent(a: Rank, b: Rank): boolean {
  if (Math.abs(RANKS.indexOf(a) - RANKS.indexOf(b)) === 1) return true
  return (a === 'A' && b === '2') || (a === '2' && b === 'A')
}

const ALIASES: Record<string, (a: Card, b: Card) => boolean> = {
  'any pair': (a, b) => a.rank === b.rank,
  'suited connectors': (a, b) => a.suit === b.suit && adjacent(a.rank, b.rank),
  'any ace': (a, b) => a.rank === 'A' || b.rank === 'A',
}

function unsupported(text: string): RangeParse {
  return {
    ok: false,
    message: `“${text}” is not a hand or range this calculator knows. Supported: ${SUPPORTED_FORMS.join('; ')}.`,
  }
}

/**
 * Read a hand or a range. Case is ignored for the words and the ranks; suits
 * are the usual c/d/h/s. The space between the two cards of an exact hand is
 * optional, so "As Kd" and "AsKd" are the same thing.
 */
export function parseRange(text: string): RangeParse {
  const t = text.trim().replace(/\s+/g, ' ')
  const ok = (label: string, combos: Combo[]): RangeParse => ({ ok: true, spec: { label, combos } })

  const alias = ALIASES[t.toLowerCase()]
  if (alias) return ok(t.toLowerCase(), combosWhere(alias))

  // An exact hand: rank, suit, rank, suit. One card twice is nobody's hand.
  const exact = EXACT.exec(t)
  if (exact) {
    const a = { rank: exact[1].toUpperCase(), suit: exact[2].toLowerCase() } as Card
    const b = { rank: exact[3].toUpperCase(), suit: exact[4].toLowerCase() } as Card
    if (cardToString(a) === cardToString(b)) return unsupported(text)
    return ok(`${cardToString(a)} ${cardToString(b)}`, [[a, b]])
  }

  const pair = PAIR.exec(t)
  if (pair) {
    const rank = pair[1].toUpperCase() as Rank
    return ok(
      `${rank}${rank}`,
      combosWhere((a, b) => a.rank === rank && b.rank === rank),
    )
  }

  // A shape: two different ranks, suited or offsuit.
  const shape = SHAPE.exec(t)
  if (shape) {
    const [hi, lo] = [shape[1].toUpperCase(), shape[2].toUpperCase()]
    const suited = shape[3].toLowerCase() === 's'
    if (hi === lo) return unsupported(text)
    return ok(
      `${hi}${lo}${suited ? 's' : 'o'}`,
      combosWhere(
        (a, b) =>
          ((a.rank === hi && b.rank === lo) || (a.rank === lo && b.rank === hi)) &&
          (a.suit === b.suit) === suited,
      ),
    )
  }

  return unsupported(text)
}

/**
 * The combinations still available once the cards you can see are removed.
 * Every survivor is equally likely — uniform over combos, not over shapes, and
 * that matters: holding AhAd leaves one ace pair rather than six, where
 * weighting by shape would still count aces as a thirteenth of "any pair".
 */
export function survivingCombos(combos: readonly Combo[], dead: readonly Card[]): Combo[] {
  const blocked = new Set(dead.map(cardToString))
  return combos.filter(([a, b]) => !blocked.has(cardToString(a)) && !blocked.has(cardToString(b)))
}
