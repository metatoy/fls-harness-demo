'use client'

import { useEffect } from 'react'
import { AVATAR_BG_SWATCHES, freshSeed } from '@/lib/avatar'
import { useMembership } from '@/store/entitlement'
import { useProfile } from '@/store/profile'
import { useSync } from '@/store/sync'

/** The name the demo seats you under; you can change it in settings like any player. */
const DEMO_PLAYER_NAME = 'Guest'

/** The seat the demo gives you. Same shape onboarding builds, because it replaces onboarding. */
const demoAvatar = () => ({ seed: freshSeed(), backgroundColor: AVATAR_BG_SWATCHES[1] })

/**
 * One-time client boot work, mounted from the root layout:
 * - asks the browser to mark our storage persistent, so the local profile
 *   isn't evicted under storage pressure (Chrome/Firefox honor this; on iOS
 *   the real protection is installing the PWA)
 * - creates a profile on first visit, so the demo can open straight onto the Rail
 * - seeds a Roll-graph origin point for profiles that predate stat recording
 * - restores a sync session if there is one, and pulls
 * - watches that session for a membership, which costs nothing until there is one
 *
 * The service worker is registered separately in UpdatePrompt's hook, which also
 * watches for new deploys (see lib/useServiceWorker).
 */
export function AppBoot() {
  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => {})

    const profile = useProfile.getState()

    // Harness demo: seat the visitor without onboarding.
    //
    // Upstream, creating a profile is the activation moment and the lobby's sub-routes bounce
    // anyone without one back to /game. This fork drops visitors straight onto the Rail, so the
    // profile is minted here instead — a demo has no account step to defend. A returning visitor
    // is untouched; their name, Roll and history are whatever they left behind.
    // ...WITH AN AVATAR. Minting it as `null` made every table unreachable: PlayClient guards
    // on `!profile.avatar` and bounces to '/', so "Sit down" fetched the venue, was turned
    // around, and landed the visitor back on the Rail with no error and nothing to go on. The
    // avatar is not decoration here — `sitDown` seats you with it.
    if (!profile.created) profile.createProfile(DEMO_PLAYER_NAME, demoAvatar())

    // Heal a profile minted before this fix. Without it, anyone who had already opened the demo
    // keeps `avatar: null` in localStorage forever and stays locked out of every table — the
    // fix would work only for visitors who had never been.
    if (profile.created && !profile.avatar) profile.setAvatar(demoAvatar())

    if (profile.created && profile.rollHistory.length === 0) profile.recordRollPoint()

    // No-op unless the player has an account: with no stored session this
    // reads localStorage, finds nothing and stops. No request, no identity.
    void useSync.getState().init()

    // Subscribes to that session rather than going looking for one, so a
    // player with no account still makes no request of its own.
    useMembership.getState().start()
  }, [])
  return null
}
