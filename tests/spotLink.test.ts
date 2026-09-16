import test from 'ava'
import { cardFromString, mulberry32, type Card } from '@/lib/poker/cards'
import { createOddsRunner } from '@/lib/poker/oddsQuote'
import {
  MAX_TOKEN_CHARS,
  MAX_URL_CHARS,
  type Spot,
  decodeSpot,
  encodeSpot,
  spotFromHash,
  spotSeed,
  spotUrl,
} from '@/lib/spotLink'

const h = (...codes: string[]): Card[] => codes.map((c) => cardFromString(c) as Card)

const SPOTS: Spot[] = [
  { hole: h('Ah', 'Ks'), board: [], opponents: 1 },
  { hole: h('2c', '7d'), board: h('Qh', '7h', '2d'), opponents: 8 },
  { hole: h('Td', 'Tc'), board: h('Qh', '7h', '2d', '3c'), opponents: 3 },
  { hole: h('As', 'Kd'), board: h('Qh', '7h', '2d', '3c', '9s'), opponents: 1 },
]

const same = (a: Spot, b: Spot) =>
  a.opponents === b.opponents &&
  JSON.stringify([a.hole, a.board]) === JSON.stringify([b.hole, b.board])

test('a spot survives the round trip, every supported card count', (t) => {
  for (const spot of SPOTS) {
    // Through a real link and its fragment: the path a shared spot takes.
    const url = spotUrl(spot, 'https://example.com') as string
    const back = spotFromHash(url.slice(url.indexOf('#'))) as Spot
    t.true(same(spot, back), `${url} decodes to the spot it came from`)
  }
})

test('the token fits the budget, and so does the whole URL', (t) => {
  const longest: Spot = { ...SPOTS[3], opponents: 8 }
  const token = encodeSpot(longest) as string
  t.true(token.length <= MAX_TOKEN_CHARS, `${token.length} chars`)
  const url = spotUrl(longest, 'https://pocket.n8plusus.com') as string
  t.true(url.length <= MAX_URL_CHARS, `${url.length} chars: ${url}`)
})

test('a link truncated mid-payload refuses rather than decoding a different spot', (t) => {
  // The failure that matters. Every chat client in the world wraps a line
  // somewhere, and a *plausible other spot* is worse than nothing at all.
  for (const spot of SPOTS) {
    const token = encodeSpot(spot) as string
    for (let cut = 1; cut < token.length; cut++) {
      t.is(decodeSpot(token.slice(0, cut)), null, `${token} cut to ${cut}`)
    }
  }
})

test('nonsense, empty and half-dealt spots are all null', (t) => {
  t.is(decodeSpot('!!!!'), null)
  t.is(spotFromHash('#'), null)
  // A board of one or two cards is a half-dealt board, not a spot.
  t.is(encodeSpot({ hole: h('Ah', 'Ks'), board: h('Qh'), opponents: 1 }), null)
  t.is(encodeSpot({ hole: h('Ah', 'Ks'), board: h('Qh', '7h'), opponents: 1 }), null)
  // The same card twice would be a spot that cannot happen at a table.
  t.is(encodeSpot({ hole: h('Ah', 'Ah'), board: [], opponents: 1 }), null)
  t.is(encodeSpot({ hole: h('Ah', 'Ks'), board: [], opponents: 9 }), null)
  const token = encodeSpot(SPOTS[3]) as string
  t.is(decodeSpot(token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')), null)
})

test('two sessions on the same link get byte-identical odds', (t) => {
  // The whole promise of the link: the seed comes from the spot and the runner
  // samples in fixed chunks, so neither the machine nor how it chopped the work
  // up can move the number.
  const spot = SPOTS[1]
  const input = { hole: spot.hole, community: spot.board, opponents: spot.opponents }
  const target = 4_000

  const drain = (slice: number) => {
    const runner = createOddsRunner(input, { rng: mulberry32(spotSeed(spot)), target })
    while (!runner.finished) runner.step(slice)
    return runner.quote
  }

  t.deepEqual(drain(4_000), drain(137))
  t.deepEqual(drain(600), drain(137))
  t.not(spotSeed(spot), spotSeed(SPOTS[0]))
})
