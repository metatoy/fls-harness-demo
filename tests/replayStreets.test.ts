import test from 'ava'
import { streetMarkers } from '@/lib/replayStreets'
import { cardFromString } from '@/lib/poker/cards'
import type { HandEvent } from '@/store/game'

const cards = (...s: string[]) => s.map(cardFromString)

const raise: HandEvent = {
  kind: 'action',
  playerId: 'ai0',
  playerName: 'Vivienne',
  type: 'raise',
  amount: 90,
}
const call: HandEvent = {
  kind: 'action',
  playerId: 'hero',
  playerName: 'Will',
  type: 'call',
  amount: 90,
}
const check: HandEvent = { kind: 'action', playerId: 'hero', playerName: 'Will', type: 'check' }
const bet: HandEvent = {
  kind: 'action',
  playerId: 'ai0',
  playerName: 'Vivienne',
  type: 'bet',
  amount: 120,
}

const flop: HandEvent = { kind: 'board', label: 'Flop', cards: cards('Ah', '7d', '2c'), pot: 180 }
const turn: HandEvent = {
  kind: 'board',
  label: 'Turn',
  cards: cards('Ah', '7d', '2c', '9s'),
  pot: 420,
}
const river: HandEvent = {
  kind: 'board',
  label: 'River',
  cards: cards('Ah', '7d', '2c', '9s', 'Kh'),
  pot: 900,
}

test('a hand that ended pre-flop has no street to jump to', (t) => {
  // Acceptance 1. Nothing was dealt, so there is nothing to mark — an empty
  // track is the honest answer, not three greyed-out chips.
  t.deepEqual(streetMarkers([raise, call, { ...raise, type: 'fold' }]), [])
  t.deepEqual(streetMarkers([]), [])
})

test('a hand that ended on the flop marks the flop only', (t) => {
  // Acceptance 2: a street is reached when its cards were dealt, never because
  // the hand could in principle have got there.
  t.deepEqual(streetMarkers([raise, call, flop, check, bet]), [
    { label: 'Flop', step: 3, pot: 180 },
  ])
})

test('a marker lands on the street before anyone has acted on it', (t) => {
  // Acceptance 3/4: the step is the one where the board event is the last thing
  // shown, so the cards are out, the pot is the one entering the street, and
  // the first action of the street is next rather than already applied.
  const events = [raise, call, flop, check, bet, call, turn, check, bet, call, river, check]
  t.deepEqual(streetMarkers(events), [
    { label: 'Flop', step: 3, pot: 180 },
    { label: 'Turn', step: 7, pot: 420 },
    { label: 'River', step: 11, pot: 900 },
  ])
  // Stepping back from a marker is the state after the previous street's final
  // action (acceptance 5) — that falls out of the step being a boundary.
  t.is(events[7 - 2], call, 'the event before the turn marker is the last flop action')
})

test('a run-out marks every street it dealt, all at the one state that exists', (t) => {
  // Acceptance 6. Everyone is all in, so five cards arrive as a single beat:
  // there is no turn-with-four-cards state to jump to, and pretending otherwise
  // would show a pot and a board that never stood together. All three markers
  // point at the run-out, where the board is complete and Next is the showdown.
  const runout: HandEvent = {
    kind: 'board',
    label: 'Runout',
    cards: cards('Ah', '7d', '2c', '9s', 'Kh'),
    pot: 4000,
  }
  t.deepEqual(streetMarkers([raise, raise, call, runout]), [
    { label: 'Flop', step: 4, pot: 4000 },
    { label: 'Turn', step: 4, pot: 4000 },
    { label: 'River', step: 4, pot: 4000 },
  ])
})

test('a run-out from the flop leaves the flop where it was', (t) => {
  // The other shape: a real flop street, then the last two cards in one beat.
  const runout: HandEvent = {
    kind: 'board',
    label: 'Runout',
    cards: cards('Ah', '7d', '2c', '9s', 'Kh'),
    pot: 4000,
  }
  t.deepEqual(streetMarkers([raise, call, flop, bet, call, runout]), [
    { label: 'Flop', step: 3, pot: 180 },
    { label: 'Turn', step: 6, pot: 4000 },
    { label: 'River', step: 6, pot: 4000 },
  ])
})

test('a link made before the pot was carried still jumps, it just says no pot', (t) => {
  // Older permalinks have board events with no `pot`. The marker is still real
  // — the cards were dealt — and the figure is simply absent, because a pot
  // rebuilt from the event list here would be arithmetic nobody checked.
  const old: HandEvent = { kind: 'board', label: 'Flop', cards: cards('Ah', '7d', '2c') }
  t.deepEqual(streetMarkers([raise, call, old]), [{ label: 'Flop', step: 3 }])
})

test('a board event nobody can place is ignored', (t) => {
  // Fewer than three cards is not a street. Decoded links come from outside, so
  // the track refuses rather than inventing a chip with nowhere to go.
  const stray: HandEvent = { kind: 'board', label: 'Flop', cards: cards('Ah', '7d') }
  t.deepEqual(streetMarkers([stray, flop]), [{ label: 'Flop', step: 2, pot: 180 }])
})
