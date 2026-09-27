import { apiList, apiRequest } from './apiClient'
import { sportFromApi } from './sports'

/// Web port of the Flutter player's training models and calls:
///   - `normalizeTraining`      ← lib/data/models/training.dart (`GET /trainings[/:id]`)
///   - `normalizeCoachTraining` ← lib/data/models/coach_training.dart (`GET /coach/trainings`)
/// plus the endpoints `TrainingProvider` and `CoachProvider` call.

/// The canonical share URL — identical to the one the mobile app shares, so a
/// link copied from either client opens the same bridge page.
export const trainingShareUrl = (id) => `https://versuscourts.com/t/${encodeURIComponent(id)}`

export const trainingAppUrl = (id) => `versuscourts://training/${encodeURIComponent(id)}`

/// "₱75" or "₱3.75" — whole pesos drop the decimals (coach_training.dart `formatPeso`).
export const formatPeso = (value) => {
  const n = Number(value) || 0
  return n % 1 === 0 ? `₱${n.toFixed(0)}` : `₱${n.toFixed(2)}`
}

export const SKILLS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']

/// 'Beginner' from 'BEGINNER'.
export const skillLabel = (skill) => {
  const s = String(skill || '')
  return s ? s[0] + s.slice(1).toLowerCase() : ''
}

