/**
 * Background turn alert — the signal for a player who tabbed away mid-hand.
 *
 * While the tab is hidden and the seated player is to act, the document title alternates between
 * an alert string and the exact title that was there before, with a ping on the alert beat. The
 * moment the tab comes back, or the turn ends by any means, the title is restored and the ping
 * stops.
 *
 * The controller here is pure: every effect it has (reading and writing the title, knowing whether
 * the tab is hidden, making a sound, keeping time) arrives through `TurnAlertHost`. That is what
 * lets the four acceptance criteria be tested in AVA, with no DOM and no real clock —
 * `BackgroundTurnAlert` supplies the browser's versions of the same six functions.
 *
 * It says nothing about the hand. A tab that flashes "your turn" tells the player only what the
 * clock in front of every other seat already says, so it sits on the study side of the north star:
 * no information that a player at the table cannot see.
 */

/** The string the title alternates with. Carries the word, not a colour or a glyph alone. */
export const TURN_ALERT_TITLE = 'Your turn — Pocket'

/** One beat of the flash, and of the ping that rides on it. */
export const FLASH_INTERVAL_MS = 1000

/** Everything the controller needs from the outside world. */
export interface TurnAlertHost {
  /** The document title right now. */
  title: () => string
  /** Set the document title. */
  setTitle: (title: string) => void
  /** Is the tab hidden? (`document.visibilityState === 'hidden'`) */
  hidden: () => boolean
  /** Play one ping. A no-op when sound is muted, blocked or suspended — the flash runs alone. */
  ping: () => void
  /** Start a repeating timer, returning a handle. */
  start: (beat: () => void, ms: number) => number
  /** Stop a timer started by `start`. */
  stop: (handle: number) => void
}

export interface TurnAlert {
  /**
   * Tell the alert what is true now: whether the seated player is to act. Called on every change
   * of turn AND on `visibilitychange`/`focus`, because either side of the condition can move.
   */
  sync: (heroToAct: boolean) => void
  /** Stop and restore the prior title. Idempotent. */
  stop: () => void
  /** Is the flash running? For tests and for asserting nothing happens when it should not. */
  running: () => boolean
}

export function createTurnAlert(host: TurnAlertHost): TurnAlert {
  let timer: number | null = null
  /** The title to put back, captured once when the flash starts. */
  let prior: string | null = null
  /** Which of the two strings is showing. */
  let alerting = false

  const stop = (): void => {
    if (timer !== null) {
      host.stop(timer)
      timer = null
    }
    // Restore the exact prior title, and only if we were the ones who changed it.
    if (prior !== null) {
      host.setTitle(prior)
      prior = null
    }
    alerting = false
  }

  const beat = (): void => {
    alerting = !alerting
    host.setTitle(alerting ? TURN_ALERT_TITLE : (prior ?? host.title()))
    if (alerting) host.ping()
  }

  const sync = (heroToAct: boolean): void => {
    // Either half of the condition failing clears it: the turn ended (acted, timed out, folded,
    // hand over, disconnected — they all arrive here as `heroToAct === false`), or the tab came
    // back. Whichever comes first.
    if (!heroToAct || !host.hidden()) {
      stop()
      return
    }
    if (timer !== null) return // already flashing; do not re-capture the alert string as the prior
    prior = host.title()
    alerting = true
    host.setTitle(TURN_ALERT_TITLE)
    host.ping()
    timer = host.start(beat, FLASH_INTERVAL_MS)
  }

  return { sync, stop, running: () => timer !== null }
}
