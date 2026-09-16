// The session recap for one sitting at a cash table (lib/sitting).
//
// What these pin is the arithmetic and the delivery, because both are claims made to a player
// about chips: the net result must count every rebuy (not just the first buy-in), a sitting with
// nothing in it must still report zeros rather than vanish, and a recap written while nobody was
// watching must survive the trip through localStorage intact.
//
// What they cannot cover is store/game calling this — that needs a browser. The store's part is
// two lines: `endSitting` at forfeiture only, and the sitting's counters riding in the table
// snapshot so a resumed seat continues the same sitting.

import test from 'ava'
import { buildSittingRecap, netResult, parseSitting, type Sitting } from '@/lib/sitting'

const sitting = (over: Partial<Sitting> = {}): Sitting => ({
  venueName: 'The Rail',
  hands: 42,
  biggestPot: 1200,
  invested: 100,
  cashOut: 100,
  ...over,
})

const stat = (s: Sitting, label: string) =>
  buildSittingRecap(s).stats.find((x) => x.label === label)?.value

test('the recap reports hands played, the biggest pot won and a signed net result', (t) => {
  const s = sitting({ hands: 42, biggestPot: 1200, invested: 100, cashOut: 340 })
  t.is(stat(s, 'Hands'), '42')
  t.is(stat(s, 'Biggest pot'), '1,200')
  t.is(stat(s, 'Net'), '+240')
})

test('every rebuy counts against the cash-out: 100 in, 100 more, 150 out reads -50', (t) => {
  // The sitting the spec names: the top-up is part of what the seat cost, so reporting
  // 150 against the first buy-in alone would tell the player they won 50 on a losing session.
  const s = sitting({ invested: 200, cashOut: 150 })
  t.is(netResult(s), -50)
  t.is(stat(s, 'Net'), '-50')
})

test('breaking even reads as 0 rather than as a sign', (t) => {
  t.is(stat(sitting({ invested: 500, cashOut: 500 }), 'Net'), '0')
})

test('a sitting with no hands dealt reports zeros rather than being suppressed', (t) => {
  // Sitting down and standing straight back up is a real sitting with a real (zero) result.
  // Suppressing it would leave the player wondering whether the seat had cost them anything.
  const s = sitting({ hands: 0, biggestPot: 0, invested: 100, cashOut: 100 })
  const recap = buildSittingRecap(s)
  t.is(recap.stats.length, 3)
  t.is(stat(s, 'Hands'), '0')
  t.is(stat(s, 'Biggest pot'), '0')
  t.is(stat(s, 'Net'), '0')
})

test('a sitting nobody watched end survives the trip to storage and back', (t) => {
  // Acceptance 3: the tab died mid-sitting, the recap was written anyway, and the player is
  // handed it at next login. Nothing is recomputed on the way out — these are the same facts.
  const s = sitting({ hands: 7, biggestPot: 900, invested: 300, cashOut: 120 })
  t.deepEqual(parseSitting(JSON.stringify(s)), s)
  t.is(stat(parseSitting(JSON.stringify(s)) as Sitting, 'Net'), '-180')
})

test('a stored record that is missing or damaged is no recap at all', (t) => {
  // Fail-closed: a screen telling somebody they are NaN chips down is worse than no screen.
  t.is(parseSitting(null), null)
  t.is(parseSitting('not json'), null)
  t.is(parseSitting('[]'), null)
  t.is(parseSitting(JSON.stringify({ ...sitting(), cashOut: 'lots' })), null)
  t.is(parseSitting(JSON.stringify({ ...sitting(), invested: Number.NaN })), null)
  t.is(parseSitting(JSON.stringify({ hands: 3 })), null)
})
