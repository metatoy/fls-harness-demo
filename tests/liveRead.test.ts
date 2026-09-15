import test from 'ava'
import type { Card } from '@/lib/poker/cards'
import {
  emptyReadSignal,
  label,
  type ReadAction,
  type ReadLabel,
  type ReadSignal,
  labels,
  observe,
} from '@/lib/liveRead'

const card = (s: string): Card => ({ rank: s[0] as Card['rank'], suit: s[1] as Card['suit'] })
const board = (...cards: string[]): Card[] => cards.map(card)

/** Two of a suit — the board acceptance 2 is played on. */
const TWO_FLUSH = board('Kh', '9h', '2c')
/** Rainbow, disconnected: nothing to be drawing to. */
const DRY = board('Kh', '9c', '2d')

const play = (signal: ReadSignal, ...actions: ReadAction[]): ReadSignal =>
  actions.reduce(observe, signal)

const act = (
  street: ReadAction['street'],
  type: ReadAction['type'],
  chipsIn = 0,
  potBefore = 0,
): ReadAction => ({ street, type, chipsIn, potBefore })

test('a seat that has only posted a blind says nothing', (t) => {
  // Acceptance 1. Blinds are posted, not acted: nothing has been observed for this seat, so
  // there is no signal and no line at the seat.
  t.is(label(undefined, DRY), null)
  t.is(label(emptyReadSignal(), DRY), null)
  t.false('bot1' in labels({ bot1: emptyReadSignal() }, DRY))
})

test('one voluntary action is enough for a line', (t) => {
  // Acceptance 1, the other half: a limp is ambiguous, but the seat has spoken, so it says so
  // rather than staying blank.
  const limper = play(emptyReadSignal(), act('preflop', 'call', 100, 150))
  t.is(label(limper, []), 'unclear')

  const raiser = play(emptyReadSignal(), act('preflop', 'raise', 300, 150))
  t.is(label(raiser, []), 'probably a pair')
})

test('check-calling and barrelling read differently on the same two-flush board', (t) => {
  // Acceptance 2, both seats on the identical board.
  const caller = play(
    emptyReadSignal(),
    act('preflop', 'call', 100, 150),
    act('flop', 'check'),
    act('flop', 'call', 200, 400),
    act('turn', 'call', 500, 1000),
  )
  const barreller = play(
    emptyReadSignal(),
    act('preflop', 'raise', 300, 150),
    act('flop', 'bet', 400, 500),
    act('turn', 'bet', 900, 1300),
    act('river', 'bet', 2500, 3100),
  )

  t.is(label(caller, TWO_FLUSH), 'probably a draw')
  t.is(label(barreller, TWO_FLUSH), 'probably a pair')
  t.not(label(caller, TWO_FLUSH), label(barreller, TWO_FLUSH))
})

test('a fold clears the line the instant it happens', (t) => {
  // Acceptance 3, first half. The fold is the last thing observed for the seat and it wins over
  // everything before it, however loud that was.
  const live = play(
    emptyReadSignal(),
    act('preflop', 'raise', 300, 150),
    act('flop', 'bet', 400, 500),
  )
  t.is(label(live, DRY), 'probably a pair')

  const folded = observe(live, act('flop', 'fold'))
  t.is(label(folded, DRY), null)
  const map = labels({ bot1: folded, bot2: live }, DRY)
  t.false('bot1' in map)
  t.is(map.bot2, 'probably a pair')
})

test('the last label freezes: showing more board does not rewrite a finished line', (t) => {
  // Acceptance 3, second half. Nothing here mutates: `observe` returns a new signal and the
  // showdown simply stops calling it, so the phrase the hand ended on is the phrase it shows.
  const seat = play(
    emptyReadSignal(),
    act('preflop', 'call', 100, 150),
    act('flop', 'check'),
    act('flop', 'call', 200, 400),
    act('turn', 'check'),
    act('turn', 'call', 500, 1000),
  )
  const atTurn = label(seat, TWO_FLUSH)
  const river = [...TWO_FLUSH, card('7d'), card('3s')]
  t.is(atTurn, 'probably a draw')
  // Same signal, board run out: still a draw, because the read is the action's shape and the
  // action did not change.
  t.is(label(seat, river), atTurn)
})

test('the same betting produces the same label whatever the seat was holding', (t) => {
  // Acceptance 4, and the north-star guarantee in one assertion: hole cards are not an input to
  // any of this, so two runs of the identical sequence cannot disagree.
  const sequence: ReadAction[] = [
    act('preflop', 'raise', 300, 150),
    act('flop', 'bet', 400, 500),
    act('turn', 'check'),
    act('river', 'bet', 300, 2000),
  ]
  const first = play(emptyReadSignal(), ...sequence)
  const second = play(emptyReadSignal(), ...sequence)
  t.deepEqual(first, second)
  t.is(label(first, TWO_FLUSH), label(second, TWO_FLUSH))
})

test('sizing separates the barrel from the stab', (t) => {
  // Near-pot on two streets is a hand; two small stabs after showing no interest is not.
  const big = play(emptyReadSignal(), act('flop', 'bet', 400, 500), act('turn', 'bet', 1000, 1300))
  t.is(label(big, TWO_FLUSH), 'probably a pair')

  const stab = play(emptyReadSignal(), act('flop', 'check'), act('turn', 'bet', 100, 1300))
  t.is(label(stab, TWO_FLUSH), 'probably air')
})

test('a street counts once, and a check-raise counts as the lead', (t) => {
  const twice = play(
    emptyReadSignal(),
    act('flop', 'bet', 400, 500),
    act('flop', 'raise', 900, 1800),
  )
  t.is(twice.aggressive.length, 1)

  const checkRaise = play(emptyReadSignal(), act('flop', 'check'), act('flop', 'raise', 900, 1000))
  t.is(checkRaise.passive.length, 0)
  t.is(checkRaise.aggressive.length, 1)
})

test('every phrase in the vocabulary is one short line', (t) => {
  const vocabulary: ReadLabel[] = ['probably a pair', 'probably a draw', 'probably air', 'unclear']
  for (const phrase of vocabulary) {
    t.true(phrase.length <= 20, phrase)
    t.false(phrase.includes('\n'))
  }
})
