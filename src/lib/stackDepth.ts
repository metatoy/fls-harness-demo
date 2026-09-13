/**
 * Stack depth in big blinds.
 *
 * The number a player does in their head all night — "how deep am I?" — and gets wrong often
 * enough that the answer belongs next to the chip count rather than behind arithmetic. It is
 * public information: the stack is on the seat and the blind level is in the header, so this
 * says nothing to the hero that the table could not already work out. That is the side of the
 * north star it sits on.
 *
 * Pure and unmemoised on purpose. The caller passes the same two values it renders, so the
 * figure cannot lag the chip count it sits under.
 */

/**
 * `stack` in big blinds, as `"24.5bb"` — or `null` when there is nothing to measure against.
 *
 * `stack` is chips behind, not chips committed this street: the figure answers what is left to
 * play with, which is exactly what the chip count above it shows.
 *
 * Returns `null` rather than a placeholder when the big blind is absent, zero or negative
 * (pre-deal, joining, between levels, a format with no blinds). A seat that says "—bb" invites
 * a player to read a number that was never there.
 */
export function stackDepth(stack: number, bigBlind: number | null | undefined): string | null {
  if (typeof bigBlind !== 'number' || !Number.isFinite(bigBlind) || bigBlind <= 0) return null
  if (!Number.isFinite(stack) || stack < 0) return null
  return `${(stack / bigBlind).toFixed(1)}bb`
}
