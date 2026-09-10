import { redirect } from 'next/navigation'

// Harness demo: "/" goes straight to the Rail.
//
// Upstream this route is the marketing landing page and the app lives under "/game". This fork
// exists to demonstrate a build pipeline, so a visitor should land on the surface the pipeline
// changes — the cash tables — without a tour first. The marketing page is still in the tree at
// components/marketing/Landing.tsx; only its route is gone.
export default function Page() {
  redirect('/game/rail')
}
