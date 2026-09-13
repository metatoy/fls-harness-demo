import { readFileSync } from 'node:fs'
import test from 'ava'
import {
  FOUR_COLOUR_DECK_BOOT_SCRIPT,
  FOUR_COLOUR_DECK_CLASS,
  FOUR_COLOUR_DECK_KEY,
  parseFourColourDeck,
} from '@/lib/fourColourDeck'
import { flagEnabled, flags } from '@/lib/flags'

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf-8')
const card = readFileSync(new URL('../src/components/PlayingCard.tsx', import.meta.url), 'utf-8')

/** A `--name: #rrggbb;` declaration anywhere in globals.css. */
function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`globals.css has no --${name}`)
  return match[1].trim()
}

// --- the stored preference -------------------------------------------------

test('anything but the string "true" loads the deck off', (t) => {
  // Acceptance 5: garbage in localStorage must not throw and must not leave the
  // player looking at a deck they did not ask for. Only one value is on.
  t.true(parseFourColourDeck('true'))
  for (const junk of [null, undefined, '', 'false', '{}', 'TRUE', '1', 'yes', '  true  ']) {
    t.false(parseFourColourDeck(junk))
  }
  t.is(FOUR_COLOUR_DECK_KEY, 'fourColourDeck')
})

test('the boot script sets the class before first paint, and never throws', (t) => {
  const run = (localStorage: { getItem: (k: string) => string | null }): string[] => {
    const classes: string[] = []
    const documentElement = { classList: { add: (c: string) => classes.push(c) } }
    new Function('localStorage', 'document', FOUR_COLOUR_DECK_BOOT_SCRIPT)(localStorage, {
      documentElement,
    })
    return classes
  }

  // Acceptance 4: enabled, then reloaded, the class is on before anything draws.
  t.deepEqual(run({ getItem: () => 'true' }), [FOUR_COLOUR_DECK_CLASS])
  // Acceptance 1 and 5: nothing stored, and garbage stored, both boot clean.
  for (const stored of [null, 'false', 'kaboom']) {
    t.deepEqual(run({ getItem: () => stored }), [])
  }
  // Storage disabled (private browsing throws on read) is still a loading app.
  t.notThrows(() =>
    run({
      getItem: () => {
        throw new Error('storage disabled')
      },
    }),
  )
})

// --- the colours -----------------------------------------------------------

/** WCAG relative luminance of a `#rgb`/`#rrggbb` value. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(full.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('every four-colour suit clears 4.5:1 against the card face', (t) => {
  // The point of the setting is reading a suit faster, so the ink has to be
  // legible before it is anything else. The brand red (--color-suit-red, ~3.3:1)
  // is why this palette exists separately rather than borrowing the shop face's.
  const face = token('color-cardface')
  for (const suit of ['spade', 'heart', 'diamond', 'club']) {
    const ink = token(`color-deck4-${suit}`)
    t.true(
      contrast(ink, face) >= 4.5,
      `${suit} ${ink} is ${contrast(ink, face).toFixed(2)}:1 on ${face}`,
    )
  }
  t.is(token('color-deck4-diamond'), '#0b63ce')
  t.is(token('color-deck4-club'), '#077a3b')
})

test('off, the suit ink resolves to exactly what it was before', (t) => {
  // Acceptance 1: no stored preference means no visible change anywhere, so the
  // defaults point at the same two tokens the card used to name directly.
  t.is(token('suit-h'), 'var(--color-suit-red)')
  t.is(token('suit-d'), 'var(--color-suit-red)')
  t.is(token('suit-s'), 'var(--color-cardface-ink)')
  t.is(token('suit-c'), 'var(--color-cardface-ink)')
})

test('the class re-points the properties, and that is the whole mechanism', (t) => {
  // Acceptances 2 and 3: one class on the root, four custom properties, so every
  // card in the document recolours in the same repaint — the table, the hole
  // cards, the discard and a hand-history panel that was already open. Nothing
  // re-deals and no component has to be told.
  const rule = css.split(`.${FOUR_COLOUR_DECK_CLASS} {`)[1]?.split('}')[0] ?? ''
  for (const [prop, value] of [
    ['--suit-s', 'var(--color-deck4-spade)'],
    ['--suit-h', 'var(--color-deck4-heart)'],
    ['--suit-d', 'var(--color-deck4-diamond)'],
    ['--suit-c', 'var(--color-deck4-club)'],
  ]) {
    t.true(rule.includes(`${prop}: ${value};`), `${prop} is not re-pointed`)
  }

  // And the card face names no colour of its own, or the class could not reach
  // the cards already on the table.
  t.false(/text-suit-red|text-cardface-ink/.test(card.split('FOUR_COLOUR_INK')[2] ?? card))
  for (const suit of ['s', 'h', 'd', 'c']) {
    t.true(card.includes(`suit-ink-${suit}`))
    t.true(css.includes(`.suit-ink-${suit} {`))
  }
})

test('the surface ships behind a flag that is off in both environments', (t) => {
  for (const env of ['stage', 'prod'] as const) {
    t.false(flagEnabled(flags, 'four-colour-deck', env))
  }
  t.truthy(flags['four-colour-deck'], 'the flag exists, so a human has something to turn on')
})
