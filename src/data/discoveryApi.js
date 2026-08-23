export const DEFAULT_DISCOVERY_CENTER = { lat: 14.676, lng: 121.0437 }

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/+$/, '')

const asNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const hasCoordinates = (lat, lng) =>
  lat !== null && lng !== null && lat !== 0 && lng !== 0

const titleCase = (value = '') =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const unique = (values) => [...new Set(values.filter(Boolean))]

const formatMoney = (value) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(value || 0)

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Schedule to be announced'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

async function getJson(path, signal) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error(`Discovery request failed (${response.status})`)
  const body = await response.json()
  return Array.isArray(body) ? body : []
}

function normalizeBusinesses(courts) {
  const groups = new Map()

  courts.forEach((court) => {
    const branch = court.branch || {}
    const organization = branch.organization || {}
    const organizationId = organization.id || ''
    const key = organizationId || `court:${court.id}`
    const lat = asNumber(branch.lat ?? court.lat)
    const lng = asNumber(branch.lng ?? court.lng)
    if (!hasCoordinates(lat, lng)) return

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        kind: 'court',
        label: organization.name || branch.name || court.name || 'Sports court',
        logoUrl: organization.logoUrl || court.logoUrl || '',
        coverUrl: organization.coverUrl || court.imageUrl || '',
        lat,
        lng,
        courts: [],
        sports: [],
        distanceKm: null,
        minPrice: null,
        isOpen: false,
        area: branch.area || branch.address || court.address || '',
        to: organizationId ? `/venues?business=${organizationId}` : `/venues?court=${court.id}`,
      })
    }

    const business = groups.get(key)
    business.courts.push(court)
    business.sports = unique([...business.sports, ...(court.sports || [])])
    business.isOpen ||= court.status === 'OPEN' || court.isOpen === true
    const price = asNumber(court.pricePerHour ?? court.priceMin)
    if (price !== null) {
      business.minPrice =
        business.minPrice === null ? price : Math.min(business.minPrice, price)
    }
    const distance = asNumber(court.distanceKm)
    if (distance !== null) {
      business.distanceKm =
        business.distanceKm === null
          ? distance
          : Math.min(business.distanceKm, distance)
    }
    if (!business.coverUrl && court.imageUrl) business.coverUrl = court.imageUrl
  })

  return [...groups.values()].map((business) => ({
    ...business,
    sports: business.sports.map(titleCase),
    meta: `${business.courts.length} court${business.courts.length === 1 ? '' : 's'}${
      business.minPrice === null ? '' : ` · from ₱${formatMoney(business.minPrice)}/hr`
    }`,
  }))
}

function normalizeClubs(clubs) {
  return clubs.flatMap((club) => {
    const lat = asNumber(club.lat)
    const lng = asNumber(club.lng)
    if (!hasCoordinates(lat, lng)) return []
    const members = Number(club._count?.members ?? club.members ?? 0)
    const sports = (club.sports || []).map(titleCase)
    return [{
      id: club.id,
      kind: 'club',
      label: club.name || 'Sports club',
      logoUrl: club.logoUrl || '',
      coverUrl: club.bannerUrl || '',
      lat,
      lng,
      sports,
      members,
      rating: asNumber(club.rating) ?? 0,
      area: club.area || '',
      isPrivate: club.visibility === 'PRIVATE',
      meta: `${members.toLocaleString()} member${members === 1 ? '' : 's'}${
        sports[0] ? ` · ${sports[0]}` : ''
      }`,
      to: `/clubs?club=${club.id}`,
    }]
  })
}

function textMatches(left, right) {
  const a = String(left || '').trim().toLowerCase()
  const b = String(right || '').trim().toLowerCase()
  return a.length >= 4 && b.length >= 4 && (a === b || a.includes(b) || b.includes(a))
}

function resolveQueueCoordinates(queue, courts, businesses) {
  const branch = queue.court?.branch || {}
  let lat = asNumber(branch.lat ?? queue.customLat)
  let lng = asNumber(branch.lng ?? queue.customLng)
  if (hasCoordinates(lat, lng)) return { lat, lng }

  const courtName = queue.court?.name || queue.customCourtName || ''
  const businessName = branch.organization?.name || ''
  const matchedCourt = courts.find((court) =>
    textMatches(court.name, courtName)
    || textMatches(court.branch?.organization?.name, businessName || courtName))
  if (matchedCourt) {
    lat = asNumber(matchedCourt.branch?.lat)
    lng = asNumber(matchedCourt.branch?.lng)
  }

  if (!hasCoordinates(lat, lng)) {
    const matchedBusiness = businesses.find((business) =>
      textMatches(business.label, businessName || courtName))
    lat = matchedBusiness?.lat ?? null
    lng = matchedBusiness?.lng ?? null
  }
  return { lat, lng }
}

function normalizeQueues(queues, courts, businesses) {
  const now = Date.now()
  return queues.flatMap((queue) => {
    const startTime = new Date(queue.startTime).getTime()
    if (
      !['OPEN', 'FULL'].includes(queue.status)
      || !Number.isFinite(startTime)
      || startTime <= now
    ) return []

    const { lat, lng } = resolveQueueCoordinates(queue, courts, businesses)
    if (!hasCoordinates(lat, lng)) return []
    const joined = Number(queue._count?.participants ?? 0)
    const needed = Number(queue.playersNeeded ?? 0)
    const spotsLeft = Math.max(0, needed - joined)
    const sport = titleCase(queue.sport || 'Open Play')
    const venue =
      queue.court?.branch?.organization?.name
      || queue.court?.name
      || queue.customCourtName
      || queue.customArea
      || 'Venue to be announced'

    return [{
      id: queue.id,
      kind: 'queue',
      label: queue.title?.trim() || `${sport} Queue`,
      lat,
      lng,
      sports: [sport],
      venue,
      startTime: queue.startTime,
      spotsLeft,
      playersNeeded: needed,
      joined,
      meta: `${formatDate(queue.startTime)} · ${
        spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`
      }`,
      to: `/queues?queue=${queue.id}`,
    }]
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
}

export async function fetchDiscoveryPlaces({
  lat = DEFAULT_DISCOVERY_CENTER.lat,
  lng = DEFAULT_DISCOVERY_CENTER.lng,
  signal,
} = {}) {
  const encodedLat = encodeURIComponent(lat)
  const encodedLng = encodeURIComponent(lng)
  const requests = await Promise.allSettled([
    Promise.resolve([]),
    getJson(`/clubs?lat=${encodedLat}&lng=${encodedLng}`, signal),
    getJson('/queues', signal),
  ])

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const [courtsResult, clubsResult, queuesResult] = requests
  const courts = courtsResult.status === 'fulfilled' ? courtsResult.value : []
  const clubs = clubsResult.status === 'fulfilled' ? clubsResult.value : []
  const queues = queuesResult.status === 'fulfilled' ? queuesResult.value : []
  const businesses = normalizeBusinesses(courts)
  const normalizedClubs = normalizeClubs(clubs)
  const normalizedQueues = normalizeQueues(queues, courts, businesses)
  const failedRequests = requests.filter((request) => request.status === 'rejected').length

  if (failedRequests === requests.length) {
    throw new Error('Discovery is unavailable right now')
  }

  return {
    places: [...businesses, ...normalizedQueues, ...normalizedClubs],
    partial: failedRequests > 0,
    counts: {
      courts: businesses.length,
      queues: normalizedQueues.length,
      clubs: normalizedClubs.length,
    },
  }
}

export { formatDate, formatMoney }
