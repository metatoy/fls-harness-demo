// The four-colour deck's one rule, tested where it lives: a pure function, so
// the colours are checked without a DOM or a store.

import test from 'ava'
import { isFourColour, suitInk } from '@/lib/deckColors'
import { SUITS } from '@/lib/poker/cards'

test('the two-colour deck is red for the red suits and card ink for the black ones', (t) => {
  t.is(suitInk('h', false), 'text-suit-red')
  t.is(suitInk('d', false), 'text-suit-red')
  t.is(suitInk('s', false), 'text-cardface-ink')
  t.is(suitInk('c', false), 'text-cardface-ink')
})

test('the four-colour deck moves only diamonds and clubs', (t) => {
  // The point of the standard: the two suits nobody misreads do not move, so a
  // player who turns this on still recognises the hand they already knew.
  t.is(suitInk('h', true), suitInk('h', false))
  t.is(suitInk('s', true), suitInk('s', false))
  t.is(suitInk('d', true), 'text-suit-blue')
  t.is(suitInk('c', true), 'text-suit-green')
})

test('all four suits are a different colour once it is on', (t) => {
  const inks = new Set(SUITS.map((suit) => suitInk(suit, true)))
  t.is(inks.size, 4)
})

test('every ink is a theme token, never a raw colour', (t) => {
  for (const suit of SUITS) {
    for (const fourColour of [false, true]) {
      t.regex(suitInk(suit, fourColour), /^text-[a-z-]+$/)
    }
  }
})

test('either the setting or the owned deck face turns it on', (t) => {
  t.false(isFourColour(false, 'classic'), 'off by default')
  t.true(isFourColour(true, 'classic'), 'the setting')
  t.true(isFourColour(false, 'face-fourcolor'), 'the Chip Shop face')
  t.true(isFourColour(true, 'face-fourcolor'))
  // The High-Contrast face is a different purchase and is not four colours.
  t.false(isFourColour(false, 'face-contrast'))
})
