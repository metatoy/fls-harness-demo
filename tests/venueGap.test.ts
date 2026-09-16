import test from 'ava'
import { CHALLENGE_TABLES, KITCHEN_TABLE, THE_DAILY, VENUES, type Venue } from '@/config/venues'
import { nextVenueGap, openVenues } from '@/lib/venueGap'

const venue = (id: string, buyIn: number, extra: Partial<Venue> = {}): Venue => ({
  id,
  name: id,
  tagline: '',
  buyIn,
  smallBlind: 1,
  bigBlind: 2,
  seats: 6,
  prize: buyIn * 6,
  accent: '#000000',
  ai: { tightness: 0.3, aggression: 0.3, bluff: 0.1, iterations: 100 },
  ...extra,
})

const ladder = [venue('a', 100), venue('b', 300), venue('c', 750), venue('d', 2000)]

test('names the cheapest venue the Roll cannot cover yet', (t) => {
  // Acceptance 1. 500 covers a and b, so the next one up is c — not d, which is also unaffordable.
  const gap = nextVenueGap(500, ladder[1], ladder)
  t.is(gap?.venue.id, 'c')
})

test('the shortfall is whole chips and the anchor is buy-ins of the venue in play', (t) => {
  // Acceptance 2, and the user story's own example: 750 - 500 = 250 short, which at a 300 buy-in
  // reads as 0.8 buy-ins here. One decimal, so the line never grows a digit under a moving Roll.
  const gap = nextVenueGap(500, ladder[1], ladder)
  t.is(gap?.shortfall, 250)
  t.is(gap?.buyIns, 0.8)
  t.is(gap?.anchor.id, 'b')

  // A fractional Roll rounds the shortfall up: a player one chip short is short, not there.
  t.is(nextVenueGap(499.5, ladder[1], ladder)?.shortfall, 251)
})

test('ties are broken by display order', (t) => {
  const tied = [venue('first', 1000), venue('second', 1000)]
  t.is(nextVenueGap(100, tied[0], tied)?.venue.id, 'first')
})

test('nothing left to be short of means no indicator', (t) => {
  // Acceptance 5, on both screens: the caller renders nothing when this is null.
  t.is(nextVenueGap(2000, ladder[3], ladder), null)
  t.is(nextVenueGap(9_999_999, ladder[3], ladder), null)
})

test('a venue gated by progression is never named', (t) => {
  // Acceptance 3. The challenge tables are the one progression gate in this app (lib/challenge
  // derives the standing challenger from venues actually won) and the freeroll and the Daily open
  // on conditions of their own, so none of them is a rung a player can simply buy into today.
  const open = openVenues()
  for (const gated of [...CHALLENGE_TABLES, KITCHEN_TABLE, THE_DAILY]) {
    t.false(
      open.some((v) => v.id === gated.id),
      `${gated.id} is not a candidate`,
    )
  }
  // challenge-low costs 500, so a Roll of 400 would otherwise name it ahead of The Pool Hall.
  t.not(nextVenueGap(400, VENUES[1], open)?.venue.id, 'challenge-low')
})

test('the candidate set is every venue anyone can walk into', (t) => {
  const open = openVenues()
  t.true(open.some((v) => v.id === 'garage'))
  t.true(open.some((v) => v.id === 'duel')) // a side table
  t.true(open.some((v) => v.id === 'ring-micro')) // a cash room on the Rail
})

test('with no venue in play the anchor is the biggest stake the Roll covers', (t) => {
  // The picker is reached from the menu, where nothing is in play. Anchoring on the dearest venue
  // the player could sit at today is the nearest true reading of "buy-ins here".
  const gap = nextVenueGap(500, null, ladder)
  t.is(gap?.anchor.id, 'b')
  // Below the bottom rung there is nothing covered, so the anchor is the cheapest venue there is.
  t.is(nextVenueGap(40, null, ladder)?.anchor.id, 'a')
})

test('an anchor with no buy-in cannot divide', (t) => {
  const free = [venue('free', 0), venue('paid', 100)]
  const gap = nextVenueGap(0, free[0], free)
  t.is(gap?.venue.id, 'paid')
  t.is(gap?.buyIns, null)
})
