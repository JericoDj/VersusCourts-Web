/// What's left of the old fixture file. Courts, clubs, queues and events are
/// live backend data now — see `controllers/discoveryController.js` and
/// `context/DiscoveryContext.jsx`. Only the two lists below still have no
/// endpoint behind them.

/// The sport catalog moved to `data/sports.js` (a port of the Flutter `Sport`
/// enum). Re-exported so existing `import { sports }` call sites keep working;
/// new code should import from `data/sports.js` directly.
export { SPORT_FILTERS as sports } from './sports'

// Real player searches are performed dynamically via `userService.searchPlayers`
export const players = []
export const activity = []

