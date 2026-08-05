/// Discovery data layer — the web port of VersusCourts-Player's
/// `DiscoveryProvider` (lib/providers/discovery_provider.dart) together with
/// the `Court` / `Club` / `SportsEvent` `fromJson` factories it feeds on.
/// Pure functions only: fetching and shaping live here, React state lives in
/// `context/DiscoveryContext.jsx`.
import { apiList, apiRequest } from '../data/apiClient'
import { sportFromApi } from '../data/sports'

/// Same default the Flutter provider starts from (Quezon City).
export const DEFAULT_LOCATION = { lat: 14.676, lng: 121.0437, label: 'Quezon City, Philippines' }

/// Flutter's radius chips. 100 means "no limit" there too, which is why the
/// request widens to 5000km rather than sending 100.
export const RADIUS_OPTIONS = [10, 20, 50, 100]

const num = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const titleCase = (value = '') => String(value)
  .toLowerCase()
  .split(/[_\s]+/)
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ')

const initialsOf = (name = 'Club') => name
  .split(/\s+/)
  .map((word) => word[0])
  .filter(Boolean)
  .join('')
  .slice(0, 2)
  .toUpperCase() || 'VC'

export const formatMoney = (value) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(value || 0)

/// "AUG 16" — the two-part string `EventCard` splits on a space.
const formatEventDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'TBA —'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit' })
    .format(date)
    .toUpperCase()
    .replace(/[,.]/g, '')
}

