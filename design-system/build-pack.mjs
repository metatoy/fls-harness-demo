#!/usr/bin/env node
/**
 * Build the design pack from Night Shift.
 *
 * `night-shift/` is the design system as Claude Design holds it: CSS custom properties, a
 * stylesheet, and React components. This script turns its token layer into the three shapes the
 * rest of the pipeline needs, and nothing else is allowed to hand-maintain them:
 *
 *   tokens.dtcg.json   the token layer as DTCG, for the Sorb bridge and any token tool
 *   tokens.night.json  the flat committed TokenSet SorbProvider takes as `config.tokens`
 *   tokens.day.json    the day overlay, same shape (see the note on day mode in README.md)
 *   pack.json          tokens + components + rules, the bounded context a ladder rung reads
 *
 * The editorial half of pack.json — what a colour MEANS, what a component is FOR, what a builder
 * must not do — lives in pack.meta.json, because no parser can derive it. Everything else is
 * derived here so it cannot drift from the source. That drift is the failure this system is most
 * prone to: a specimen keeps looking correct while the shipped CSS rots underneath it.
 *
 * The script fails loudly rather than guessing:
 *   - a token whose name matches no group rule stops the build (add a rule, don't widen a regex);
 *   - a `var(--ns-…)` used anywhere in night-shift/ that no token defines stops the build;
 *   - a colour token with no role in pack.meta.json stops the build;
 *   - a component whose file is missing stops the build.
 *
 * Run: node design-system/build-pack.mjs [--check]
 * `--check` writes nothing and exits 1 if any artifact is out of date.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, 'night-shift')
const CHECK = process.argv.includes('--check')

// ─── CSS reading ────────────────────────────────────────────────────────────
// A hand-rolled scanner rather than a PostCSS dependency: the input is four small files this
// repository owns, and a build step nobody can read is its own kind of drift.

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Top-level rules in a stylesheet, with `@media` blocks recursed into and tagged.
 * @param {string} css
 * @param {string|null} media
 * @returns {{selector: string, media: string|null, body: string}[]}
 */
function rules(css, media = null) {
  const out = []
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open === -1) break
    // Statement at-rules (`@import url(…);`) end in a semicolon and carry no block, so the text
    // before a `{` can hold one. Take only what follows the last one, or typography.css's
    // @import swallows the `:root` that follows it and the whole type layer goes missing.
    const selector = css.slice(i, open).split(';').pop().trim()
    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const body = css.slice(open + 1, j - 1)
    if (selector.startsWith('@media')) out.push(...rules(body, selector.slice(6).trim()))
    else if (!selector.startsWith('@')) out.push({ selector, media, body })
    i = j
  }
  return out
}

/** Custom-property declarations in a rule body, in source order. */
function decls(body) {
  return [...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2].trim().replace(/\s+/g, ' '),
  ])
}

const tokenFiles = readdirSync(join(SRC, 'tokens'))
  .filter((f) => f.endsWith('.css'))
  .sort()

/** @type {Map<string, {value: string, file: string}>} */
const night = new Map()
/** @type {Map<string, string>} */
const day = new Map()
/** @type {Map<string, string>} */
const reduced = new Map()

