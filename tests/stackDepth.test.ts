import test from 'ava'
import { stackDepth } from '@/lib/stackDepth'

test('depth is the chips behind, measured in big blinds', (t) => {
  // The acceptance case: 2,000 behind after 500 has already gone in at BB 100. The committed
  // chips are not part of the figure, for the same reason they are not part of the chip count —
  // they are in the pot, not in front of the player.
  t.is(stackDepth(2000, 100), '20.0bb')
  t.is(stackDepth(2450, 100), '24.5bb')
  t.is(stackDepth(150, 100), '1.5bb')
})

test('always one decimal place, so the line never changes width under a counting stack', (t) => {
  t.is(stackDepth(2000, 100), '20.0bb')
  t.is(stackDepth(2049, 100), '20.5bb')
  t.is(stackDepth(0, 100), '0.0bb')
})

test('no big blind, no line', (t) => {
  // Pre-deal, joining, between levels, a format with no blinds at all. Every one of these is a
  // moment where a depth figure would be a guess, so the seat says nothing rather than a
  // placeholder — a dash here is a number a player could act on.
  t.is(stackDepth(2000, 0), null)
  t.is(stackDepth(2000, null), null)
  t.is(stackDepth(2000, undefined), null)
  t.is(stackDepth(2000, -50), null)
  t.is(stackDepth(2000, Number.NaN), null)
})

test('a stack that is not a number is not a depth', (t) => {
  t.is(stackDepth(Number.NaN, 100), null)
  t.is(stackDepth(-1, 100), null)
})

test('the figure is derived, never remembered', (t) => {
  // Acceptance 3: a bb figure must never be seen next to a chip count it no longer matches. The
  // guarantee is structural — this is a pure function of the same two values the seat renders
  // from, with nothing cached between calls — and this test is what would catch a memo creeping
  // in later.
  t.is(stackDepth(2000, 100), '20.0bb')
  t.is(stackDepth(1500, 100), '15.0bb')
  t.is(stackDepth(1500, 200), '7.5bb')
  t.is(stackDepth(2000, 100), '20.0bb')
})
