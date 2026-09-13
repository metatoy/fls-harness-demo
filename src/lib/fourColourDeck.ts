'use client'

// The four-colour deck setting (Settings → Display), as data plus one hook.
//
// The whole feature is one class on <html>: `deck-four-colour` re-points the
// per-suit ink custom properties (globals.css) at the four-colour palette, and
// every card face in the app reads those properties rather than a colour of its
// own. So turning it on recolours the table, the hole cards, the discard and a
// hand-history panel that was already open, all in the same repaint, with no
// reload, no re-deal and no component subscribing to anything.
//
// It is stored per device like dark mode and the text size are, not on the
// profile: it describes this screen's readability rather than the player, so it
// costs no PERSIST_VERSION bump and does not get pushed onto another device by
// last-write-wins sync.

import { useCallback, useSyncExternalStore } from 'react'

/** localStorage key. Named by the spec, so it is not `pip.`-namespaced. */
export const FOUR_COLOUR_DECK_KEY = 'fourColourDeck'

/** The one class the toggle adds to and removes from the root element. */
export const FOUR_COLOUR_DECK_CLASS = 'deck-four-colour'

/**
 * A stored value resolved to on or off. Only the exact string `true` is on:
 * a missing key, a half-written one, `{}` from an older build and outright
 * garbage all fall back to off, which is today's deck.
 */
export function parseFourColourDeck(raw: string | null | undefined): boolean {
  return raw === 'true'
}

// --- the store -------------------------------------------------------------
//
// The DOM class *is* the state — the boot script below sets it before first
// paint, so there is nothing to hydrate and nothing to keep in step with it.

const listeners = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains(FOUR_COLOUR_DECK_CLASS)
}

/** Off during the server render: nobody's localStorage is readable there. */
const getServerSnapshot = (): boolean => false

/** Apply and remember. Private browsing throws on write; the class still lands. */
function setFourColourDeck(on: boolean): void {
  document.documentElement.classList.toggle(FOUR_COLOUR_DECK_CLASS, on)
  try {
    localStorage.setItem(FOUR_COLOUR_DECK_KEY, String(on))
  } catch {
    // Remembering is a convenience; the deck still changed for this session.
  }
  for (const listener of listeners) listener()
}

/** The setting and its setter, for the Settings row. */
export function useFourColourDeck(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return [on, useCallback(setFourColourDeck, [])]
}

/**
 * The no-flash boot: adds the class before first paint, rendered as an inline
 * script by the server layout (see theme-provider.tsx for why the split
 * exists). Without it a reload with the setting on deals the hand in the old
 * colours and then recolours it in front of the player.
 *
 * Everything is inside the try: a browser that throws on localStorage (private
 * mode, storage disabled) must load the app with the toggle off, not break it.
 */
export const FOUR_COLOUR_DECK_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem('${FOUR_COLOUR_DECK_KEY}')==='true')document.documentElement.classList.add('${FOUR_COLOUR_DECK_CLASS}')}catch(e){}})()`
