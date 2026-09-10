import { describe, expect, it } from 'vitest'

import { flagEnabled, isEnabled } from './flags.mjs'

describe('feature flags', () => {
  it('is off when the flag is missing', () => {
    expect(flagEnabled({}, 'nope', 'stage')).toBe(false)
    expect(flagEnabled(null, 'nope', 'stage')).toBe(false)
  })

  it('is off unless the environment is explicitly true', () => {
    const f = { demo: { stage: true, prod: false } }
    expect(flagEnabled(f, 'demo', 'stage')).toBe(true)
    expect(flagEnabled(f, 'demo', 'prod')).toBe(false)
  })

  it('treats any non-true value as off', () => {
    expect(flagEnabled({ demo: { stage: 'yes' } }, 'demo', 'stage')).toBe(false)
  })

  it('reads the committed flags file', () => {
    expect(isEnabled('share-result', 'prod')).toBe(false)
  })
})
