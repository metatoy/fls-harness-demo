import test from 'ava'
import {
  addRecentHand,
  handIdFor,
  RECENT_HANDS_CAP,
  type RecentHand,
  replayHref,
  unavailableReason,
} from '@/lib/recentHands'

const hand = (handNo: number, completedAt: number, token: string | null = 'tok'): RecentHand => ({
  id: handIdFor(handNo, completedAt),
  handNo,
  table: 'The Kitchen Table · 50/100',
  smallBlind: 50,
  bigBlind: 100,
  completedAt,
  summary: `You win ${handNo}00`,
  won: true,
  token,
})

const record = (hands: RecentHand[]): RecentHand[] =>
  hands.reduce<RecentHand[]>((list, h) => addRecentHand(list, h), [])

test('a completed hand lands on the list newest first', (t) => {
  // Acceptance 1: recording is the whole gesture — there is no save step to forget.
  const list = record([hand(1, 1_000), hand(2, 2_000)])
  t.deepEqual(
    list.map((h) => h.handNo),
    [2, 1],
  )
})

test('hands that finish together stay in completion order, and a repeat is one entry', (t) => {
  // Acceptance 2. Same millisecond: the later hand number is the later hand, not sort luck.
  const list = record([hand(7, 5_000), hand(8, 5_000)])
  t.deepEqual(
    list.map((h) => h.handNo),
    [8, 7],
  )

  // The same hand recorded twice (a double flush, a resumed table) replaces itself.
  const twice = record([hand(3, 9_000), hand(4, 9_500), hand(3, 9_000)])
  t.is(twice.length, 2)
  t.deepEqual(
    twice.map((h) => h.handNo),
    [4, 3],
  )
})

test('the window holds twenty hands and the newest evicts the oldest', (t) => {
  // Acceptance 3. Deduplication happens first, so twenty distinct hands survive a repeat.
  let list: RecentHand[] = []
  for (let i = 1; i <= RECENT_HANDS_CAP; i++) list = addRecentHand(list, hand(i, i * 1_000))
  list = addRecentHand(list, hand(1, 1_000))
  t.is(list.length, RECENT_HANDS_CAP)

  list = addRecentHand(list, hand(99, 999_000))
  t.is(list.length, RECENT_HANDS_CAP)
  t.is(list[0].handNo, 99)
  t.false(
    list.some((h) => h.handNo === 1),
    'the oldest hand left, and only the oldest',
  )
  t.true(list.some((h) => h.handNo === 2))
})

test('an entry opens the shared-replay route by hand id, minting nothing', (t) => {
  // Acceptance 4: the route is the existing /hand screen, addressed by id. The replay payload
  // stays on the device — no token in the URL, so no link exists for anyone else to hold.
  const entry = hand(12, 4_000)
  t.is(replayHref(entry), `/hand?h=${entry.id}`)
  t.false(replayHref(entry).includes(entry.token ?? ''))
})

test('a hand with no replay payload says why instead of offering a broken route', (t) => {
  // Acceptance 5.
  t.is(unavailableReason(hand(5, 1_000)), null)
  const reason = unavailableReason(hand(5, 1_000, null))
  t.truthy(reason)
  t.regex(String(reason), /replay/i)
})

test('an id is stable for one hand and distinct between hands', (t) => {
  t.is(handIdFor(4, 1_700), handIdFor(4, 1_700))
  t.not(handIdFor(4, 1_700), handIdFor(5, 1_700))
  t.not(handIdFor(4, 1_700), handIdFor(4, 1_701))
})
