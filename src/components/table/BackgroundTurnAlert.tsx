'use client'

import { useEffect } from 'react'
import { sound } from '@/lib/sound'
import { createTurnAlert } from '@/lib/turnAlert'

/**
 * Flashes the tab's title and pings while the tab is hidden and the seated player is to act.
 *
 * Renders nothing: the whole surface is the title bar, so there is no control to name, focus or
 * size. The logic lives in `@/lib/turnAlert`, which is pure and tested; this is the wiring.
 *
 * The ping is `sound.play('turn')`, the same cue the table already makes when the turn arrives, so
 * the existing mute setting gates it with no second switch. The `AudioContext` is created and
 * resumed by the first `sound.play` of the session, which is the click that seats the player; if
 * sound is muted or the context stays blocked, `play` is a no-op and the flash runs alone.
 */
export function BackgroundTurnAlert({ heroToAct }: { heroToAct: boolean }) {
  useEffect(() => {
    const alert = createTurnAlert({
      title: () => document.title,
      setTitle: (t) => {
        document.title = t
      },
      hidden: () => document.visibilityState === 'hidden',
      ping: () => sound.play('turn'),
      start: (beat, ms) => window.setInterval(beat, ms),
      stop: (handle) => window.clearInterval(handle),
    })

    // Either half of the condition can move. The turn arrives as a new `heroToAct`, which re-runs
    // this effect; visibility arrives as one of these two events. `focus` is OR'd in because a tab
    // can be revealed without being focused and vice versa, and both mean the player is looking.
    const sync = () => alert.sync(heroToAct)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    sync()

    // Cleanup runs before the next effect, so a turn ending — acted, timed out, folded, hand over,
    // seat gone — restores the exact prior title in the same commit that observed it.
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
      alert.stop()
    }
  }, [heroToAct])

  return null
}
