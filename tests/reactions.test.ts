import test from 'ava'
import { type Outcome, REACTIONS, botReaction, reactionByKey } from '@/lib/reactions'

test('every reaction carries a word, not just a glyph', (t) => {
  // The word is the content. An emoji alone is unreadable to a screen reader and renders
  // differently on every platform, so a reaction without one would say nothing at all.
  for (const r of REACTIONS) {
    t.true(r.word.trim().length > 0, `${r.key} has a word`)
    t.true(r.emoji.length > 0, `${r.key} has a glyph`)
  }
  const keys = REACTIONS.map((r) => r.key)
  t.is(new Set(keys).size, keys.length, 'keys are unique')
})

test('a key nobody defined resolves to nothing, not a crash', (t) => {
  t.is(reactionByKey('not-a-reaction'), null)
  t.is(reactionByKey(''), null)
  t.is(reactionByKey('clap')?.word, 'nice hand')
})

test('an opponent shows the same face for the same hand, every time', (t) => {
  // Determinism is the whole reason this is a hash and not Math.random(): a re-render, a resumed
  // snapshot and a screenshot of the same hand must agree.
  for (let i = 0; i < 50; i++) {
    const a = botReaction('villain-2', i, 'won')
    const b = botReaction('villain-2', i, 'won')
    t.deepEqual(a, b)
  }
})

test('the outcome decides what can be said', (t) => {
  // Nobody claps at a pot they just lost, and nobody winces at one they won.
  const pools: Record<Outcome, string[]> = {
    won: ['clap', 'laugh'],
    lost: ['wince', 'think'],
    folded: ['think', 'wince'],
  }
  for (const [outcome, allowed] of Object.entries(pools) as [Outcome, string[]][]) {
    for (let i = 0; i < 200; i++) {
      const r = botReaction(`seat-${i % 7}`, i, outcome)
      if (r) t.true(allowed.includes(r.key), `${outcome} may not say ${r.key}`)
    }
  }
})

test('most hands pass in silence', (t) => {
  // Rationing is the feature, the same way table talk is rationed. A table where every seat
  // reacts to every hand is noise, and the check that would catch losing it is this one.
  let spoke = 0
  const total = 600
  for (let i = 0; i < total; i++) {
    if (botReaction(`seat-${i % 5}`, i, i % 2 ? 'won' : 'lost')) spoke++
  }
  t.true(spoke > 0, 'somebody reacts')
  t.true(spoke < total / 2, `fewer than half of the chances are taken (was ${spoke}/${total})`)
})

test('every reaction a bot can pick is in the vocabulary', (t) => {
  for (let i = 0; i < 300; i++) {
    const r = botReaction(`seat-${i}`, i, 'folded')
    if (r) t.true(REACTIONS.includes(r))
  }
})
