import test from 'ava'
import { cardFromString } from '@/lib/poker/cards'
import { potAt, streetCursors } from '@/lib/replayStreets'
import type { HandEvent, HandRecord } from '@/store/game'

const cards = (...s: string[]) => s.map(cardFromString)

/** Blinds 50/100. Pre-flop order UTG → button → small blind → big blind, as the engine records it. */
const hand = (events: HandEvent[]): HandRecord => ({
  handNo: 3,
  smallBlind: 50,
  bigBlind: 100,
  events,
  community: [],
  reveals: [],
  summary: '',
})

const FLOP = cards('Ah', '7d', '2c')
const TURN = cards('Ah', '7d', '2c', 'Ks')
const RIVER = cards('Ah', '7d', '2c', 'Ks', '9h')

// A full hand: three players see a flop, one folds the turn is bet into, the river is checked
// through. `bb` posted the big blind and `sb` the small one — the last two to act pre-flop.
const played = hand([
  { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'raise', amount: 300 },
  { kind: 'action', playerId: 'sb', playerName: 'Bo', type: 'fold' },
  { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'call', amount: 200 },
  { kind: 'board', label: 'Flop', cards: FLOP },
  { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'check' },
  { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'bet', amount: 400 },
  { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'call', amount: 400 },
  { kind: 'board', label: 'Turn', cards: TURN },
  { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'check' },
  { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'check' },
  { kind: 'board', label: 'River', cards: RIVER },
  { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'bet', amount: 500 },
  { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'fold' },
])

/** The board on show at a given cursor, the way the replay page reads it. */
const boardAt = (record: HandRecord, step: number) =>
  [...record.events.slice(0, step)].reverse().find((e) => e.kind === 'board')?.cards ?? []

// ── the cursors ────────────────────────────────────────────────────────────────────────────

test('a street cursor lands on the state where that street’s cards are on the board', (t) => {
  const c = streetCursors(played.events)
  t.is(c.preflop, 0, 'pre-flop is the state before anybody acted')
  t.deepEqual(boardAt(played, c.flop!), FLOP)
  t.deepEqual(boardAt(played, c.turn!), TURN, 'the turn shows the flop plus the turn card')
  t.deepEqual(boardAt(played, c.river!), RIVER)
})

test('a street whose cards were never dealt has no cursor', (t) => {
  const foldedPreflop = hand([
    { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'raise', amount: 300 },
    { kind: 'action', playerId: 'sb', playerName: 'Bo', type: 'fold' },
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'fold' },
  ])
  const c = streetCursors(foldedPreflop.events)
  t.is(c.preflop, 0, 'pre-flop is always reachable')
  t.is(c.flop, null)
  t.is(c.turn, null)
  t.is(c.river, null)
})

test('a flop that got no further leaves the turn and the river unreachable', (t) => {
  const c = streetCursors([
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'call', amount: 200 },
    { kind: 'board', label: 'Flop', cards: FLOP },
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'fold' },
  ])
  t.is(c.flop, 2)
  t.is(c.turn, null)
  t.is(c.river, null)
})

test('an all-in runout reaches every street it dealt, betting or no betting', (t) => {
  // The engine deals an all-in hand out in one "Runout" event. Nobody acts on the turn, but the
  // turn card hit the felt, so someone looking back at the hand can stop there.
  const c = streetCursors([
    { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'raise', amount: 5000 },
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'call', amount: 4900 },
    { kind: 'board', label: 'Runout', cards: RIVER },
  ])
  t.is(c.flop, 3)
  t.is(c.turn, 3, 'one board event can be the first state of more than one street')
  t.is(c.river, 3)
})

test('an empty hand still offers pre-flop and nothing else', (t) => {
  t.deepEqual(streetCursors([]), { preflop: 0, flop: null, turn: null, river: null })
})

// ── the cursor is a move into the list Back and Next already walk ──────────────────────────

