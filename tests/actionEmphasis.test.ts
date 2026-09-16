import { readdirSync, readFileSync, statSync } from 'node:fs'
import test from 'ava'
import {
  ACTION_EMPHASIS_FLAG,
  ACTION_ORDER,
  ACTION_VARIANT,
  type ActionKind,
} from '@/lib/actionEmphasis'
import { flagEnabled } from '@/lib/flags'

// The three in-hand buttons are the one place on the felt where a player is under a clock, so
// what is tested here is hierarchy: that the three are told apart by fill, that they are the
// biggest controls in the hand, and that the row cannot push the table sideways. None of it is
// visible to a type, and all of it is the kind of thing a later edit walks over quietly — the
// value written in a stylesheet is exactly where nobody looks.

const GLOBALS = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf-8')
const TOKENS = readFileSync(new URL('../design-system/tokens.app.css', import.meta.url), 'utf-8')
const ACTION_BAR = readFileSync(
  new URL('../src/components/table/ActionBar.tsx', import.meta.url),
  'utf-8',
)
const flagsRaw = JSON.parse(
  readFileSync(new URL('../flags.json', import.meta.url), 'utf-8'),
) as Record<string, { stage: boolean; prod: boolean }>

/** The body of one CSS rule in globals.css, by its exact selector, comments stripped. */
function rule(selector: string): string {
  const at = GLOBALS.indexOf(`${selector} {`)
  if (at === -1) return ''
  const open = GLOBALS.indexOf('{', at)
  return GLOBALS.slice(open + 1, GLOBALS.indexOf('}', open)).replace(/\/\*[\s\S]*?\*\//g, '')
}

/** One declaration out of a rule body, trimmed. */
function decl(body: string, property: string): string {
  const line = body.split(';').find((d) => d.trim().startsWith(`${property}:`))
  return line ? line.slice(line.indexOf(':') + 1).trim() : ''
}

/** A `--ns-*` token's value, as the generated token layer defines it. */
function token(name: string): string {
  return TOKENS.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim() ?? ''
}

/**
 * Every `<button …>` opening tag in a source file.
 *
 * Written out rather than done with a regex because a JSX tag is full of `>`: the first one in
 * `onClick={() => …}` ends a lazy match long before the className, which is the very attribute
 * this is looking at. So the scan tracks brace depth and stops at the `>` that is really the
 * tag's.
 */
function openingTags(source: string): string[] {
  const tags: string[] = []
  for (const match of source.matchAll(/<button\b/g)) {
    const start = match.index
    let depth = 0
    for (let i = start; i < source.length; i++) {
      const ch = source[i]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '>' && depth === 0) {
        tags.push(source.slice(start, i + 1))
        break
      }
    }
  }
  return tags
}

const TONES = ACTION_ORDER.map(
  (kind) => [kind, rule(`.pip-actions [data-action="${kind}"]`)] as const,
)

test('the emphasis is a new surface, so it ships behind a flag that is off in both places', (t) => {
  t.truthy(flagsRaw[ACTION_EMPHASIS_FLAG], `flags.json is missing ${ACTION_EMPHASIS_FLAG}`)
  for (const env of ['stage', 'prod'] as const) {
    t.false(flagEnabled(flagsRaw, ACTION_EMPHASIS_FLAG, env))
  }
  // With it off the bar is exactly what it was: the old pills, untouched.
  t.true(ACTION_BAR.includes("emphasised ? 'pip-actions' : 'flex gap-2'"))
  t.true(ACTION_BAR.includes('function Pill('), 'the unflagged bar still has its buttons')
})

test('each of the three actions has a tone, and they are different tones', (t) => {
  for (const [kind, body] of TONES) {
    t.not(body, '', `no tone for ${kind}`)
    t.not(decl(body, 'background'), '', `${kind} does not say what ground it sits on`)
  }
  const backgrounds = TONES.map(([, body]) => decl(body, 'background'))
  t.is(new Set(backgrounds).size, TONES.length, 'two actions share a fill')
})

test('the raise is the only solid fill, the call is the outline, the fold has no green', (t) => {
  const raise = rule('.pip-actions [data-action="raise"]')
  t.is(decl(raise, 'background'), 'var(--action)')
  t.is(decl(raise, 'color'), 'var(--action-foreground)')

  const call = rule('.pip-actions [data-action="call"]')
  t.is(decl(call, 'background'), 'transparent', 'an outline is not a fill')
  t.is(decl(call, 'border-color'), 'var(--action)')
  t.is(decl(call, 'border-width'), 'var(--ns-border-strong)', 'a hairline is not an outline')
  // The label keeps the page's own ink: green text on a neutral ground is the half of this that
  // fails a contrast floor, and the word "Call" plus its price is what carries the meaning.
  t.is(decl(call, 'color'), 'var(--foreground)')

  const fold = rule('.pip-actions [data-action="fold"]')
  t.false(fold.includes('--action'), 'fold is the neutral one — it wears no green at all')
  t.is(decl(fold, 'color'), 'var(--muted-foreground)')
})

test('the signal colour is not spent on the bar', (t) => {
  // --ns-signal means "the clock is waiting on you" and nothing else. On this bar that is true
  // of all three buttons at once, so painting one of them with it would say something false.
  // The focus ring is the system's own convention and is the one allowed use.
  for (const [kind, body] of TONES) {
    t.false(body.includes('--ns-signal'), `${kind} wears the signal colour`)
  }
  for (const kind of ACTION_ORDER) {
    t.not(ACTION_VARIANT[kind], 'act' as unknown, `${kind} asks for the accented variant`)
  }
  t.true(rule('.pip-actions .ns-btn:focus-visible').includes('--ns-signal'))
})

