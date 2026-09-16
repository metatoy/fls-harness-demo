'use client'

import { useRef } from 'react'
import { isEnabled } from '@/lib/flags'
import { settleHandedness, type AppliedHandedness } from '@/lib/handedness'
import { useGame } from '@/store/game'
import { useProfile } from '@/store/profile'

/**
 * Is the table drawn for a left thumb right now?
 *
 * The setting is the player's, but the answer is the hand's: `settleHandedness` only adopts a new
 * value when `handIndex` moves, so toggling mid-hand changes nothing under a thumb that is already
 * travelling. The latch is a ref written during render rather than an effect, which is the
 * `set-state-in-effect` pattern in docs/development.md — there is no state here to set, only a
 * value that refuses to change until the deal says it may.
 */
export function useTableHandedness(): boolean {
  const setting = useProfile((s) => s.leftHanded) && isEnabled('left-handed-mode')
  const handIndex = useGame((s) => s.handIndex)
  const applied = useRef<AppliedHandedness>({ leftHanded: setting, handIndex })
  applied.current = settleHandedness(applied.current, setting, handIndex)
  return applied.current.leftHanded
}
