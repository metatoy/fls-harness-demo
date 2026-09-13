import flagsJson from '../../flags.json'

/**
 * Feature flags.
 *
 * Every new surface ships behind one, off in both environments, until a human turns it on. That is
 * the whole point of the flag in this vessel: the ladder can open a pull request and put a change
 * on stage without that change being visible to anyone, so review is a decision rather than a race.
 *
 * The ladder's rung 5 writes `flags.json` directly when a change is signed off, so its shape is a
 * contract with the engine (`FlagStore` in `engine/src/fls/rung5.py`), not a local preference:
 * `{ "flag-name": { "stage": boolean, "prod": boolean } }`. `tests/flags.test.ts` holds it to that.
 *
 * Anything not explicitly `true` is off. A missing flag, a missing environment, a malformed entry
 * and a typo all resolve the same way — the surface stays hidden — because the failure that matters
 * here is a surface appearing before someone meant it to.
 */

/** One flag's state per environment. */
export interface FlagState {
  stage: boolean
  prod: boolean
}

export type Env = 'stage' | 'prod'

/** Keys beginning with `_` are notes in the JSON, not flags. */
const isFlagKey = (key: string): boolean => !key.startsWith('_')

/** The parsed contents of flags.json, notes stripped. */
export const flags: Record<string, FlagState> = Object.fromEntries(
  Object.entries(flagsJson as Record<string, unknown>).filter(([key]) => isFlagKey(key)),
) as Record<string, FlagState>

/**
 * Is a flag on in this environment? Pure, so it can be tested without a DOM or a build.
 * Anything that is not exactly `true` is off.
 */
export function flagEnabled(
  source: Record<string, Partial<FlagState>> | null | undefined,
  name: string,
  env: Env,
): boolean {
  return source?.[name]?.[env] === true
}

/**
 * Is a flag on here and now? The committed `flags.json`, unless a runtime override says
 * otherwise — and overrides exist on stage only (see `activeOverrides`).
 */
export function isEnabled(name: string, env: Env = currentEnv()): boolean {
  const override = activeOverrides(env)[name]
  return typeof override === 'boolean' ? override : flagEnabled(flags, name, env)
}

/**
 * The environment this build was made for.
 *
 * The app is a static export, so this is baked in at build time and cannot change at runtime.
 * Anything that is not explicitly `prod` is treated as `stage`, so a missing or misspelled value
 * fails towards the environment where a surface is allowed to be seen by fewer people.
 */
export function currentEnv(): Env {
  return process.env.NEXT_PUBLIC_FLS_ENV === 'prod' ? 'prod' : 'stage'
}

/**
 * Runtime overrides — `?flags-table-reactions=true`.
 *
 * A flag lives in `flags.json` and is read when the app is BUILT, so seeing a change on stage
 * otherwise means editing a file, pushing, and waiting for a deploy. That is a long way round for
 * the thing a reviewer does most: look at the new surface, then look at the old one.
 *
 * An override is remembered in localStorage, so it survives the next navigation — this is a
 * multi-page static export and a query string does not outlive a link click.
 *
 * **Stage only.** In production the committed flag is the only answer. This repository's own
 * standard is that every new surface ships off in BOTH environments until a human turns it on,
 * and a URL that switches one on in prod would make that standard decorative — anyone holding
 * the link would be running unreleased code. Reviewing happens on stage; that is what stage is.
 */
export const OVERRIDE_PREFIX = 'flags-'
const OVERRIDE_STORE = 'fls.flag-overrides'

/**
 * Overrides expressed by a query string. Pure, so it can be tested without a browser.
 *
 * `?flags-x=true` turns x on and `?flags-x=false` turns it OFF — both directions, because
 * comparing the new surface against the old one on the same build is the other half of reviewing
 * it. An empty value (`?flags-x=`) forgets the override and returns x to whatever was committed.
 */
export function overridesFromQuery(search: string): Record<string, boolean | null> {
  const out: Record<string, boolean | null> = {}
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  for (const [key, value] of params) {
    if (!key.startsWith(OVERRIDE_PREFIX)) continue
    const name = key.slice(OVERRIDE_PREFIX.length)
    if (!name || name === 'reset') continue
    out[name] = value === '' ? null : value !== 'false' && value !== '0'
  }
  return out
}

/** Merge new overrides onto stored ones; `null` removes. Pure, for the same reason. */
export function mergeOverrides(
  stored: Record<string, boolean>,
  incoming: Record<string, boolean | null>,
): Record<string, boolean> {
  const out = { ...stored }
  for (const [name, value] of Object.entries(incoming)) {
    if (value === null) delete out[name]
    else out[name] = value
  }
  return out
}

/** What localStorage holds, or `{}` — private browsing throws on read, and a flag override is
 *  never worth taking the page down for. */
function stored(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(OVERRIDE_STORE)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === 'boolean'),
    ) as Record<string, boolean>
  } catch {
    return {}
  }
}

/**
 * The overrides in force: whatever the URL says, merged onto what was remembered, then
 * remembered. Returns `{}` during prerender and in production, where there are none.
 */
export function activeOverrides(env: Env = currentEnv()): Record<string, boolean> {
  if (env === 'prod' || typeof window === 'undefined') return {}
  if (new URLSearchParams(window.location.search).has('flags-reset')) {
    clearOverrides()
    return {}
  }
  const merged = mergeOverrides(stored(), overridesFromQuery(window.location.search))
  try {
    window.localStorage.setItem(OVERRIDE_STORE, JSON.stringify(merged))
  } catch {
    // Remembering is a convenience; the override still applies to this page.
  }
  return merged
}

/** Forget every override — `?flags-reset`. The way back to what is actually committed, without
 *  having to remember which flags you switched. */
function clearOverrides(): void {
  try {
    window.localStorage.removeItem(OVERRIDE_STORE)
  } catch {
    // nothing stored, nothing to forget
  }
}
