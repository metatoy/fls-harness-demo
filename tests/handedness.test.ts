import test from 'ava'
import { actionRowOrder, mirrorRow, settleHandedness } from '@/lib/handedness'

test('right-handed is the row as authored', (t) => {
  // The default: thumb origin bottom-right, Fold farthest from it in slot 0.
  t.deepEqual(actionRowOrder(['fold', 'check-call', 'bet-raise'], false), [
    'fold',
    'check-call',
    'bet-raise',
  ])
  t.deepEqual(actionRowOrder(['fold', 'check-call', 'bet-raise', 'all-in'], false), [
    'fold',
    'check-call',
    'bet-raise',
    'all-in',
  ])
})

test('left-handed puts Bet-Raise in the slot nearest the thumb', (t) => {
  // Acceptance 1. Slot 0 is the bottom-left corner once the row is mirrored.
  t.deepEqual(actionRowOrder(['fold', 'check-call', 'bet-raise'], true), [
    'bet-raise',
    'check-call',
    'fold',
  ])
})

test('left-handed keeps Fold farthest from the thumb, whatever the row length', (t) => {
  // Acceptance 2. The invariant, not the mirror, decides where Fold lands: mirroring an extended
  // row is what would otherwise slide the one irreversible action under the thumb.
  for (const row of [
    ['fold', 'check-call', 'bet-raise'],
    ['fold', 'check-call', 'bet-raise', 'all-in'],
    ['fold', 'check-call', 'bet-raise', 'check-fold'],
    ['fold', 'check-call'],
    ['fold'],
  ]) {
    const ordered = actionRowOrder(row, true)
    t.is(ordered.at(-1), 'fold')
    t.is(ordered.length, row.length)
    t.deepEqual([...ordered].sort(), [...row].sort())
  }
})

test('a row with no Fold in it is simply the mirror', (t) => {
  t.deepEqual(actionRowOrder(['check-call', 'bet-raise'], true), ['bet-raise', 'check-call'])
})

test('mirroring is horizontal only, and only when the setting is on', (t) => {
  // Acceptance 4: Confirm left of Cancel. Authored order is Cancel then Confirm, so the mirror
  // is the whole mechanism for a two-button dialog — and it moves the DOM, not just the paint,
  // so reading order and tab order still match what the eye sees.
  t.deepEqual(mirrorRow(['cancel', 'confirm'], true), ['confirm', 'cancel'])
  t.deepEqual(mirrorRow(['cancel', 'confirm'], false), ['cancel', 'confirm'])
  const row = ['cancel', 'confirm']
  mirrorRow(row, true)
  t.deepEqual(row, ['cancel', 'confirm'], 'the caller’s array is never reordered in place')
})

test('a hand in progress keeps the layout it was dealt with', (t) => {
  // Acceptance 5. Flipping mid-hand would move the button under a thumb already on its way to
  // it, which is a misfire on the one control that cannot be taken back.
  const dealt = settleHandedness({ leftHanded: false, handIndex: 7 }, false, 7)
  t.deepEqual(dealt, { leftHanded: false, handIndex: 7 })
  const flippedMidHand = settleHandedness(dealt, true, 7)
  t.deepEqual(flippedMidHand, { leftHanded: false, handIndex: 7 })
})

test('the next hand adopts the setting', (t) => {
  const midHand = settleHandedness({ leftHanded: false, handIndex: 7 }, true, 7)
  t.deepEqual(settleHandedness(midHand, true, 8), { leftHanded: true, handIndex: 8 })
})

test('a hand boundary with no change is the same object, so nothing re-renders on it', (t) => {
  const applied = { leftHanded: true, handIndex: 8 }
  t.is(settleHandedness(applied, true, 9).leftHanded, true)
  t.is(settleHandedness(applied, true, 8), applied)
})
