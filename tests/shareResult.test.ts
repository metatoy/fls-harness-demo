// The share text (lib/shareResult). The share sheet is behind a flag, but the
// text is the part that leaves the app and is read by someone who was not
// there, so it is the part worth pinning.
//
// What these hold:
//   1. It says only what the results screen already said — same stats, same
//      sentences, no second reading of the run.
//   2. Play money stays play money: chips, never a currency symbol.
//   3. It is a pure function of the recap: no clock, no `location`, so the same
//      run shares the same way twice.

import test from 'ava'
import type { Recap } from '@/lib/recap'
import { SHARE_HEADLINE, buildShareText, shareBadge, shareUrl } from '@/lib/shareResult'

const recap = (over: Partial<Recap> = {}): Recap => ({
  stats: [
    { label: 'Finish', value: '3rd of 6' },
    { label: 'Hands', value: '30' },
    { label: 'Roll', value: '+12,400' },
  ],
  lines: [{ id: 'highlight', text: 'Your biggest pot was 8,000 chips, won with a flush.' }],
  ...over,
})

test('the share carries every stat the screen showed, and the recap lines under them', (t) => {
  const text = buildShareText(recap(), 'https://example.test')
  t.true(text.startsWith(SHARE_HEADLINE))
  t.true(text.includes('Finish 3rd of 6 · Hands 30 · Roll +12,400'))
  t.true(text.includes('Your biggest pot was 8,000 chips, won with a flush.'))
  t.true(text.endsWith('https://example.test'))
})

test('a recap with nothing to say still shares cleanly', (t) => {
  // Short runs make no claims (lib/recap's noise floors), so the lines can be
  // empty. That must not leave a blank line or a dangling separator.
  const text = buildShareText(recap({ lines: [] }), 'https://example.test')
  t.false(text.includes('\n\n'))
  t.is(text.split('\n').length, 3)
})

test('play money stays play money', (t) => {
  const text = buildShareText(recap(), 'https://example.test')
  t.false(text.includes('$'))
})

test('the same run shares the same way twice', (t) => {
  t.is(
    buildShareText(recap(), 'https://example.test'),
    buildShareText(recap(), 'https://example.test'),
  )
})

test('the link is the bare origin', (t) => {
  t.is(shareUrl('https://example.test/'), 'https://example.test')
  t.is(shareUrl('https://example.test///'), 'https://example.test')
  t.is(shareUrl('https://example.test'), 'https://example.test')
})

test('the badge says the finish in a word, and the tone only agrees with it', (t) => {
  t.deepEqual(shareBadge(recap()), { word: '3rd of 6', tone: 'neutral' })
  t.deepEqual(shareBadge(recap({ stats: [{ label: 'Finish', value: 'Won it' }] })), {
    word: 'Won it',
    tone: 'win',
  })
  // A recap without a Finish stat is not a crash and is not a claim.
  t.deepEqual(shareBadge(recap({ stats: [] })), { word: 'Played', tone: 'neutral' })
})
