import { type Action, type HandState, legalActions, type Street } from './poker/engine'

/**
 * Pre-action: the decision you had already made, armed while someone else is thinking.
 *
 * It is not an in-hand edge (brand/northstar.md): it moves nothing forward in time and tells the
 * hero nothing the table cannot see. It only saves a tap on a decision the player had already
 * taken — and the bots have no clock to read it off, because the armed chip never leaves the
 * client and the action lands on the hero's own turn like any other.
 *
 * Deliberately narrow: check and fold only. A pre-armed call or raise commits chips into a
 * betting sequence that can change under it, which is the shape of a dark pattern; checking and
 * folding commit nothing.
 */

/** The only two things that can be armed: whatever was true when the player tapped. */
export type PreActionKind = 'check' | 'fold'

/**
 * What an arm is bound to. The player armed a decision about ONE betting situation, so the arm
 * only survives while that situation does: the same hand, the same street, the same amount owed.
 * `currentBet` moving means somebody bet or raised — a new question, which the player has not
 * answered.
 */
export interface PreActionToken {
  handNo: number
  street: Street
  currentBet: number
}

export interface ArmedPreAction {
  kind: PreActionKind
  token: PreActionToken
}

/** The situation as it stands, for binding an arm to it or for checking one against it. */
export function preActionToken(handNo: number, hand: HandState): PreActionToken {
  return { handNo, street: hand.street, currentBet: hand.currentBet }
}

/**
 * What the control says right now: **Fold** when there is a bet to answer, **Check** when there
 * is not. Resolved at arm time and shown as that word, so the player arms the thing they read
 * rather than a rule they have to remember.
 */
export function preActionKind(hand: HandState, heroId: string): PreActionKind {
  const hero = hand.players.find((p) => p.id === heroId)
  const owed = hand.currentBet - (hero?.committedThisStreet ?? 0)
  return owed > 0 ? 'fold' : 'check'
}

/** Is the arm still about the situation it was armed for? When false it is dropped silently. */
export function tokenHolds(armed: ArmedPreAction, handNo: number, hand: HandState): boolean {
  const now = preActionToken(handNo, hand)
  return (
    armed.token.handNo === now.handNo &&
    armed.token.street === now.street &&
    armed.token.currentBet === now.currentBet
  )
}

/**
 * The action to submit when the turn arrives, or `null` when the arm must not fire.
 *
 * `null` is the rejection path, never a quiet fold: the caller drops the arm, hands the player
 * their turn with the whole of it left, and says "pre-action didn't apply". Every gate here is
 * one where firing would submit an action the player did not choose — a stale situation, someone
 * else on the clock, or a check that is no longer legal.
 */
export function preActionFire(
  armed: ArmedPreAction,
  handNo: number,
  hand: HandState,
  heroId: string,
): Action | null {
  if (!tokenHolds(armed, handNo, hand)) return null
  if (hand.players[hand.toActIndex]?.id !== heroId) return null
  const legal = legalActions(hand)
  if (!legal) return null
  if (armed.kind === 'check') return legal.canCheck ? { type: 'check' } : null
  return legal.canFold ? { type: 'fold' } : null
}
