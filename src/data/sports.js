/// Port of VersusCourts-Player's `Sport` enum (lib/core/constants/sports.dart).
/// Icon names are the same Material Symbols the Flutter `SportMeta.icon`
/// mapping uses, and the colours resolve to the `--vc-sport-*` tokens, which
/// already mirror `AppColors`. Keep the two files in step — the sport chips,
/// pills and card accents on web are supposed to be indistinguishable from
/// the mobile app's.
export const SPORTS = [
  { id: 'basketball', label: 'Basketball', symbol: 'sports_basketball', emoji: '🏀' },
  { id: 'badminton', label: 'Badminton', symbol: 'sports_tennis', emoji: '🏸' },
  { id: 'pickleball', label: 'Pickleball', symbol: 'sports_cricket', emoji: '🥒' },
  { id: 'tennis', label: 'Tennis', symbol: 'sports_tennis', emoji: '🎾' },
  { id: 'padel', label: 'Padel', symbol: 'sports_tennis', emoji: '🎾' },
]

/// The "All" catch-all the Flutter `CategoryFilter` renders ahead of the five
/// sports (`Icons.apps_rounded` + `AppColors.primary`).
export const ALL_SPORTS = { id: 'all', label: 'All', symbol: 'apps', emoji: '✦' }

/// `SPORTS` with the All chip in front — the shape the filter rows want.
export const SPORT_FILTERS = [ALL_SPORTS, ...SPORTS]

const BY_ID = new Map(SPORT_FILTERS.map((sport) => [sport.id, sport]))

/// Normalizes a backend sport string ("BASKETBALL", "open_play") to a chip id.
/// Mirrors Dart's `sportFromApi`, which also falls back to basketball.
export const sportFromApi = (value) => {
  const id = String(value || '').toLowerCase().replaceAll('_', '')
  return BY_ID.has(id) && id !== 'all' ? id : 'basketball'
}

export const sportMeta = (id) => BY_ID.get(String(id || '').toLowerCase()) ?? SPORTS[0]

export const sportLabel = (id) => sportMeta(id).label

/// CSS colour for a sport, usable anywhere a custom property is allowed.
export const sportColor = (id) =>
  id === 'all' ? 'var(--vc-primary)' : `var(--vc-sport-${sportMeta(id).id})`

/// Matches Flutter's `SportMeta.gradient`: badminton has a bespoke two-green
/// ramp, every other sport darkens its own colour by 25% toward black, and
/// "All" reuses the brand hero gradient.
export const sportGradient = (id) => {
  if (id === 'all') return 'var(--vc-gradient-sport-all)'
  if (id === 'badminton') return 'linear-gradient(135deg, #16a34a, #22c55e)'
  return `linear-gradient(135deg, var(--vc-sport-${sportMeta(id).id}), var(--vc-sport-${sportMeta(id).id}-dark))`
}
