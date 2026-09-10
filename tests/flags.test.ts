import { readFileSync } from 'node:fs'
import test from 'ava'
import { type Env, flagEnabled, flags, isEnabled } from '@/lib/flags'

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
