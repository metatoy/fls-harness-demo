import { readFileSync } from 'node:fs'
import test from 'ava'
import {
  activeOverrides,
  type Env,
  flagEnabled,
  flags,
  isEnabled,
  mergeOverrides,
  overridesFromQuery,
} from '@/lib/flags'

// flags.json is not just this app's config: the ladder's rung 5 writes it when a change is signed
// off (FlagStore, engine/src/fls/rung5.py, `{flag: {stage: bool, prod: bool}}`). So its shape is a
// contract with something outside this repository, and a malformed entry here would be read by the
// engine rather than caught by a type. That is what the first test is for.

const raw = JSON.parse(readFileSync(new URL('../flags.json', import.meta.url), 'utf-8')) as Record<
  string,
  unknown
>

test('every entry in flags.json is a flag the engine can read', (t) => {
  for (const [name, value] of Object.entries(raw)) {
    if (name.startsWith('_')) {
      t.is(typeof value, 'string', `${name} is a note, so it holds a string`)
      continue
    }
    t.true(
      typeof value === 'object' && value !== null && !Array.isArray(value),
      `${name} is an object`,
    )
    const state = value as Record<string, unknown>
    // Both environments, always. rung 5 sets one at a time and reads the other back, so an entry
    // carrying only the environment somebody happened to flip is a half-written flag.
    t.is(typeof state.stage, 'boolean', `${name}.stage is a boolean`)
    t.is(typeof state.prod, 'boolean', `${name}.prod is a boolean`)
    t.is(Object.keys(state).length, 2, `${name} carries stage and prod and nothing else`)
  }
})

test('a flag nobody has turned on is off in both environments', (t) => {
  // The default that matters. A surface behind a flag that does not exist yet stays hidden rather
  // than throwing or, worse, defaulting to visible.
  for (const env of ['stage', 'prod'] as Env[]) {
    t.false(isEnabled('a-flag-that-does-not-exist', env))
    t.false(flagEnabled(flags, 'a-flag-that-does-not-exist', env))
  }
})

test('only an explicit true is on', (t) => {
  const source = {
    on: { stage: true, prod: false },
    off: { stage: false, prod: false },
    // Every one of these is something a hand-edit or a bad write could produce. None of them may
    // read as "on": the failure that matters is a surface appearing before someone meant it to.
    stringy: { stage: 'true' as unknown as boolean, prod: false },
    numeric: { stage: 1 as unknown as boolean, prod: false },
    partial: { prod: true },
  }
  t.true(flagEnabled(source, 'on', 'stage'))
  t.false(flagEnabled(source, 'on', 'prod'))
  t.false(flagEnabled(source, 'off', 'stage'))
  t.false(flagEnabled(source, 'stringy', 'stage'))
  t.false(flagEnabled(source, 'numeric', 'stage'))
  t.false(flagEnabled(source, 'partial', 'stage'), 'a missing environment is off, not undefined')
  t.true(flagEnabled(source, 'partial', 'prod'))
})

test('a missing or malformed source is off, not a crash', (t) => {
  t.false(flagEnabled(null, 'anything', 'stage'))
  t.false(flagEnabled(undefined, 'anything', 'prod'))
  t.false(flagEnabled({}, 'anything', 'stage'))
})

test('notes in flags.json are not flags', (t) => {
  // `_comment` documents the shape inside the file the engine writes. It must never be mistaken
  // for a flag by anything that iterates.
  t.true('_comment' in raw)
  t.false('_comment' in flags)
})

// ── runtime overrides ──────────────────────────────────────────────────────────────────────
//
// A flag is read when the app is BUILT, so seeing a new surface on stage otherwise means editing
// a file, pushing, and waiting for a deploy — a long way round for the thing a reviewer does
// most. `?flags-table-reactions=true` is the short way.

test('a query string expresses overrides in both directions', (t) => {
  const got = overridesFromQuery('?flags-table-reactions=true&flags-other=false&unrelated=1')
  t.deepEqual(got, { 'table-reactions': true, other: false })
})

test('an empty value forgets an override rather than setting it false', (t) => {
  // `?flags-x=` means "go back to whatever was committed", which is a different answer from
  // "off" — a flag committed ON would otherwise be impossible to return to from a URL.
  t.deepEqual(overridesFromQuery('?flags-x='), { x: null })
  t.deepEqual(mergeOverrides({ x: true, y: true }, { x: null }), { y: true })
})

test('merging leaves untouched flags alone', (t) => {
  t.deepEqual(mergeOverrides({ a: true }, { b: false }), { a: true, b: false })
})

test('the prefix is required, so ordinary query params are not flags', (t) => {
  t.deepEqual(overridesFromQuery('?table-reactions=true&flags-=true'), {})
})

// The browser half. AVA runs in Node, so a minimal window is stood up — enough to prove the
// merge, the persistence, and the one rule that actually matters.
function withWindow(search: string, seed: Record<string, boolean> = {}) {
  const store = new Map<string, string>()
  if (Object.keys(seed).length) store.set('fls.flag-overrides', JSON.stringify(seed))
  ;(globalThis as unknown as { window: unknown }).window = {
    location: { search },
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  }
  return {
    store,
    done: () => {
      delete (globalThis as unknown as { window?: unknown }).window
    },
  }
}

test('PRODUCTION IGNORES OVERRIDES', (t) => {
  // This repository's standard is that every new surface ships off in BOTH environments until a
  // human turns it on. A URL that switched one on in prod would make that standard decorative:
  // anyone holding the link would be running unreleased code. Reviewing happens on stage.
  const w = withWindow('?flags-table-reactions=true')
  try {
    t.deepEqual(activeOverrides('prod'), {})
    t.false(isEnabled('table-reactions', 'prod'))
  } finally {
    w.done()
  }
})

test('on stage an override wins over the committed flag, and is remembered', (t) => {
  const w = withWindow('?flags-invented-for-this-test=true')
  try {
    t.true(isEnabled('invented-for-this-test', 'stage'))
    t.is(w.store.get('fls.flag-overrides'), JSON.stringify({ 'invented-for-this-test': true }))
  } finally {
    w.done()
  }
})

test('a remembered override survives a page with no query string', (t) => {
  // The whole reason it is stored: this is a multi-page static export, and a query string does
  // not outlive a link click.
  const w = withWindow('', { 'invented-for-this-test': true })
  try {
    t.true(isEnabled('invented-for-this-test', 'stage'))
  } finally {
    w.done()
  }
})

test('an override can turn a flag OFF as well as on', (t) => {
  const w = withWindow('?flags-invented-for-this-test=false', { 'invented-for-this-test': true })
  try {
    t.false(isEnabled('invented-for-this-test', 'stage'))
  } finally {
    w.done()
  }
})

test('prerender has no window and asks the committed flags', (t) => {
  t.deepEqual(activeOverrides('stage'), {})
})

test('flags-reset forgets everything, and is not itself a flag', (t) => {
  // Without the second half, `?flags-reset` would clear the store and then immediately set an
  // override on a flag called "reset".
  t.deepEqual(overridesFromQuery('?flags-reset'), {})
  const w = withWindow('?flags-reset', { 'invented-for-this-test': true })
  try {
    t.deepEqual(activeOverrides('stage'), {})
    t.is(w.store.get('fls.flag-overrides'), undefined)
  } finally {
    w.done()
  }
})