const formatDistance = (km) => {
  if (km === null) return ''
  return km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(1)} km`
}

/// Mirrors `Court.fromJson`, including its fallbacks for legacy rows that
/// carry no branch/organization.
export function normalizeCourt(court) {
  const branch = court.branch || {}
  const organization = branch.organization || {}
  const price = num(court.pricePerHour) ?? num(court.priceMin) ?? 0
  const distanceKm = num(court.distanceKm)
  const sports = (court.sports || []).map(sportFromApi)
  return {
    id: court.id,
    name: court.name || 'Sports court',
    area: branch.area || court.address || court.area || 'Metro Manila',
    distanceKm,
    distance: formatDistance(distanceKm),
    rating: num(branch.rating) ?? num(court.rating) ?? 0,
    reviews: num(court.reviewCount, 0),
    price,
    open: court.status === 'OPEN' || court.isOpen === true,
    sports: sports.length ? sports : ['basketball'],
    image: court.imageUrl || organization.coverUrl || '',
    gallery: Array.isArray(court.gallery) ? court.gallery : [],
    description: court.description || branch.about || '',
    amenities: (court.amenities || []).map(titleCase),
    openHours: court.availableHours || branch.openHours || '6:00 AM – 11:00 PM',
    latitude: num(branch.lat) ?? num(court.lat),
    longitude: num(branch.lng) ?? num(court.lng),
    organizationId: organization.id || '',
    organizationName: organization.name || '',
    organizationLogoUrl: organization.logoUrl || court.logoUrl || '',
    offersQueue: court.offersQueue !== false,
    offersReservation: court.offersReservation !== false,
  }
}

/// Port of `NearbyBusiness.groupFrom` — courts collapse into the operator that
/// runs them, and a court with no organization becomes its own one-court
/// "business" rather than being dropped.
export function groupBusinesses(courts) {
  const byOrg = new Map()
  courts.forEach((court) => {
    const key = court.organizationId || `court-${court.id}`
    if (!byOrg.has(key)) byOrg.set(key, [])
    byOrg.get(key).push(court)
  })

  return [...byOrg.entries()].map(([key, group]) => {
    const [first] = group
    const distances = group.map((court) => court.distanceKm).filter((value) => value !== null)
    const prices = group.map((court) => court.price).filter((value) => value > 0)
    return {
      id: first.organizationId || key,
      name: first.organizationName || first.name,
      logoUrl: first.organizationLogoUrl,
      coverUrl: group.find((court) => court.image)?.image || '',
      area: first.area,
      latitude: first.latitude,
      longitude: first.longitude,
      courts: group,
      sports: [...new Set(group.flatMap((court) => court.sports))],
      isOpen: group.some((court) => court.open),
      minPrice: prices.length ? Math.min(...prices) : 0,
      distanceKm: distances.length ? Math.min(...distances) : null,
      distance: distances.length ? formatDistance(Math.min(...distances)) : '',
      rating: Math.max(...group.map((court) => court.rating), 0),
      reviews: group.reduce((total, court) => total + court.reviews, 0),
    }
  }).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
}

/// Mirrors `Club.fromJson`, plus the display fields `ClubCard` reads.
export function normalizeClub(club) {
  const sports = (club.sports?.length ? club.sports : [club.sport]).filter(Boolean).map(sportFromApi)
  const members = num(club._count?.members) ?? num(club.members) ?? (Array.isArray(club.members) ? club.members.length : 0)
  const distanceKm = num(club.distanceKm)
  return {
    id: club.id,
    name: club.name || 'Sports club',
    sport: sports[0] || 'basketball',
    sports: sports.length ? sports : ['basketball'],
    area: club.area || 'Metro Manila',
    members: members ?? 0,
    rating: num(club.rating, 0),
    distanceKm,
    distance: formatDistance(distanceKm),
    latitude: num(club.lat) ?? num(club.latitude),
    longitude: num(club.lng) ?? num(club.longitude),
    image: club.bannerUrl || club.logoUrl || '',
    logoUrl: club.logoUrl || '',
    initials: initialsOf(club.name),
    about: club.about || '',
    visibility: String(club.visibility || 'PUBLIC').toUpperCase(),
    private: String(club.visibility || '').toUpperCase() === 'PRIVATE',
    isPrivate: String(club.visibility || '').toUpperCase() === 'PRIVATE',
    joined: club.joined === true,
    code: club.inviteCode || '',
    myRole: club.myRole || '',
  }
}

/// Mirrors `SportsEvent.fromJson`. `registered` prefers the participant count
/// the list endpoint includes (`_count.participants`, JOINED only).
export function normalizeEvent(event) {
  const registered = num(event._count?.participants)
    ?? (Array.isArray(event.participants) ? event.participants.length : null)
    ?? num(event.registered, 0)
  const prizePool = num(event.prizePool, 0)
  return {
    id: event.id,
    title: event.title || 'Versus event',
    sport: sportFromApi(event.sport),
    organizer: event.organizer || event.club?.name || 'Versus Organizer',
    venue: event.location || 'Versus Arena',
    location: event.location || 'Versus Arena',
    date: formatEventDate(event.date),
    startsAt: event.date,
    endDate: event.endDate || null,
    registrationOpensAt: event.registrationOpensAt || null,
    registrationClosesAt: event.registrationClosesAt || null,
    entryFee: num(event.entryFee, 0),
    prizePool,
    prize: prizePool > 0 ? `₱${formatMoney(prizePool)}` : 'Glory',
    prizes: Array.isArray(event.prizes) ? event.prizes : [],
    image: event.bannerUrl || '',
    status: String(event.status || 'UPCOMING').toUpperCase(),
    format: String(event.format || 'SINGLE_ELIMINATION').toUpperCase(),
    registered: registered ?? 0,
    capacity: num(event.capacity, 16),
    kind: String(event.kind || 'TOURNAMENT').toUpperCase() === 'TOURNAMENT' ? 'tournament' : 'event',
    clubId: event.clubId || null,
    description: event.description || '',
  }
}

/// `/courts/nearby` — radiusKm 100 is the provider's "unlimited" sentinel and
/// widens to 5000, exactly as `_fetchCourts` does.
export async function fetchCourts({ lat, lng, radiusKm = 100, signal } = {}) {
  const courts = await apiList('/courts/nearby', {
    query: { lat, lng, radiusKm: radiusKm >= 100 ? 5000 : radiusKm },
    signal,
  })
  return courts.map(normalizeCourt)
}

/// `/clubs` with lat/lng so the backend can return a real per-club distanceKm.
export async function fetchClubs({ lat, lng, signal } = {}) {
  const clubs = await apiList('/clubs', { query: { lat, lng }, signal })
  return clubs.map(normalizeClub)
}

/// `/clubs/mine` — needs a token; callers skip it when signed out.
export async function fetchMyClubs({ lat, lng, signal } = {}) {
  const clubs = await apiList('/clubs/mine', { query: { lat, lng }, signal })
  return clubs.map(normalizeClub)
}

export async function fetchEvents({ signal } = {}) {
  const events = await apiList('/events', { signal })
  return events.map(normalizeEvent)
}

/// Favorited court ids, for the heart toggle. Signed-out callers skip this.
export async function fetchFavoriteCourts({ signal } = {}) {
  const courts = await apiList('/courts/favorites', { signal })
  return courts.map(normalizeCourt)
}

export function setCourtFavorite(courtId, favorited) {
  return apiRequest(`/courts/${courtId}/favorite`, { method: favorited ? 'POST' : 'DELETE' })
}

const hasCoordinates = (place) =>
  Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
  && place.latitude !== 0 && place.longitude !== 0

/// Projects the already-fetched feeds onto the shape the discovery map's
/// markers and place cards read. Keeping this a derivation (rather than the
/// map running its own `/courts/nearby` + `/clubs` + `/queues` round trip)
/// means the map and the lists can never disagree.
export function toMapPlaces({ businesses = [], clubs = [], queues = [] } = {}) {
  const courtPlaces = businesses.filter(hasCoordinates).map((business) => ({
    id: business.id,
    kind: 'court',
    label: business.name,
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl,
    lat: business.latitude,
    lng: business.longitude,
    courts: business.courts,
    sports: business.sports.map((sport) => titleCase(sport)),
    isOpen: business.isOpen,
    area: business.area,
    distanceKm: business.distanceKm,
    minPrice: business.minPrice || null,
    meta: `${business.courts.length} court${business.courts.length === 1 ? '' : 's'}${
      business.minPrice ? ` · from ₱${formatMoney(business.minPrice)}/hr` : ''
    }`,
    to: `/app/courts/${business.id}`,
  }))

  const clubPlaces = clubs.filter(hasCoordinates).map((club) => ({
    id: club.id,
    kind: 'club',
    label: club.name,
    logoUrl: club.logoUrl,
    coverUrl: club.image,
    lat: club.latitude,
    lng: club.longitude,
    sports: club.sports.map((sport) => titleCase(sport)),
    members: club.members,
    rating: club.rating,
    area: club.area,
    isPrivate: club.private,
    meta: `${club.members.toLocaleString()} member${club.members === 1 ? '' : 's'}${
      club.sports[0] ? ` · ${titleCase(club.sports[0])}` : ''
    }`,
    to: `/clubs?club=${club.id}`,
  }))

  /// Only queues that are still joinable and still in the future earn a pin.
  const now = Date.now()
  const queuePlaces = queues.flatMap((queue) => {
    const branch = queue.court?.branch || {}
    const lat = num(branch.lat)
    const lng = num(branch.lng)
    const startsAt = new Date(queue.startTime).getTime()
    if (!Number.isFinite(startsAt) || startsAt <= now) return []
    if (!['OPEN', 'FULL'].includes(queue.status)) return []
    if (lat === null || lng === null || lat === 0 || lng === 0) return []
    const spotsLeft = Math.max(0, (queue.max || 0) - (queue.players || 0))
    return [{
      id: queue.id,
      kind: 'queue',
      label: queue.title,
      lat,
      lng,
      sports: [titleCase(queue.sport)],
      venue: queue.venue,
      startTime: queue.startTime,
      spotsLeft,
      meta: `${queue.time} · ${spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}`,
      to: `/queues?queue=${queue.id}`,
    }]
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

  return {
    places: [...courtPlaces, ...queuePlaces, ...clubPlaces],
    counts: { courts: courtPlaces.length, queues: queuePlaces.length, clubs: clubPlaces.length },
  }
}

export { formatDistance, titleCase }