export const TRAINING_STATUS_LABEL = {
  SCHEDULED: 'Scheduled',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

/// Versus keeps 15% of everything collected — mirrors `Training.commissionRate`.
export const COMMISSION_RATE = 0.15
export const commissionFor = (amount) => Math.round(amount * COMMISSION_RATE * 100) / 100

const fullName = (user) =>
  [user?.firstName, user?.lastName].filter((n) => typeof n === 'string' && n.trim()).join(' ').trim()

/// Player-facing training (the public browse feed shape).
export function normalizeTraining(json = {}) {
  const coach = json.coach || null
  const identity = coach?.coachProfile || null
  const court = json.court || null
  const branch = court?.branch || null
  const org = branch?.organization || null
  const count = json._count || {}
  const countParticipants = Number(count.participants) || 0

  const participantIds = []
  const participants = []
  const confirmed = new Set()
  const requested = new Set()
  const cash = new Set()

  for (const item of Array.isArray(json.participants) ? json.participants : []) {
    const isObj = item && typeof item === 'object'
    const user = isObj ? item.user : null
    const uid = String((isObj ? item.userId ?? user?.id ?? item.id : item) ?? '')
    if (!uid) continue
    const status = String(isObj ? item.status || '' : '').toUpperCase()
    const method = String(isObj ? item.paymentMethod || '' : '').toUpperCase()
    // CANCELLED rows (declined cash, left, abandoned QR) aren't participants.
    if (status === 'CANCELLED') continue
    participantIds.push(uid)
    const isCash = method === 'CASH'
    if (isCash) cash.add(uid)
    const isPending = status === 'PROCESSING' || status === 'REQUESTED'
    const isJoined = status === 'JOINED'
    if (isPending) requested.add(uid)
    else if (isJoined) confirmed.add(uid)
    else if (!status) {
      // Older servers omit status — same fallback as the Flutter model.
      if (isCash || countParticipants === 0) requested.add(uid)
      else confirmed.add(uid)
    }
    participants.push({
      userId: uid,
      name: fullName(user) || user?.name || user?.username || 'Player',
      avatarUrl: user?.avatarUrl || '',
      isCash,
      isJoined,
      isTentative: requested.has(uid),
    })
  }

  const coachName = identity?.name?.trim() || fullName(coach) || 'Coach'
  const capacity = Number(json.capacity) || 0
  const participantCount = count.participants != null ? countParticipants : confirmed.size

  return {
    id: String(json.id ?? ''),
    title: json.title || '',
    description: json.description || '',
    images: Array.isArray(json.images) ? json.images : [],
    imageUrl: Array.isArray(json.images) && json.images.length ? json.images[0] : '',
    businessId: String(org?.id ?? ''),
    // Coach-run trainings at an unlisted spot have no business.
    businessName: org?.name || json.customCourtName || 'Coach-run',
    courtName: court?.name || json.customCourtName || '',
    area: branch?.area || branch?.address || json.customArea || '',
    coachName,
    coachAvatarUrl: identity?.avatarUrl || coach?.avatarUrl || '',
    coachUserId: String(coach?.id ?? ''),
    coachProfileId: String(identity?.id ?? ''),
    startTime: json.startTime ? new Date(json.startTime) : new Date(),
    // `playerPrice` is what the player pays; older servers only send pricePerPlayer.
    price: Number(json.playerPrice ?? json.pricePerPlayer ?? 0) || 0,
    durationHours: Number(json.durationHours) || 1,
    sport: sportFromApi(json.sport),
    skill: String(json.skill || ''),
    status: String(json.status || 'SCHEDULED').toUpperCase(),
    capacity,
    participantCount,
    spotsLeft: Math.max(0, capacity - participantCount),
    isFull: capacity > 0 && participantCount >= capacity,
    participantIds,
    participants,
    confirmedIds: confirmed,
    requestedIds: requested,
    cashIds: cash,
  }
}

/// My relationship to a player-facing training.
export function trainingRole(training, userId) {
  if (!training || !userId) return 'none'
  if (training.coachUserId === userId) return 'coach'
  if (training.confirmedIds.has(userId)) return 'joined'
  if (training.requestedIds.has(userId)) return 'requested'
  return 'none'
}

/// Coach-side training (`/coach/trainings`) — flat, with students.
export function normalizeCoachTraining(json = {}) {
  const court = json.court || null
  const branch = court?.branch || null
  const count = json._count || {}
  const capacity = Number(json.capacity ?? 8)
  const participantCount = Number(count.participants) || 0
  const price = Number(json.pricePerPlayer) || 0
  const startTime = json.startTime ? new Date(json.startTime) : new Date()
  const status = String(json.status || 'SCHEDULED').toUpperCase()
  const students = (Array.isArray(json.participants) ? json.participants : [])
    .filter((p) => p && typeof p === 'object')
    .map((p) => {
      const user = p.user || null
      const paysCash = String(p.paymentMethod || '').toUpperCase() === 'CASH'
      const st = String(p.status || '').toUpperCase()
      return {
        userId: String(p.userId ?? user?.id ?? ''),
        name: fullName(user) || 'Player',
        avatarUrl: user?.avatarUrl || '',
        status: st,
        paysCash,
        isPendingCash: paysCash && (st === 'PROCESSING' || st === 'REQUESTED'),
      }
    })
    .filter((s) => s.status !== 'CANCELLED')
  const revenue = price * participantCount

  return {
    id: String(json.id ?? ''),
    title: json.title || '',
    description: json.description || '',
    images: Array.isArray(json.images) ? json.images : [],
    imageUrl: Array.isArray(json.images) && json.images.length ? json.images[0] : '',
    sport: sportFromApi(json.sport),
    skill: String(json.skill || 'BEGINNER').toUpperCase(),
    capacity,
    pricePerPlayer: price,
    startTime,
    durationHours: Number(json.durationHours) || 1,
    status,
    courtId: String(json.courtId ?? court?.id ?? ''),
    // Null court = a custom spot picked by the coach/Host.
    courtName: court?.name || json.customCourtName || 'Court',
    isCustomVenue: !court,
    area: branch?.area || branch?.address || json.customArea || '',
    customLat: json.customLat ?? null,
    customLng: json.customLng ?? null,
    participantCount,
    spotsLeft: Math.max(0, capacity - participantCount),
    isFull: capacity > 0 && participantCount >= capacity,
    students,
    totalRevenue: revenue,
    estimatedEarnings: revenue - commissionFor(revenue),
    // Mirrors `PATCH /coach/trainings/:id/complete` eligibility.
    canComplete: status === 'ONGOING' || (status === 'SCHEDULED' && startTime <= new Date()),
  }
}

// ─── Player endpoints (TrainingProvider) ────────────────────────────────

export const fetchTrainings = async (sport) =>
  (await apiList('/trainings', { query: { sport: sport && sport !== 'all' ? sport.toUpperCase() : undefined } })).map(normalizeTraining)

export const fetchMyTrainings = async () => (await apiList('/trainings/mine')).map(normalizeTraining)

export const fetchTraining = async (id) => normalizeTraining(await apiRequest(`/trainings/${encodeURIComponent(id)}`))

const post = (path, body) => apiRequest(path, { method: 'POST', body })
const patch = (path, body) => apiRequest(path, { method: 'PATCH', body })

export const joinTraining = async (id) => normalizeTraining(await post(`/trainings/${id}/join`))
export const joinTrainingCash = async (id, couponCode) =>
  normalizeTraining(await post(`/trainings/${id}/join`, { paymentMethod: 'CASH', ...(couponCode ? { couponCode } : {}) }))
export const cancelTrainingJoin = async (id) => normalizeTraining(await patch(`/trainings/${id}/join/cancel`))
export const leaveTraining = async (id) => normalizeTraining(await post(`/trainings/${id}/leave`, {}))
export const fetchRefundQuote = (id) => apiRequest(`/trainings/${id}/refund-quote`)

export const fetchMyCoachReview = (coachProfileId) =>
  apiRequest('/reviews/mine', { query: { targetType: 'COACH', targetId: coachProfileId } }).catch(() => null)
export const rateCoach = (coachProfileId, rating, text) =>
  post('/reviews', { targetType: 'COACH', targetId: coachProfileId, rating, ...(text?.trim() ? { text: text.trim() } : {}) })

// ─── Coach endpoints (CoachProvider) ───────────────────────────────────

export const coachApi = {
  businesses: () => apiList('/coach/businesses'),
  profile: () => apiRequest('/coach/profile'),
  saveProfile: (body) => patch('/coach/profile', body),
  overview: () => apiRequest('/coach/overview'),
  trainings: async () => (await apiList('/coach/trainings')).map(normalizeCoachTraining),
  create: (body) => post('/coach/trainings', body),
  update: (id, body) => patch(`/coach/trainings/${id}`, body),
  start: (id) => patch(`/coach/trainings/${id}/start`),
  settlementPreview: (id) => apiRequest(`/coach/trainings/${id}/settlement-preview`),
  complete: (id) => patch(`/coach/trainings/${id}/complete`),
  cancel: (id, reason) => patch(`/coach/trainings/${id}/cancel`, reason?.trim() ? { reason: reason.trim() } : undefined),
  /// `{ current, upcoming }` — admin-created incentives for me (display only).
  incentives: () => apiRequest('/coach/incentives'),
  confirmCash: (id, userId) => patch(`/trainings/${id}/participants/${userId}/confirm-cash`),
  declineCash: (id, userId) => patch(`/trainings/${id}/participants/${userId}/decline-cash`),
  /// Listed courts that offer coaching (`CoachProvider.searchCourts`).
  searchCourts: async (q) => {
    const list = await apiList('/courts', { query: { q: q?.trim() || undefined, limit: 20 } })
    return list
      .filter((c) => c.offersCoaching)
      .map((c) => ({
        id: String(c.id),
        name: c.name || 'Court',
        area: c.branch?.area || c.address || '',
        organizationName: c.branch?.organization?.name || '',
      }))
  },
}

/// Shares via the Web Share API when available, otherwise copies the link.
/// Resolves to 'shared' | 'copied' | 'cancelled'.
export async function shareTraining(training) {
  const url = trainingShareUrl(training.id)
  const title = training.title?.trim() || 'Training'
  const text = `Join "${title}" on Versus Courts`
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled'
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}

export const formatTrainingDate = (date) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date)

export const formatTrainingTimeRange = (date, hours) => {
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
  const end = new Date(date.getTime() + (hours || 1) * 3600_000)
  return `${fmt.format(date)} – ${fmt.format(end)}`
}