test('Back from the river cursor is the state immediately before the river deal', (t) => {
  const river = streetCursors(played.events).river!
  const back = river - 1
  t.deepEqual(boardAt(played, back), TURN, 'the river card is not out yet')
  t.is(played.events[river - 1].kind, 'board', 'the step just taken was the river deal')
})

test('Next from the flop cursor advances one state — the first flop action', (t) => {
  const flop = streetCursors(played.events).flop!
  const next = played.events[flop]
  t.is(next.kind, 'action')
  if (next.kind === 'action') t.is(next.type, 'check')
})

test('Next from a street with no action of its own is the deal that follows it', (t) => {
  const events: HandEvent[] = [
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'call', amount: 200 },
    { kind: 'board', label: 'Flop', cards: FLOP },
    { kind: 'board', label: 'Turn', cards: TURN },
  ]
  const flop = streetCursors(events).flop!
  t.deepEqual(events[flop], { kind: 'board', label: 'Turn', cards: TURN })
})

// ── the pot ────────────────────────────────────────────────────────────────────────────────

test('before anybody acts the pot is the two blinds', (t) => {
  t.is(potAt(played, 0), 150)
})

test('the pot at a street cursor is the total as of that deal', (t) => {
  const c = streetCursors(played.events)
  // Pre-flop: Ada to 300, Bo's 50 dead, Cy calls 200 over their 100 blind → 650.
  t.is(potAt(played, c.flop!), 650)
  // Flop: 400 apiece on top.
  t.is(potAt(played, c.turn!), 1450)
  // The turn was checked through.
  t.is(potAt(played, c.river!), 1450)
  // And the river bet lands in it.
  t.is(potAt(played, played.events.length), 1950)
})

test('a raise is the total a player is in for on the street, not chips on top', (t) => {
  const events: HandEvent[] = [
    { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'raise', amount: 300 },
    { kind: 'action', playerId: 'sb', playerName: 'Bo', type: 'raise', amount: 900 },
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'fold' },
    { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'call', amount: 600 },
  ]
  // Bo posted the small blind, so their 900 includes it: 900 + 900 + Cy's dead 100 = 1900.
  t.is(potAt(hand(events), events.length), 1900)
})

test('a blind poster raising is counted once, not twice', (t) => {
  const events: HandEvent[] = [
    { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'call', amount: 100 },
    { kind: 'action', playerId: 'sb', playerName: 'Bo', type: 'fold' },
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'raise', amount: 400 },
    { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'call', amount: 300 },
  ]
  // Cy's 400 is inclusive of the 100 already up: 400 + 400 + Bo's dead 50 = 850.
  t.is(potAt(hand(events), events.length), 850)
})

test('folds and checks move no chips', (t) => {
  const events: HandEvent[] = [
    { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'call', amount: 100 },
    { kind: 'action', playerId: 'sb', playerName: 'Bo', type: 'fold' },
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'check' },
    { kind: 'board', label: 'Flop', cards: FLOP },
    { kind: 'action', playerId: 'bb', playerName: 'Cy', type: 'check' },
    { kind: 'action', playerId: 'utg', playerName: 'Ada', type: 'check' },
  ]
  const record = hand(events)
  t.is(potAt(record, events.length), 250, 'the limp, the dead small blind and the big blind')
  t.is(potAt(record, 4), potAt(record, events.length), 'the flop changed nothing')
})

test('a hand that folds around to the big blind is still worth the blinds', (t) => {
  // Nobody voluntarily puts a chip in, and the big blind never acts — the one shape where the
  // pre-flop ordering cannot say who posted what. The total is the blinds either way.
  t.is(potAt(hand([{ kind: 'action', playerId: 'sb', playerName: 'Bo', type: 'fold' }]), 1), 150)
})

test('the pot never reads past the cursor', (t) => {
  const total = potAt(played, played.events.length)
  for (let step = 0; step <= played.events.length; step++) {
    t.true(potAt(played, step) <= total, `state ${step} is no bigger than the finished pot`)
  }
  t.is(potAt(played, -1), potAt(played, 0), 'a nonsense cursor reads as the start of the hand')
})
