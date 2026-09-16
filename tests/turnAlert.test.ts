import test from 'ava'
import {
  createTurnAlert,
  FLASH_INTERVAL_MS,
  TURN_ALERT_TITLE,
  type TurnAlertHost,
} from '@/lib/turnAlert'

/** A fake tab: a title, a visibility state, a ping counter and a hand-cranked clock. */
function fakeTab(opts: { hidden?: boolean; title?: string } = {}) {
  let title = opts.title ?? 'Pocket — clean poker'
  let hidden = opts.hidden ?? true
  let pings = 0
  let beat: (() => void) | null = null
  let ms = 0

  const host: TurnAlertHost = {
    title: () => title,
    setTitle: (t) => {
      title = t
    },
    hidden: () => hidden,
    ping: () => {
      pings++
    },
    start: (fn, interval) => {
      beat = fn
      ms = interval
      return 1
    },
    stop: () => {
      beat = null
    },
  }

  return {
    host,
    alert: createTurnAlert(host),
    get title() {
      return title
    },
    get pings() {
      return pings
    },
    get interval() {
      return ms
    },
    show: () => {
      hidden = false
    },
    /** Fire n flash intervals. */
    tick: (n = 1) => {
      for (let i = 0; i < n; i++) beat?.()
    },
  }
}

// 1. Hidden tab, turn passes to the seated player: the title alternates and the ping plays.
test('hidden tab and the hero to act starts the flash and the ping', (t) => {
  const tab = fakeTab({ title: 'Pocket — clean poker' })

  tab.alert.sync(true)
  t.is(tab.title, TURN_ALERT_TITLE)
  t.is(tab.pings, 1)
  t.is(tab.interval, FLASH_INTERVAL_MS)

  tab.tick()
  t.is(tab.title, 'Pocket — clean poker', 'the off beat shows the exact prior title')
  t.is(tab.pings, 1, 'the ping rides the alert beat only')

  tab.tick()
  t.is(tab.title, TURN_ALERT_TITLE)
  t.is(tab.pings, 2)
})

// 2. The tab becoming visible restores the title and halts the ping before the next interval —
//    with or without focus, since both events arrive here as the same `sync`.
test('the tab becoming visible restores the title and halts the ping', (t) => {
  const tab = fakeTab({ title: 'Pocket — clean poker' })
  tab.alert.sync(true)
  tab.tick(3)
  const pingsWhileHidden = tab.pings

  tab.show()
  tab.alert.sync(true) // visibilitychange → visible, the hero is still to act
  t.is(tab.title, 'Pocket — clean poker')
  t.false(tab.alert.running())

  tab.tick(5) // whatever the timer would have done, it is gone
  t.is(tab.title, 'Pocket — clean poker')
  t.is(tab.pings, pingsWhileHidden, 'no ping after the tab came back')
})

// 3. Still hidden, but the turn ends by any means — acted, timed out, folded, hand over, gone.
test('the turn ending while hidden stops the ping and restores the title', (t) => {
  const tab = fakeTab({ title: 'Pocket — clean poker' })
  tab.alert.sync(true)
  tab.tick()
  const pings = tab.pings

  tab.alert.sync(false)
  t.is(tab.title, 'Pocket — clean poker')
  t.false(tab.alert.running())
  tab.tick(4)
  t.is(tab.pings, pings)
})

// 4. Nothing happens when it should not.
test('a visible tab never flashes and never pings', (t) => {
  const tab = fakeTab({ hidden: false, title: 'Pocket — clean poker' })
  tab.alert.sync(true)
  t.is(tab.title, 'Pocket — clean poker')
  t.is(tab.pings, 0)
  t.false(tab.alert.running())
})

test('another player to act never flashes and never pings', (t) => {
  const tab = fakeTab({ title: 'Pocket — clean poker' })
  tab.alert.sync(false)
  t.is(tab.title, 'Pocket — clean poker')
  t.is(tab.pings, 0)
  t.false(tab.alert.running())
})

test('a second sync while flashing does not re-capture the alert string as the prior title', (t) => {
  const tab = fakeTab({ title: 'Pocket — clean poker' })
  tab.alert.sync(true)
  tab.alert.sync(true)
  tab.alert.sync(true)
  t.is(tab.pings, 1, 'the ping is not restarted on every re-sync')

  tab.alert.stop()
  t.is(tab.title, 'Pocket — clean poker')
})

test('stop is idempotent and leaves a title it never touched alone', (t) => {
  const tab = fakeTab({ title: 'Pocket — clean poker' })
  tab.alert.stop()
  tab.alert.stop()
  t.is(tab.title, 'Pocket — clean poker')
  t.false(tab.alert.running())
})
