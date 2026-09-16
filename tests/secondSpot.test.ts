import test from 'ava'
import { SECOND_SPOT, WORKED_SPOTS, pct, requiredEquity, ruleOfTwo } from '@/config/potOdds'
import { flags } from '@/lib/flags'

// The pot-odds guide's second worked spot. The first one resolves to a call, so
// this one only earns its place if it resolves to a fold and does it with
// different numbers — otherwise it is the same lesson printed twice.
//
// Every claim the surface makes is arithmetic over SECOND_SPOT, so it is
// settled here rather than read off the rendered page.

const { pot, bet, outs } = SECOND_SPOT
const call = bet
const finalPot = pot + bet + call
const required = requiredEquity(bet / pot)
const equity = ruleOfTwo(outs) / 100

test('the price is the call over the pot after the call, not over the pot as it stands', (t) => {
  t.is(finalPot, 720)
  t.is(required, call / finalPot)
  t.is(pct(required), '33.3')
})

test('the hand is worth outs times two for the one card the bet buys', (t) => {
  t.is(outs, 4)
  t.is(ruleOfTwo(outs), 8)
})

test('it is a fold, and not a close one', (t) => {
  t.true(equity < required, 'the draw is short of the price')
  // Five points would be a spot a reader could argue with. This one is lopsided
  // on purpose: the two sides of the threshold have to be obvious.
  t.true((required - equity) * 100 >= 5, 'at least five points short')
})

test('the stakes and the draw differ from the first worked spot', (t) => {
  const first = WORKED_SPOTS[0]
  // The first spot is a half-pot bet into 100 with a flush draw; the guide's
  // lead paragraph works the same call at 120 and 60.
  t.not(pot, 100)
  t.not(pot, 120)
  t.not(bet, 50)
  t.not(bet, 60)
  t.not(bet / pot, first.betFraction)
  t.notDeepEqual([...SECOND_SPOT.hero], [...first.hero])
  t.notDeepEqual([...SECOND_SPOT.flop], [...first.flop])
  t.not(outs, first.outs)
})

test('the surface ships behind a flag that is off in both environments', (t) => {
  const flag = flags['pot-odds-second-spot']
  t.truthy(flag)
  t.false(flag.stage)
  t.false(flag.prod)
})
