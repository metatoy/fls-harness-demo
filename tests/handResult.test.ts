import test from 'ava'
import { handVerdict } from '@/lib/handResult'
import type { HandResult } from '@/lib/poker/engine'

/** A finished hand's result, written as who was paid what. */
const result = (pots: { amount: number; winners: string[] }[], showdown = true): HandResult => {
  const payouts: Record<string, number> = {}
  for (const pot of pots) {
    for (const id of pot.winners) {
      payouts[id] = (payouts[id] ?? 0) + Math.floor(pot.amount / pot.winners.length)
    }
  }
  return { showdown, payouts, potsAwarded: pots }
}

const verdict = (input: Parameters<typeof handVerdict>[0]) => handVerdict(input)?.text ?? null

test('a hand still running has no verdict until this player is out of it', (t) => {
  // Acceptance 1's other half: the lane is empty mid-hand, so nothing is said before it is true.
  t.is(verdict({ folded: false, result: null, playerId: 'hero' }), null)
})

test('folding says so at once, whatever the hand goes on to do', (t) => {
  // Acceptance 1. The fold is the hero's own action, so the verdict is known immediately —
  // including a fold taken for them on a timeout, which reaches this the same way.
  t.is(verdict({ folded: true, result: null, playerId: 'hero' }), 'You folded')
  // And it stays the answer once the hand resolves without them, however it resolved.
  t.is(
    verdict({
      folded: true,
      result: result([{ amount: 900, winners: ['villain'] }]),
      playerId: 'hero',
    }),
    'You folded',
  )
})

test('winning a pot outright says you won', (t) => {
  t.is(
    verdict({
      folded: false,
      result: result([{ amount: 900, winners: ['hero'] }]),
      playerId: 'hero',
    }),
    'You won',
  )
  const uncontested = result([{ amount: 120, winners: ['hero'] }], false)
  t.is(verdict({ folded: false, result: uncontested, playerId: 'hero' }), 'You won')
})

test('a chopped pot says you split it, never that you won', (t) => {
  // Acceptance 2. Paid chips and a shared pot are both true; the player needs the second one.
  const chop = result([{ amount: 900, winners: ['hero', 'villain'] }])
  t.is(verdict({ folded: false, result: chop, playerId: 'hero' }), 'You split the pot')
  t.is(handVerdict({ folded: false, result: chop, playerId: 'hero' })?.tone, 'neutral')
  // A side pot taken outright alongside a chopped main pot is still a split — the honest word.
  const mixed = result([
    { amount: 600, winners: ['hero', 'villain'] },
    { amount: 200, winners: ['hero'] },
  ])
  t.is(verdict({ folded: false, result: mixed, playerId: 'hero' }), 'You split the pot')
})

test('staying in and being paid nothing is a showdown loss', (t) => {
  // Acceptance 2. Not folded and not paid leaves exactly one way the hand ended.
  const lost = result([{ amount: 900, winners: ['villain'] }])
  t.is(verdict({ folded: false, result: lost, playerId: 'hero' }), 'Lost at showdown')
  t.is(handVerdict({ folded: false, result: lost, playerId: 'hero' })?.tone, 'lose')
})

test('every verdict carries its own words, so none of them is said in colour alone', (t) => {
  const cases = [
    { folded: true, result: null, playerId: 'hero' },
    { folded: false, result: result([{ amount: 9, winners: ['hero'] }]), playerId: 'hero' },
    { folded: false, result: result([{ amount: 9, winners: ['hero', 'v'] }]), playerId: 'hero' },
    { folded: false, result: result([{ amount: 9, winners: ['v'] }]), playerId: 'hero' },
  ]
  const texts = cases.map((c) => handVerdict(c)?.text ?? '')
  t.is(new Set(texts).size, cases.length, 'four outcomes, four distinct sentences')
  for (const text of texts) t.true(text.length > 0)
  // The signal colour belongs to the clock; a finished hand never wears it.
  for (const c of cases) t.not(handVerdict(c)?.tone, 'turn' as never)
})
