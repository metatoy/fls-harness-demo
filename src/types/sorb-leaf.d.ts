/**
 * Ambient types for `@sorb/leaf`.
 *
 * The package is JavaScript with JSDoc typedefs and ships no `.d.ts` (its `package.json` has no
 * `types` field), so a strict TypeScript app cannot import it without this. Only the surface this
 * app actually uses is declared; widen it here when the app starts using more, rather than
 * reaching for `any` at a call site.
 *
 * Source of truth for these shapes: `sorb-leaf/src/types.js` in the Sorb workspace.
 */
declare module '@sorb/leaf' {
  import type { ReactElement, ReactNode } from 'react'

  /** A flat map of BARE token names to CSS values: `ns-felt`, never `--ns-felt`. */
  export type TokenSet = Record<string, string | number>

  export interface PreviewConfig {
    enabled: boolean
    /** Bridge origin to load proposed token sets from. */
    origin?: string
    pollInterval?: number
    /** Bare token-name prefixes this app expects, used to warn on a mismatched preview. */
    expectPrefixes?: string[]
    key?: string
    allowedOrigins?: string[]
  }

  export interface SorbConfig {
    namespace: string
    tokens: TokenSet
    darkTokens?: TokenSet
    preview?: PreviewConfig
    publishableKey?: string
    cloudBase?: string
  }

  export function SorbProvider(props: { config: SorbConfig; children?: ReactNode }): ReactElement

  /** Renders nothing unless a preview is loaded, requested, or mismatched. */
  export function PreviewBanner(): ReactElement | null

  export function sanitizeCssValue(value: string): { ok: boolean; value?: string; reason?: string }
}
