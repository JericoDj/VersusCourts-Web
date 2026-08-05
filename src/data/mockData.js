/// What's left of the old fixture file. Courts, clubs, queues and events are
/// live backend data now — see `controllers/discoveryController.js` and
/// `context/DiscoveryContext.jsx`. Only the two lists below still have no
/// endpoint behind them.

/// The sport catalog moved to `data/sports.js` (a port of the Flutter `Sport`
/// enum). Re-exported so existing `import { sports }` call sites keep working;
/// new code should import from `data/sports.js` directly.
export { SPORT_FILTERS as sports } from './sports'

// Player search results. There is no public `/users` search endpoint yet, so
// the header's "Players" category still runs off these.
export const players = [
  { id: 'p1', name: 'Miguel Santos', username: 'migsplays', level: 18, area: 'Quezon City', image: 'https://i.pravatar.cc/160?img=12' },
  { id: 'p2', name: 'Ria Mendoza', username: 'riasmash', level: 14, area: 'Makati', image: 'https://i.pravatar.cc/160?img=47' },
  { id: 'p3', name: 'Bea Lim', username: 'bealim', level: 11, area: 'Taguig', image: 'https://i.pravatar.cc/160?img=32' },
]

// Recent-activity strip on the bookings/queues pages. Awaiting a combined
// "my activity" endpoint.
export const activity = [
  { label: 'Friday Night Runs', meta: 'Basketball · Tonight, 7:30 PM', status: 'Joined' },
  { label: 'Elite Sports Center', meta: 'Court 2 · Jul 23, 6:00 PM', status: 'Confirmed' },
  { label: 'Summer Slam 3v3', meta: 'Tournament · Jul 24', status: 'Registered' },
]
