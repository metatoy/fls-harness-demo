// Feature-flag resolution. Pure and dependency-free so tests can exercise it without a DOM.
import flags from '../flags.json' with { type: 'json' }

/**
 * Is a flag on in this environment?
 * @param {Record<string, Record<string, boolean>>} flagsObj
 * @param {string} name
 * @param {'stage'|'prod'} env
 * @returns {boolean}
 */
export function flagEnabled(flagsObj, name, env) {
  const f = flagsObj?.[name]
  return !!(f && f[env] === true)
}

/**
 * Check against the committed flags.json.
 * @param {string} name
 * @param {'stage'|'prod'} env
 * @returns {boolean}
 */
export function isEnabled(name, env) {
  return flagEnabled(flags, name, env)
}

/** The environment this build is running in. @returns {'stage'|'prod'} */
export function currentEnv() {
  return import.meta.env?.VITE_ENV === 'prod' ? 'prod' : 'stage'
}
