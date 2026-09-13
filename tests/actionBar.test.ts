import { readFileSync } from 'node:fs'
import test from 'ava'

// The action bar is presentation, so there is nothing to call. What can be
// pinned is the copy and the shape of the row it sits in, both of which are
// the whole of this change.
const source = readFileSync(
  new URL('../src/components/table/ActionBar.tsx', import.meta.url),
  'utf-8',
)

test('the fold button names what it folds', (t) => {
  // "Fold" alone leaves the object to the player. The bar's other two labels
  // already say what happens ("Check", "Call 4,000"); this one now does too.
  t.regex(source, />\s*Fold hand\s*</, 'the fold button no longer reads "Fold hand"')
  t.notRegex(source, />\s*Fold\s*</, 'a bare "Fold" label is back on the bar')
})

test('fold stays the quietest control on the row', (t) => {
  // The design pack refuses a loud fold: a product that shouts fold is
  // steering the player. The label got longer, the tone must not.
  const fold = source.split('Fold hand')[0]
  t.regex(fold.slice(-200), /tone="ghost"/, 'the fold button is no longer the ghost tone')
})

test('the bar is still one row of three', (t) => {
  // The picked wireframe keeps fold inline with check/call and bet/raise —
  // the longer label does not earn it a row or a confirmation step of its own.
  t.true(
    source.includes('className="flex gap-2"'),
    'the action row stopped being a single flex row',
  )
  t.is(source.split("act({ type: 'fold' })").length - 1, 1, 'folding gained a second code path')
})
