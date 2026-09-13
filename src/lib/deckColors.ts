// Which colour a suit's ink is. Pure and React-free so the rule can be tested
// without rendering a card (components/PlayingCard is the only consumer).
//
// The four-colour deck is the poker-room standard for misreading nothing:
// spades stay black and hearts stay red — the two nobody confuses — while
// diamonds go blue and clubs green. Every colour here is a theme token, so it
// resolves in both light and dark.

import type { Suit } from '@/lib/poker/cards'
import { isRed } from '@/lib/poker/cards'

const FOUR_COLOUR_INK: Record<Suit, string> = {
  h: 'text-suit-red',
  s: 'text-cardface-ink',
  d: 'text-suit-blue',
  c: 'text-suit-green',
}

/**
 * The ink class for one suit.
 *
 * `fourColour` is the player's setting (or the Chip Shop face they equipped);
 * everything else is the two-colour deck, which is the default and stays so.
 */
export function suitInk(suit: Suit, fourColour: boolean): string {
  if (fourColour) return FOUR_COLOUR_INK[suit]
  return isRed(suit) ? 'text-suit-red' : 'text-cardface-ink'
}

/**
 * Is this card drawn in four colours?
 *
 * Two ways in, on purpose: the free setting (store/profile `fourColourDeck`)
 * and the Chip Shop's Four-Colour deck face, which players already own. Either
 * one says yes, so turning the setting off does not un-equip a bought face.
 */
export function isFourColour(fourColourDeck: boolean, deckFace: string): boolean {
  return fourColourDeck || deckFace === 'face-fourcolor'
}
