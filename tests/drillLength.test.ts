import { readFileSync } from 'node:fs'
import test from 'ava'
import { DRILL_KINDS } from '@/config/drills'
import { handsLabel, minutesLabel, sessionMinutes } from '@/lib/drills/length'
import { isEnabled } from '@/lib/flags'

// How long a kind takes, on the room's tiles. The numbers are a typical run, not
// a cap — nothing in the drills counts down and this must not be the first thing
// that does (see the note at the top of config/drills.ts). So what these tests
// hold is that every kind carries an honest estimate, that the two halves of the
// line cannot disagree, and that the surface is still behind its flag.

test('every kind carries a session length', (t) => {
  for (const kind of DRILL_KINDS) {
    t.true(Number.isInteger(kind.sessionHands), `${kind.id} hands is a whole number of hands`)
    t.true(kind.sessionHands > 0, `${kind.id} takes at least one hand`)
    t.true(kind.secondsPerHand > 0, `${kind.id} has a pace`)
  }
})

test('the minutes are derived from the hands, so the row cannot contradict itself', (t) => {
  for (const kind of DRILL_KINDS) {
    t.is(sessionMinutes(kind), Math.round((kind.sessionHands * kind.secondsPerHand) / 60))
    t.true(sessionMinutes(kind) >= 1, `${kind.id} never reads "about 0 min"`)
  }
})

test('a short kind rounds up to a minute rather than down to nothing', (t) => {
  const sprint = { ...DRILL_KINDS[0], sessionHands: 2, secondsPerHand: 5 }
  t.is(sessionMinutes(sprint), 1)
  t.is(minutesLabel(sprint), 'about 1 min')
})

test('both halves of the line say their unit in words', (t) => {
  const kind = { ...DRILL_KINDS[0], sessionHands: 12, secondsPerHand: 15 }
  // Never colour or a bare number alone: the chip has to read as hands and the
  // estimate as minutes with nothing else on the row to explain them.
  t.is(handsLabel(kind), '12 hands')
  t.is(minutesLabel(kind), 'about 3 min')
  t.is(handsLabel({ ...kind, sessionHands: 1 }), '1 hand')
})

test('the length line is behind a flag that is off in both environments', (t) => {
  const raw = JSON.parse(
    readFileSync(new URL('../flags.json', import.meta.url), 'utf-8'),
  ) as Record<string, { stage: boolean; prod: boolean }>
  t.truthy(raw['drill-length'], 'the surface has a flag at all')
  t.false(isEnabled('drill-length', 'stage'))
  t.false(isEnabled('drill-length', 'prod'))
})