for (const file of tokenFiles) {
  const css = stripComments(readFileSync(join(SRC, 'tokens', file), 'utf8'))
  for (const rule of rules(css)) {
    const isDay = /^:root\[data-theme=["']day["']\]$/.test(rule.selector)
    const isRoot = rule.selector === ':root'
    if (!isRoot && !isDay) continue
    for (const [name, value] of decls(rule.body)) {
      // A media-query override is NOT the token's value. The generated _ds_manifest.json in
      // Claude Design records --ns-m-state as 1ms for exactly this reason: it took the last
      // occurrence in the file, which is the prefers-reduced-motion collapse.
      if (rule.media) {
        if (/prefers-reduced-motion/.test(rule.media)) reduced.set(name, value)
        continue
      }
      if (isDay) day.set(name, value)
      else night.set(name, { value, file })
    }
  }
}

// ─── grouping ───────────────────────────────────────────────────────────────
// Ordered, explicit, and exhaustive. A token that matches nothing stops the build, because the
// alternative — an "other" bucket — is how a token quietly stops being part of the system.

/** @type {[RegExp, string[], (id: string) => string][]} */
const GROUPS = [
  [/^ns-(felt|ground|raised|raised-2|line|line-soft)$/, ['color', 'room'], (id) => id.slice(3)],
  [/^ns-(text|text-2|muted)$/, ['color', 'text'], (id) => id.slice(3)],
  [/^ns-signal$/, ['color', 'signal'], () => 'base'],
  [/^ns-signal-/, ['color', 'signal'], (id) => id.slice(10)],
  [/^ns-(win|lose|warn)(-ink)?$/, ['color', 'state'], (id) => id.slice(3)],
  [/^ns-(cardface|card-ink|card-back)$/, ['color', 'card'], (id) => id.slice(3)],
  [/^ns-suit-/, ['color', 'card'], (id) => id.slice(3)],
  [/^ns-chip-(1|5|25|100|500|1k|edge)$/, ['color', 'chip'], (id) => id.slice(8)],
  [/^ns-(ui|figure)$/, ['type', 'family'], (id) => id.slice(3)],
  [/^ns-t-/, ['type', 'scale'], (id) => id.slice(5)],
  [/^ns-track/, ['type', 'tracking'], (id) => (id === 'ns-track' ? 'base' : id.slice(9))],
  [/^ns-s-/, ['space', 'scale'], (id) => id.slice(5)],
  [/^ns-(tap|border|border-strong)$/, ['space', 'control'], (id) => id.slice(3)],
  [/^ns-r-/, ['radius'], (id) => id.slice(5)],
  [/^ns-lift-/, ['elevation'], (id) => id.slice(8)],
  [/^ns-(card-w|card-h|chip|chip-overlap)$/, ['table'], (id) => id.slice(3)],
  [/^ns-m-/, ['motion'], (id) => id.slice(5)],
]

function classify(id) {
  for (const [re, path, leaf] of GROUPS) if (re.test(id)) return { path, leaf: leaf(id) }
  fail(`token --${id} matches no group rule in build-pack.mjs. Add a rule; do not widen one.`)
}

// ─── DTCG typing ────────────────────────────────────────────────────────────
// Every $value is the exact CSS string, so this file is the truth for the custom-property layer
// and round-trips to it without a transform. That is a deliberate deviation from DTCG's typed
// value objects, declared at the root as `valueSyntax: "css"`. Where a value is a shorthand that
// DTCG models as a composite (typography, shadow) the parsed structure is provided alongside,
// under $extensions, rather than pretending the string is the composite.

const isColor = (v) => /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(/i.test(v)
const isDimension = (v) => /^-?[\d.]+(px|rem|em|%)$/.test(v)
const isDuration = (v) => /^[\d.]+m?s$/.test(v)
const isCubic = (v) => /^cubic-bezier\(/.test(v)

function dtcgType(id, value) {
  if (id.startsWith('ns-t-')) return 'typography'
  if (id.startsWith('ns-lift-')) return 'shadow'
  if (id === 'ns-ui' || id === 'ns-figure') return 'fontFamily'
  if (isColor(value)) return 'color'
  if (isDuration(value)) return 'duration'
  if (isCubic(value)) return 'cubicBezier'
  if (isDimension(value)) return 'dimension'
  return fail(`cannot type --${id}: ${value}`)
}

/** `700 30px/1.05 var(--ns-ui)` → the DTCG typography composite. */
function parseFontShorthand(v) {
  const m = /^(\d+)\s+([\d.]+)px\s*\/\s*([\d.]+)\s+var\(--([\w-]+)\)$/.exec(v)
  if (!m) return null
  return {
    fontWeight: Number(m[1]),
    fontSize: `${m[2]}px`,
    lineHeight: Number(m[3]),
    fontFamily: `{type.family.${m[4] === 'ns-ui' ? 'ui' : 'figure'}}`,
  }
}

/** One or more CSS shadow layers → DTCG shadow objects. */
function parseShadow(v) {
  const layers = []
  for (const raw of splitTop(v, ',')) {
    const m =
      /^(inset\s+)?(-?[\d.]+px|0)\s+(-?[\d.]+px|0)\s+(-?[\d.]+px|0)(?:\s+(-?[\d.]+px|0))?\s+(.+)$/.exec(
        raw.trim(),
      )
    if (!m) return null
    layers.push({
      inset: !!m[1],
      offsetX: m[2],
      offsetY: m[3],
      blur: m[4],
      spread: m[5] ?? '0',
      color: m[6].trim(),
    })
  }
  return layers.length === 1 ? layers[0] : layers
}

/** Split on a separator that is not inside parentheses. */
function splitTop(s, sep) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === sep && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

// ─── build ──────────────────────────────────────────────────────────────────

const meta = JSON.parse(readFileSync(join(HERE, 'pack.meta.json'), 'utf8'))
const problems = []
function fail(msg) {
  problems.push(msg)
  return undefined
}

const dtcg = {
  $description:
    `${meta.name} — the token layer of the design system in design-system/${meta.source_dir}. ` +
    'Generated by design-system/build-pack.mjs; edit the CSS, not this file.',
  $extensions: {
    'com.metatoy.sorb': {
      system: meta.name,
      id: meta.id,
      // Declared, not implied: every $value below is the CSS string the custom property carries,
      // so this file round-trips to --ns-* exactly. Composite shorthands carry a parsed form
      // under the token's own $extensions.
      valueSyntax: 'css',
      cssVarPrefix: '--',
      modes: ['night', 'day'],
      defaultMode: 'night',
    },
  },
}
const packTokens = {}

for (const [id, { value, file }] of night) {
  const { path, leaf } = classify(id) ?? {}
  if (!path) continue
  const type = dtcgType(id, value)
  const token = {
    $value: value,
    $type: type,
    $extensions: { 'com.metatoy.sorb': { id, cssVar: `--${id}`, definedIn: `tokens/${file}` } },
  }
  const ext = token.$extensions['com.metatoy.sorb']
  if (day.has(id)) ext.day = day.get(id)
  if (reduced.has(id)) ext.reducedMotion = reduced.get(id)
  if (type === 'typography') {
    const parsed = parseFontShorthand(value)
    if (parsed) ext.parsed = parsed
    else console.warn(`  ! --${id} is typed typography but did not parse as a font shorthand`)
  }
  if (type === 'shadow') {
    const parsed = parseShadow(value)
    if (parsed) ext.parsed = parsed
    else console.warn(`  ! --${id} is typed shadow but did not parse as shadow layers`)
  }

  const role = meta.roles[id]
  if (type === 'color' && !role) fail(`colour token --${id} has no role in pack.meta.json`)
  if (role) token.$description = role

  let node = dtcg
  for (const seg of path) node = node[seg] ??= {}
  node[leaf] = token

  let pnode = packTokens
  for (const seg of path) pnode = pnode[seg] ??= {}
  pnode[leaf] = { value, var: `--${id}`, ...(role ? { role } : {}) }
}

// Group notes ride on the pack, where a builder reads them, and on the DTCG groups as
// $description so a token tool shows them too.
for (const [group, note] of Object.entries(meta.group_notes)) {
  if (dtcg[group]) dtcg[group].$description = note
}

// ─── verification ───────────────────────────────────────────────────────────

// Every var(--ns-…) used anywhere in the system must resolve. This is the check that catches a
// component referring to a token that was renamed or never existed.
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const used = new Map()
for (const p of walk(SRC)) {
  if (!/\.(css|jsx|js|html|md)$/.test(p)) continue
  const text = readFileSync(p, 'utf8')
  for (const m of text.matchAll(/var\(\s*--(ns-[\w-]+)/g)) {
    if (!used.has(m[1])) used.set(m[1], relative(SRC, p))
  }
}
for (const [id, where] of used) {
  if (!night.has(id)) fail(`${where} uses var(--${id}) but no token defines it`)
}

for (const c of meta.components) {
  if (!existsSync(join(SRC, c.file))) fail(`component ${c.name}: ${c.file} does not exist`)
}

// A day token that overrides nothing is a typo, not an override.
for (const id of day.keys()) {
  if (!night.has(id)) fail(`the day theme sets --${id}, which the night theme never defines`)
}

if (problems.length) {
  console.error(`\n✗ design pack build failed (${problems.length}):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

// ─── artifacts ──────────────────────────────────────────────────────────────

const flat = (map) =>
  Object.fromEntries([...map].map(([k, v]) => [k, typeof v === 'string' ? v : v.value]))

// The day set is the night set with the day overrides applied: a partial set handed to a
// consumer would silently drop every token the overlay does not mention.
const dayFull = new Map([...night].map(([k, v]) => [k, day.get(k) ?? v.value]))

const pack = {
  v: 1,
  name: meta.name,
  id: meta.id,
  source: {
    kind: 'claude-design',
    project_id: '65396e49-13f8-49dc-804d-d22d0165635c',
    project_name: meta.name,
    project_type: 'PROJECT_TYPE_DESIGN_SYSTEM',
    local_dir: `design-system/${meta.source_dir}`,
    generated_by: 'design-system/build-pack.mjs',
    note:
      'Generated from the committed design system in this repository. A build never needs a live ' +
      'design connection, so every commit builds the same way. Change night-shift/, re-run the ' +
      'script, commit both.',
  },
  premise: meta.premise,
  north_stars: meta.north_stars,
  tokens: packTokens,
  components: meta.components,
  rules: meta.rules,
  refuses: meta.refuses,
  voice: meta.voice,
}

// The token layer as one stylesheet the app can import, WITHOUT night-shift/tokens.css's remote
// Google Fonts @import. The app loads its own fonts through next/font; a render-blocking font
// request on every page, for two faces nothing renders yet, is a cost with no benefit. Importing
// this is what puts the custom properties in the document at first paint, so a Night Shift
// component server-rendered by a later ladder rung is styled before hydration rather than after.
const cssArtifact = () => {
  const line = ([id, v]) => `  --${id}: ${typeof v === 'string' ? v : v.value};`
  return [
    `/* ${meta.name} — the token layer, generated by design-system/build-pack.mjs.`,
    '   Edit night-shift/tokens/*.css and re-run the script; do not edit this file.',
    '',
    '   The two faces the type layer names — Instrument Sans and IBM Plex Mono — are NOT loaded',
    '   here. Load them through next/font when Night Shift UI actually ships, so the app keeps one',
    '   font pipeline and no page pays for a blocking remote stylesheet. Until then --ns-ui and',
    '   --ns-figure fall back through their own stacks. */',
    ':root {',
    ...[...night].map(line),
    '}',
    '',
    '/* Day — for daylight and screenshots. Night is home: it is the bare :root above, so it holds',
    '   whatever the operating system prefers. Only an explicit data-theme="day" switches. */',
    ':root[data-theme="day"] {',
    ...[...day].map(line),
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  :root {',
    ...[...reduced].map(([id, v]) => `    --${id}: ${v};`),
    '  }',
    '}',
    '',
  ].join('\n')
}

const artifacts = {
  'tokens.dtcg.json': dtcg,
  'tokens.night.json': flat(night),
  'tokens.day.json': flat(dayFull),
  'pack.json': pack,
  'tokens.app.css': cssArtifact(),
}

let stale = 0
for (const [name, data] of Object.entries(artifacts)) {
  const text = typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`
  const path = join(HERE, name)
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null
  if (current === text) continue
  stale++
  if (CHECK) console.error(`  ✗ ${name} is out of date`)
  else writeFileSync(path, text)
}

if (CHECK) {
  if (stale) {
    console.error('\n✗ design pack is out of date — run `node design-system/build-pack.mjs`\n')
    process.exit(1)
  }
  console.log('✓ design pack is up to date')
} else {
  console.log(
    `✓ design pack built — ${night.size} tokens (${day.size} day overrides, ` +
      `${reduced.size} reduced-motion), ${meta.components.length} components, ` +
      `${used.size} token references verified`,
  )
  if (stale === 0) console.log('  (no change)')
}

// Sorb applies committed token values as inline custom properties through its own sanitizer,
// which allows a fixed list of CSS functions. A token the sanitizer rejects is silently dropped
// from a preview, so report it rather than let it be discovered live. Skipped when @sorb/leaf is
// not installed, so the artifacts above never depend on it.
try {
  const { sanitizeCssValue } = await import('@sorb/leaf')
  const rejected = [...night].filter(([, v]) => !sanitizeCssValue(v.value).ok).map(([k]) => k)
  if (rejected.length) {
    console.log(
      `\n  note: ${rejected.length} token(s) cannot travel through a Sorb preview — ` +
        `${rejected.join(', ')}. The committed values still apply; only live preview of these ` +
        'is unavailable (see README.md).',
    )
  } else {
    console.log('  all tokens pass the Sorb preview sanitizer')
  }
} catch {
  console.log('  (@sorb/leaf not installed — preview-sanitizer check skipped)')
}
