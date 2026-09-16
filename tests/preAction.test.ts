import test from 'ava'
import {
  applyAction,
  type HandState,
  legalActions,
  type SeatConfig,
  startHand,
} from '@/lib/poker/engine'
import { preActionFire, preActionKind, preActionToken, tokenHolds } from '@/lib/preAction'

const seats = (): SeatConfig[] => [
  { id: 'hero', name: 'You', stack: 1000 },
  { id: 'b1', name: 'One', stack: 1000 },
  { id: 'b2', name: 'Two', stack: 1000 },
  { id: 'b3', name: 'Three', stack: 1000 },
]

const deal = (): HandState =>
  startHand({ seats: seats(), buttonIndex: 0, smallBlind: 5, bigBlind: 10 })

const toAct = (s: HandState): string => s.players[s.toActIndex]?.id ?? ''

/** The cheapest line for whoever is to act — check if they can, else call. */
function passOnce(s: HandState): HandState {
  const legal = legalActions(s)
  return legal ? applyAction(s, legal.canCheck ? { type: 'check' } : { type: 'call' }) : s
}

/** Everybody limps preflop; the state returned is the flop with the first bot to act. */
function flopStart(): HandState {
  let cur = deal()
  for (let i = 0; i < 12 && cur.street === 'preflop'; i++) cur = passOnce(cur)
  return cur
}

/** Everyone but the hero takes the cheapest line — check if they can, else call. */
function botsPassUntilHero(s: HandState): HandState {
  let cur = s
  for (let i = 0; i < 12 && toAct(cur) !== 'hero' && cur.toActIndex >= 0; i++) cur = passOnce(cur)
  return cur
}

test('the control is labelled by what is true when you tap it', (t) => {
  const s = deal()
  // Preflop, facing the big blind: the thing you had already decided is a fold.
  t.is(preActionKind(s, 'hero'), 'fold')

  // The hero in the big blind with nothing raised owes nothing, so the same tap is a check.
  const bb = deal()
  const heroOwed =
    bb.currentBet - (bb.players.find((p) => p.id === 'hero')?.committedThisStreet ?? 0)
  t.true(heroOwed > 0)
  const raised = applyAction(bb, { type: 'raise', amount: 30 })
  t.is(preActionKind(raised, 'hero'), 'fold', 'a bigger bet is still a bet pending')
})

test('no bet to answer means the word is Check', (t) => {
  const s = botsPassUntilHero(flopStart())
  t.is(s.street, 'flop')
  t.is(s.currentBet, 0)
  t.is(preActionKind(s, 'hero'), 'check')
})

test('an arm survives the bots it was armed behind', (t) => {
  // Acceptance 2's premise: you arm while three bots are still to act. Their checks and calls
  // do not change the question you answered, so the arm is still standing when it reaches you.
  const flop = flopStart()
  t.not(toAct(flop), 'hero', 'three bots still to act')
  const armed = { kind: 'check' as const, token: preActionToken(7, flop) }
  const reached = botsPassUntilHero(flop)
  t.is(toAct(reached), 'hero')
  t.true(tokenHolds(armed, 7, reached))
})

test('a bet under the arm drops it', (t) => {
  const s = botsPassUntilHero(flopStart())
  const armed = { kind: 'check' as const, token: preActionToken(7, s) }
  const bet = applyAction(s, { type: 'bet', amount: 40 })
  t.false(tokenHolds(armed, 7, bet), 'a bet is a new question')
  t.is(preActionFire(armed, 7, bet, 'hero'), null)
})

test('ACCEPTANCE 3: a street boundary disarms, bet or no bet', (t) => {
  const s = botsPassUntilHero(flopStart())
  t.is(s.street, 'flop')
  const armed = { kind: 'check' as const, token: preActionToken(7, s) }

  // Checked round: the pot never moved, and the arm is still gone on the turn.
  let turn = s
  for (let i = 0; i < 4 && turn.street === 'flop'; i++) turn = applyAction(turn, { type: 'check' })
  t.is(turn.street, 'turn')
  t.is(turn.currentBet, 0, 'nobody bet')
  t.false(tokenHolds(armed, 7, turn))
})

test('a new hand is never the hand you armed in', (t) => {
  const s = botsPassUntilHero(deal())
  const armed = { kind: 'fold' as const, token: preActionToken(7, s) }
  t.false(tokenHolds(armed, 8, s), 'no pre-action crosses a hand boundary')
})

test('ACCEPTANCE 2: an arm that still holds submits its own action', (t) => {
  const s = botsPassUntilHero(flopStart())
  t.is(toAct(s), 'hero')
  t.deepEqual(preActionFire({ kind: 'check', token: preActionToken(7, s) }, 7, s, 'hero'), {
    type: 'check',
  })
  t.deepEqual(preActionFire({ kind: 'fold', token: preActionToken(7, s) }, 7, s, 'hero'), {
    type: 'fold',
  })
})

test('ACCEPTANCE 4: anything off about the moment refuses to fire, and never folds instead', (t) => {
  const s = deal()
  const armed = { kind: 'fold' as const, token: preActionToken(7, s) }
  // Somebody else is on the clock — the arm fired early would act out of turn.
  t.not(toAct(s), 'hero')
  t.is(preActionFire(armed, 7, s, 'hero'), null)

  // A check armed into a pot that now has a bet in it: rejected, never downgraded to a fold.
  const flop = botsPassUntilHero(flopStart())
  const check = { kind: 'check' as const, token: preActionToken(7, flop) }
  const bet = applyAction(flop, { type: 'bet', amount: 40 })
  t.is(preActionFire(check, 7, bet, 'hero'), null)
})
