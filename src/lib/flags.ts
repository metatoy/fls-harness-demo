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

/** Check a flag against the committed flags.json. */
export function isEnabled(name: string, env: Env = currentEnv()): boolean {
  return flagEnabled(flags, name, env)
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
