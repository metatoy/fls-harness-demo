'use client'

import { PreviewBanner, SorbProvider } from '@sorb/leaf'
import nightTokens from '../../design-system/tokens.night.json'

/**
 * The Sorb bridge for the Night Shift token layer.
 *
 * Night Shift's tokens are already in the document at first paint — `globals.css` imports the
 * generated `design-system/tokens.app.css`. This provider exists for the other direction: with
 * `sorb dev` running, a proposed token set from the design tool replaces those values live, in
 * this app, without a rebuild. That round trip is the point of the vessel.
 *
 * Two deliberate choices:
 *
 * **No `darkTokens`.** Sorb's mode-aware path builds a stylesheet whose bare `:root` carries the
 * LIGHT set and switches to dark on `prefers-color-scheme`. Night Shift inverts that: night is
 * home at `:root` whatever the operating system prefers, and day is an explicit
 * `[data-theme="day"]` opt-in. Handing Sorb the pair would quietly make day the default. So the
 * committed set here is night only, and the day overlay stays where it is authored, in
 * `tokens.app.css`. Wiring day mode through Sorb needs a `darkModeConvention` that can express
 * "dark at bare root", which `buildModeStylesheet` cannot today.
 *
 * **Preview off in production.** A static export ships to the public demo; the bridge is a
 * localhost development tool. `PreviewBanner` renders nothing when no preview is active, so it is
 * safe to leave mounted either way.
 */
const sorbConfig = {
  namespace: 'night-shift',
  tokens: nightTokens,
  preview: {
    enabled: process.env.NODE_ENV !== 'production',
    origin: 'http://localhost:7777',
    pollInterval: 1500,
    // Bare names, no leading dashes — leaf prepends them.
    expectPrefixes: ['ns-'],
  },
}

export function SorbTokens({ children }: { children: React.ReactNode }) {
  return (
    <SorbProvider config={sorbConfig}>
      {children}
      <PreviewBanner />
    </SorbProvider>
  )
}
