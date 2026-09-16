import test from 'ava'
import { type Card, cardFromString, cardToString, mulberry32 } from '@/lib/poker/cards'
import { estimateEquity } from '@/lib/poker/equity'
import { type Combo, parseRange, survivingCombos } from '@/lib/poker/handRange'
import { canEnumerate, createOddsRunner } from '@/lib/poker/oddsQuote'

// Naming the opponent's holding in the odds calculator. What is worth pinning
// is what a reader would otherwise take on trust: that the notation means what
// it says, that blockers come off before the average is taken, that an unknown
// notation stops the calculation rather than quietly becoming a random deal,
// and that an empty field answers exactly the question the page answered before.

const h = (...s: string[]): Card[] => s.map(cardFromString)
const names = (combos: Combo[]) => combos.map((c) => c.map(cardToString).join(''))

const expand = (text: string, dead: Card[] = []): Combo[] => {
  const parsed = parseRange(text)
  if (!parsed.ok) throw new Error(parsed.message)
  return survivingCombos(parsed.spec.combos, dead)
}

const run = (input: Parameters<typeof createOddsRunner>[0], seed: number, target = 4_000) => {
  const runner = createOddsRunner(input, { rng: mulberry32(seed), target })
  while (!runner.finished) if (runner.step(1_000) === 0) break
  const quote = runner.quote
  if (!quote) throw new Error('a finished run has a quote')
  return quote
}

test('every supported form expands to the combinations it names', (t) => {
  t.deepEqual(names(expand('As Kd')), ['AsKd'])
  t.is(expand('AsKd').length, 1, 'the space is optional')
  t.is(expand('JJ').length, 6, 'six ways to hold a pair')
  t.is(expand('AKs').length, 4, 'one per suit')
  t.is(expand('AKo').length, 12, 'sixteen pairings minus the four suited ones')
  t.is(expand('any pair').length, 78, '13 ranks, six combinations each')
  t.is(expand('any ace').length, 198, 'C(52,2) - C(48,2)')
  // Adjacent ranks with the ace at both ends: 23s..KAs is twelve, plus A2s.
  const sc = names(expand('suited connectors'))
  t.is(sc.length, 13 * 4)
  t.true(sc.includes('2hAh'), 'A2s is a connector')
  t.true(sc.includes('KhAh'), 'AKs is a connector')
})

test('case and spacing are forgiving, nonsense is not', (t) => {
  for (const good of ['ANY PAIR', '  as   kd ', 'akS', 'jj']) t.true(parseRange(good).ok, good)
  for (const bad of ['JJ+', '22-77', 'AK', 'AsAs', 'AXs', '', 'broadway', 'As Kd Qc']) {
    t.false(parseRange(bad).ok, `${bad} should not parse`)
  }
})

// Acceptance 4: unsupported is named as such, and the supported set comes with
// it, because "unsupported" on its own is a dead end.
test('an unsupported notation errors by name and lists what is supported', (t) => {
  const parsed = parseRange('JJ+')
  if (parsed.ok) return t.fail('JJ+ is out of scope for v1')
  t.true(parsed.message.includes('JJ+'))
  for (const form of ['As Kd', 'JJ', 'AKs', 'any pair', 'suited connectors', 'any ace']) {
    t.true(parsed.message.includes(form), `the message should offer ${form}`)
  }
})

// Acceptance 2, with the arithmetic done properly: holding AhAd kills five of
// the six ace pairs, not all six. AcAs is still a hand somebody can have, so 73
// combinations survive, each worth exactly as much as any other. A fully
// blocked range comes back empty, which the caller turns into an inline error.
test('blocked combinations are removed before the average is taken', (t) => {
  const pairs = expand('any pair', h('Ah', 'Ad'))
  t.is(pairs.length, 73)
  t.deepEqual(names(pairs).slice(-1), ['AcAs'], 'the one unblocked ace pair, and no other')
  t.is(expand('AKs', h('Ah', 'Ad', 'Ac', 'As')).length, 0)
  t.is(expand('As Kd', h('Kd')).length, 0)
})

// Acceptance 1: a named hand is that matchup. Aces beat AKo about 93% of the
// time preflop and a random hand about 85% — much further apart than the band.
test('an exact hand gives that matchup, not a random-hand figure', (t) => {
  const hole = h('Ah', 'Ad')
  const named = run({ hole, opponents: 1, opponentCombos: expand('As Kd', hole) }, 7)
  t.true(named.equity > 0.89 && named.equity < 0.96, `AA vs AsKd was ${named.equity}`)
  t.true(named.equity > run({ hole, opponents: 1 }, 7).equity + 0.02, 'not a random deal')
  t.false(named.exact, 'a named opponent samples, so the band it prints is real')
  const river = { hole, community: h('2c', '3d', '7h', '9s', 'Tc'), opponents: 1 }
  t.true(canEnumerate(river), 'the old exhaustive path is untouched')
  t.false(canEnumerate({ ...river, opponentCombos: expand('As Kd', hole) }))
})

// Uniform per combo, which is the weighting a sampler could get wrong in
// silence: a two-combo range has to land at the midpoint of its two halves.
test('a range averages its combinations, uniformly per combo', (t) => {
  const spot = { hole: h('Ah', 'Ad'), community: h('Qd', '7c', '2h'), opponents: 1 }
  const combos = expand('AKs', [...spot.hole, ...spot.community])
  t.is(combos.length, 2, 'AhKh and AdKd are blocked by the hero')
  const each = combos.map((c) => run({ ...spot, opponentCombos: [c] }, 3).equity)
  const both = run({ ...spot, opponentCombos: combos }, 3).equity
  const mid = (each[0] + each[1]) / 2
  t.true(Math.abs(both - mid) < 0.03, `${both} should sit at the midpoint ${mid}`)
})

// Acceptance 3: the empty field is the old path, to the last digit.
test('naming nobody reproduces the pre-change answer under a fixed seed', (t) => {
  const spot = { hole: h('Ah', 'Ad'), community: h('Qh', '7h', '2d'), opponents: 2 }
  const old = { ...spot, iterations: 3_000 }
  const before = estimateEquity({ ...old, rng: mulberry32(99) })
  t.deepEqual(estimateEquity({ ...old, opponentCombos: undefined, rng: mulberry32(99) }), before)
  t.deepEqual(run(spot, 42), run({ ...spot, opponentCombos: [] }, 42), 'empty is no range at all')
})
