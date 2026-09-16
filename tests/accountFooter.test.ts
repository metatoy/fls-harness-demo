import { readFileSync } from 'node:fs'
import test from 'ava'

// The change-password form's footer is a split row: Cancel keeps the left edge,
// "Save it" is pinned to the right edge, which is where a form's confirm is
// looked for. Two equal `flex-1` slabs said nothing about which was which.
//
// This is read off the source rather than off a render because the app has no
// DOM test setup (docs/development.md: UI is verified by running it). What the
// source can still pin is the three things the change is: the row is
// space-between, the buttons are sized to their label so the right one actually
// reaches the edge, and the DOM order is untouched so tab order still runs with
// the reading order.

const SOURCE = readFileSync(
  new URL('../src/components/settings/AccountDialog.tsx', import.meta.url),
  'utf-8',
)

/** One top-level `function X(` declaration, up to the next one. */
const declaration = (name: string): string => {
  const start = SOURCE.indexOf(`function ${name}(`)
  if (start < 0) throw new Error(`${name} is gone from AccountDialog`)
  const next = SOURCE.indexOf('\nfunction ', start + 1)
  return SOURCE.slice(start, next < 0 ? undefined : next)
}

/** The first row of buttons in a declaration: the `<div>` wrapping a `<button>`. */
const buttonRowClass = (body: string): string =>
  /<div className="([^"]*)">\s*<button/.exec(body)?.[1] ?? ''

test('the change-password footer pins Save to the right edge', (t) => {
  const row = buttonRowClass(declaration('ChangePassword'))
  t.true(row.includes('justify-between'), `footer row is "${row}"`)
  // Mirrored by the layout, never by reversing the children: `flex-row-reverse`
  // would put tab order and reading order at odds, which is the bug it looks
  // like a shortcut for.
  t.false(row.includes('flex-row-reverse'))
  t.false(row.includes('justify-end'))
})

test('the footer buttons keep their reading order and their 44px target', (t) => {
  const body = declaration('ChangePassword')
  t.true(body.indexOf('Cancel') < body.indexOf('Save it'), 'Cancel is still first in the DOM')
  // Both children sized to their label; a `flex-1` child would eat the space
  // `justify-between` needs to push the confirm to the edge.
  t.is(body.match(/className=\{edgeButton\}/g)?.length, 2)
  const edge = /const edgeButton = `([^`]*)`/.exec(SOURCE)?.[1] ?? ''
  t.false(edge.includes('flex-1'))
  t.true(edge.includes('px-'), 'an intrinsically sized button needs its own padding')
  t.true(SOURCE.includes('min-h-11'), 'the shared base still clears 44px')
})

test('the other confirm rows in the dialog are untouched', (t) => {
  // The delete-account confirm is a different question (a destructive pair, not
  // a form footer) and keeps its two equal halves.
  const row = buttonRowClass(declaration('Manage'))
  t.false(row.includes('justify-between'), `delete confirm row is "${row}"`)
})
