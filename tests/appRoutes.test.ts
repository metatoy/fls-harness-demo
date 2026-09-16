import { readdir } from 'node:fs/promises'
import test from 'ava'
import sitemap from '@/app/sitemap'

// Every page is either CONTENT or APP, and somebody has to have decided which.
//
// `contentRoutes.test.ts` and `canonical.test.ts` both read their list of routes
// from the sitemap — deliberately, so a route added there is checked the day it
// lands. What that means is that a page never added to the sitemap is invisible
// to both of them: they verify that the registrations agree with each other, not
// that a route was ever considered for registration at all. A build added
// `src/app/hands/page.tsx` in September 2026, touched the sitemap zero times, and
// both guards passed. Possibly right — a player's own hands are app, not content
// — but nobody chose it. It was the default for anything that forgot.
//
// This turns absence into a decision. A page is in the sitemap, or it is under the
// app subtree that canonical.test.ts already governs, or it is here with a reason.
// Anything else fails with a sentence saying which of those to pick.

const pathOf = (url: string) => new URL(url).pathname.replace(/\/$/, '')

/** App routes that are deliberately not indexed, each with the reason it is app. */
const APP_ROUTES: Record<string, string> = {
  '': 'redirects to /game/rail in this fork — a redirect is not a page',
  '/hand': 'a replay opened from a shared link; the link is the address',
  '/play/[venue]': 'a live table — app, not content',
  '/reset-password': 'transactional; never indexed',
  '/stats': "a player's own numbers",
  '/tutorial': 'in-app onboarding',
}

/** The subtree canonical.test.ts already holds to noindex-and-out-of-the-sitemap. */
const APP_SUBTREE = '/game'

test('every page is in the sitemap, under the app subtree, or listed here with a reason', async (t) => {
  const dir = new URL('../src/app', import.meta.url)
  const pages = (await readdir(dir, { recursive: true }))
    .map(String)
    .filter((f) => f.endsWith('page.tsx'))
    .map((f) => '/' + f.replace(/\/?page\.tsx$/, ''))
    .map((route) => (route === '/' ? '' : route))
  t.true(pages.length > 0, 'found no pages under src/app')

  const listed = new Set(sitemap().map((entry) => pathOf(entry.url)))
  const undecided = pages.filter(
    (route) =>
      !listed.has(route) &&
      !(route === APP_SUBTREE || route.startsWith(`${APP_SUBTREE}/`)) &&
      !(route in APP_ROUTES),
  )
  t.deepEqual(
    undecided,
    [],
    `${undecided.map((r) => `\`${r || '/'}\``).join(', ')} ${undecided.length === 1 ? 'is a page' : 'are pages'} and nobody decided ` +
      'whether it is content (add it to the sitemap) or app (add it to APP_ROUTES in ' +
      'tests/appRoutes.test.ts with a reason)',
  )

  // The list must not outlive the pages it describes, or it becomes a place where
  // reasons are written for routes that no longer exist.
  const stale = Object.keys(APP_ROUTES).filter((route) => !pages.includes(route))
  t.deepEqual(stale, [], `APP_ROUTES lists routes that no longer exist: ${stale.join(', ')}`)

  // And a route cannot be both: a sitemap entry that is also excused as app is a
  // contradiction somebody should resolve.
  const both = Object.keys(APP_ROUTES).filter((route) => listed.has(route))
  t.deepEqual(both, [], `listed in the sitemap AND excused as app: ${both.join(', ')}`)
})