test('every action button is at least 56px tall', (t) => {
  const base = rule('.pip-actions .ns-btn')
  t.is(decl(base, 'min-height'), 'calc(var(--ns-tap) + var(--ns-s-3))')
  // Resolved against the generated token layer, because the point is the pixels, not the calc.
  const px = (v: string) => Number.parseFloat(v.replace('px', ''))
  t.is(px(token('--ns-tap')) + px(token('--ns-s-3')), 56)
  t.true(px(token('--ns-tap')) >= 44, 'the tap floor itself must still hold')
})

test('the label is 18px and bold, and sized in rem so the text setting reaches it', (t) => {
  const base = rule('.pip-actions .ns-btn')
  const size = decl(base, 'font-size')
  t.is(size, '1.125rem', '18px at the root size')
  t.false(size.includes('px'), 'a px font size is frozen whatever the reader set')
  t.is(decl(base, 'font-weight'), '700')
  // The Button's `font:` shorthand would otherwise pull in a face this app never loads.
  t.is(decl(base, 'font-family'), 'inherit')
})

test('no other in-hand control has a bigger or bolder label', (t) => {
  // Acceptance: the action buttons are the loudest controls in the hand. A figure may be larger
  // — the pot is not something you press — but nothing you can press may out-shout them.
  const SIZES = [
    'text-3xs',
    'text-2xs',
    'text-xs',
    'text-sm',
    'text-md',
    'text-base',
    'text-lg',
    'text-xl',
    'text-2xl',
    'text-3xl',
    'text-4xl',
  ]
  const WEIGHTS = [
    'font-thin',
    'font-extralight',
    'font-light',
    'font-normal',
    'font-medium',
    'font-semibold',
    'font-bold',
    'font-extrabold',
    'font-black',
  ]
  const offenders: string[] = []
  const dir = new URL('../src/components/table/', import.meta.url)
  for (const name of readdirSync(dir)) {
    const file = new URL(name, dir)
    if (statSync(file).isDirectory() || !name.endsWith('.tsx')) continue
    const source = readFileSync(file, 'utf-8')
    for (const tag of openingTags(source)) {
      // Every class named anywhere in the opening tag, including the arms of a `cn()`.
      const classes = [...tag.matchAll(/["'`]([^"'`]*)["'`]/g)].flatMap(([, s]) => s.split(/\s+/))
      const size = Math.max(...classes.map((c) => SIZES.indexOf(c)))
      const weight = Math.max(...classes.map((c) => WEIGHTS.indexOf(c)))
      if (size > SIZES.indexOf('text-lg')) offenders.push(`${name}: ${SIZES[size]}`)
      if (weight > WEIGHTS.indexOf('font-bold')) offenders.push(`${name}: ${WEIGHTS[weight]}`)
    }
  }
  t.deepEqual(offenders, [], `these controls out-shout the action bar:\n${offenders.join('\n')}`)
})

test('the row is equal thirds that can shrink, so the table never scrolls sideways', (t) => {
  t.is(decl(rule('.pip-actions'), 'display'), 'flex')
  const base = rule('.pip-actions .ns-btn')
  t.is(decl(base, 'flex'), '1 1 0', 'equal thirds, per the wireframe')
  // The one that matters: without min-width:0 a flex item refuses to go below its content, so a
  // long label ("Call 12,000") pushes the row wider than the felt and the whole table scrolls.
  t.is(decl(base, 'min-width'), '0')
  t.is(decl(base, 'white-space'), 'normal', 'the label wraps rather than dropping the amount')
  t.false(ACTION_BAR.includes('whitespace-nowrap'))
})

test('the bar is composed from the design system, not hand-rolled', (t) => {
  t.true(ACTION_BAR.includes('design-system/night-shift/components/core/Button.jsx'))
  for (const kind of ACTION_ORDER) {
    t.true(ACTION_BAR.includes(`data-action="${kind}"`), `${kind} is not on the bar`)
  }
  // Fold sits at the quiet end and is first in the row, so the commitment is furthest from the
  // thumb's resting reach and the least loud control is never the accented one.
  t.deepEqual([...ACTION_ORDER], ['fold', 'call', 'raise'] as ActionKind[])
  t.is(ACTION_VARIANT.fold, 'fold')
})

test('nothing in the bar is coloured with a literal', (t) => {
  // Every value traces to a token. The green is --ns-win, darkened toward the page's own ink on
  // the light theme because the token layer authored it for a dark room.
  const bodies = [
    rule('.pip-actions'),
    rule('.pip-actions .ns-btn'),
    ...TONES.map(([, body]) => body),
  ]
  for (const body of bodies) {
    t.false(/#[0-9a-f]{3,8}\b/i.test(body), `a literal colour: ${body.trim()}`)
    t.false(/\b(rgb|hsl)a?\(/.test(body), `a literal colour: ${body.trim()}`)
  }
  t.true(GLOBALS.includes('--action: var(--ns-win)'), 'dark uses the token as written')
  t.true(GLOBALS.includes('--action: color-mix(in oklab, var(--ns-win) 55%, var(--foreground))'))
})
