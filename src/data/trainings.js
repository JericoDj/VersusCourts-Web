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

/// SCHEDULED = a set date players join. PRIVATE (one-on-one) and GROUP
/// (a player's group, up to `capacity`, priced per player) are "bookable":
/// no date, players book sessions any time, and they use no training credits.
export const TRAINING_KINDS = [
  { id: 'SCHEDULED', label: 'Scheduled', caption: 'Set dates' },
  { id: 'PRIVATE', label: 'Private', caption: '1-on-1 · anytime' },
  { id: 'GROUP', label: 'Group', caption: 'Groups · anytime' },
]
export const kindLabel = (kind) => TRAINING_KINDS.find((k) => k.id === kind)?.label || 'Scheduled'
const kindOf = (json) => {
  const k = String(json.kind || 'SCHEDULED').toUpperCase()
  return TRAINING_KINDS.some((x) => x.id === k) ? k : 'SCHEDULED'
}
export const isBookableKind = (kind) => kind === 'PRIVATE' || kind === 'GROUP'

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
  const kind = kindOf(json)

  return {
    id: String(json.id ?? ''),
    kind,
    // No date: `startTime` is when it was listed. Players book sessions.
    isBookable: isBookableKind(kind),
    isGroup: kind === 'GROUP',
    seriesId: json.seriesId || null,
    // Bundles on sale — on this listing, or on its series (Scheduled).
    packages: (Array.isArray(json.packages) ? json.packages : []).map(normalizePackageOffer),
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
  const kind = kindOf(json)
  const isBookable = isBookableKind(kind)
  // Bookable listings: live bookings (PENDING/CONFIRMED) for the list badges.
  const liveBookings = (Array.isArray(json.bookings) ? json.bookings : []).map((b) => ({
    status: String(b.status || '').toUpperCase(),
    start: new Date(b.scheduledStart || b.preferredStart),
  }))
  const nextSession = liveBookings
    .filter((b) => b.status === 'CONFIRMED' && b.start > new Date())
    .sort((a, b) => a.start - b.start)[0]?.start || null
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
    kind,
    isBookable,
    isGroup: kind === 'GROUP',
    pendingBookings: liveBookings.filter((b) => b.status === 'PENDING').length,
    pendingPackages: Number(json.pendingPackages) || 0,
    seriesId: json.seriesId || null,
    seriesCount: Number(json.seriesCount) || 1,
    canHavePackages: isBookable || Boolean(json.seriesId),
    confirmedBookings: liveBookings.filter((b) => b.status === 'CONFIRMED').length,
    nextSession,
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
    // Mirrors `PATCH /coach/trainings/:id/complete` eligibility; bookable
    // listings complete per session instead.
    canComplete: !isBookable && (status === 'ONGOING' || (status === 'SCHEDULED' && startTime <= new Date())),
  }
}

// ─── Bookings (sessions booked from a PRIVATE/GROUP training) ───────────

export const BOOKING_STATUS = {
  PROCESSING: { label: 'Awaiting payment', tone: 'warn', open: true },
  PENDING: { label: 'Requested', tone: 'warn', open: true },
  CONFIRMED: { label: 'Confirmed', tone: 'ok', open: true },
  COMPLETED: { label: 'Completed', tone: 'primary', open: false },
  DECLINED: { label: 'Declined', tone: 'danger', open: false },
  CANCELLED: { label: 'Cancelled', tone: 'muted', open: false },
}

/// Web port of lib/data/models/training_booking.dart.
export function normalizeBooking(j = {}) {
  const status = BOOKING_STATUS[String(j.status || '').toUpperCase()] ? String(j.status).toUpperCase() : 'PENDING'
  const preferredStart = j.preferredStart ? new Date(j.preferredStart) : new Date()
  const scheduledStart = j.scheduledStart ? new Date(j.scheduledStart) : null
  const paysCash = String(j.paymentMethod || '').toUpperCase() === 'CASH'
  const isPaid = String(j.paymentStatus || '').toUpperCase() === 'PAID'
  const amountPaid = Number(j.amountPaid) || 0
  const isFree = amountPaid === 0 && !(Number(j.discountAmount) > 0)
  const sessionStart = scheduledStart || preferredStart
  return {
    id: String(j.id ?? ''),
    trainingId: String(j.trainingId ?? j.training?.id ?? ''),
    trainingTitle: j.training?.title || '',
    userId: String(j.userId ?? j.user?.id ?? ''),
    playerName: fullName(j.user) || 'Player',
    playerAvatarUrl: j.user?.avatarUrl || '',
    preferredStart,
    scheduledStart,
    sessionStart,
    wasRescheduled: Boolean(scheduledStart) && scheduledStart.getTime() !== preferredStart.getTime(),
    durationHours: Number(j.durationHours) || 1,
    players: Number(j.players) || 1,
    note: j.note || '',
    coachNote: j.coachNote || '',
    status,
    isOpen: BOOKING_STATUS[status].open,
    paysCash,
    isPaid,
    isFree,
    amountPaid,
    couponCode: j.couponCode || '',
    createdAt: j.createdAt ? new Date(j.createdAt) : new Date(),
    paymentLabel: isFree ? 'Free' : paysCash ? (isPaid ? 'Paid · Cash' : 'Cash on the day') : isPaid ? 'Paid · QR Ph' : 'QR Ph · awaiting payment',
    /// QR money that would come back on cancel (needs the app's refund flow).
    refundable: !paysCash && isPaid ? amountPaid : 0,
    canComplete: status === 'CONFIRMED' && sessionStart <= new Date(),
  }
}

/// Free or cash bookings (QR Ph is paid in the app). `players` for GROUP.
export const bookTraining = async (id, { preferredStart, players = 1, note, paymentMethod, couponCode }) =>
  normalizeBooking(await apiRequest(`/trainings/${encodeURIComponent(id)}/bookings`, {
    method: 'POST',
    body: {
      preferredStart: preferredStart.toISOString(),
      ...(players > 1 ? { players } : {}),
      ...(note?.trim() ? { note: note.trim() } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(couponCode ? { couponCode } : {}),
    },
  }))
export const fetchMyBookings = async (id) =>
  (await apiList(`/trainings/${encodeURIComponent(id)}/bookings/mine`)).map(normalizeBooking)
export const cancelBooking = async (bookingId) =>
  normalizeBooking(await apiRequest(`/trainings/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: 'PATCH', body: {} }))

/// "Sat, Oct 10 · 9:00 AM".
export const formatSessionTime = (date) =>
  `${formatTrainingDate(date)} · ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)}`

// ─── Training packages ("10 sessions · ₱4,500") ─────────────────────────

export function normalizePackageOffer(p = {}) {
  const sessions = Number(p.sessions) || 0
  const price = Number(p.price) || 0
  const validityDays = p.validityDays == null ? null : Number(p.validityDays)
  return {
    id: String(p.id ?? ''),
    sessions,
    price,
    validityDays,
    perSession: sessions ? price / sessions : 0,
    validityLabel: validityDays == null ? 'No expiry' : `Use within ${validityDays} days`,
  }
}
export const packageSizeLabel = (offer, durationHours = 1) => {
  const hours = offer.sessions * (durationHours || 1)
  return `${offer.sessions} sessions · ${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

export const PACKAGE_STATUS = {
  PROCESSING: { label: 'Awaiting payment', tone: 'warn', open: true },
  PENDING: { label: 'Waiting for coach', tone: 'warn', open: true },
  ACTIVE: { label: 'Active', tone: 'ok', open: true },
  DECLINED: { label: 'Declined', tone: 'danger', open: false },
  CANCELLED: { label: 'Cancelled', tone: 'muted', open: false },
  EXPIRED: { label: 'Expired', tone: 'muted', open: false },
}

/// Web port of lib/data/models/training_package.dart `PackagePurchase`.
export function normalizePurchase(j = {}) {
  const status = PACKAGE_STATUS[String(j.status || '').toUpperCase()] ? String(j.status).toUpperCase() : 'PENDING'
  const now = new Date()
  const sessions = (Array.isArray(j.sessions) ? j.sessions : []).map((x) => {
    const start = new Date(x.start)
    const st = String(x.status || '').toUpperCase()
    return {
      id: String(x.id ?? ''),
      trainingId: String(x.trainingId ?? ''),
      status: st,
      start,
      durationHours: Number(x.durationHours) || 1,
      isSeriesDate: x.kind === 'DATE',
      isDone: st === 'COMPLETED' || start <= now,
      isPending: st === 'PENDING',
    }
  })
  const sessionsTotal = Number(j.sessionsTotal) || 0
  const sessionsLeft = Number(j.sessionsLeft) || 0
  const paysCash = String(j.paymentMethod || '').toUpperCase() === 'CASH'
  const isPaid = String(j.paymentStatus || '').toUpperCase() === 'PAID'
  const amountPaid = Number(j.amountPaid) || 0
  const expiresAt = j.expiresAt ? new Date(j.expiresAt) : null
  const upcoming = sessions.filter((x) => !x.isDone)
  return {
    id: String(j.id ?? ''),
    title: j.title || 'Training package',
    trainingId: j.trainingId || null,
    seriesId: j.seriesId || null,
    isSeries: Boolean(j.seriesId),
    sessionsTotal,
    sessionsLeft,
    sessionsScheduled: sessionsTotal - sessionsLeft,
    sessionsDone: sessions.filter((x) => x.isDone).length,
    players: Number(j.players) || 1,
    status,
    isOpen: PACKAGE_STATUS[status].open,
    paysCash,
    isPaid,
    amountPaid,
    expiresAt,
    note: j.note || '',
    coachNote: j.coachNote || '',
    playerName: fullName(j.user) || 'Player',
    playerAvatarUrl: j.user?.avatarUrl || '',
    createdAt: j.createdAt ? new Date(j.createdAt) : now,
    sessions,
    upcoming,
    canSchedule: status === 'ACTIVE' && sessionsLeft > 0 && (!expiresAt || expiresAt > now),
    /// Unused QR value a cancel gives back (approximate — the server decides).
    refundOnCancel: !paysCash && isPaid && sessionsTotal ? Math.round((amountPaid / sessionsTotal) * (sessionsLeft + upcoming.length)) : 0,
  }
}

export const fetchSeriesDates = async (id) =>
  (await apiList(`/trainings/${encodeURIComponent(id)}/series-dates`)).map((d) => ({
    id: String(d.id),
    start: new Date(d.startTime),
    spotsLeft: Number(d.spotsLeft) || 0,
    mine: Boolean(d.mine),
    available: !d.mine && Number(d.spotsLeft) > 0,
  }))
export const fetchMyPackages = async (id) =>
  (await apiList(`/trainings/${encodeURIComponent(id)}/packages/mine`)).map(normalizePurchase)
/// `starts` (Private/Group) or `trainingIds` (series dates) picked now.
export const buyPackage = async (id, packageId, { players = 1, starts = [], trainingIds = [], note, paymentMethod, paymentIntentId, clientKey, couponCode } = {}) =>
  normalizePurchase(await apiRequest(`/trainings/${encodeURIComponent(id)}/packages/${encodeURIComponent(packageId)}/buy`, {
    method: 'POST',
    body: {
      ...(players > 1 ? { players } : {}),
      ...(starts.length ? { starts: starts.map((d) => d.toISOString()) } : {}),
      ...(trainingIds.length ? { trainingIds } : {}),
      ...(note?.trim() ? { note: note.trim() } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(paymentIntentId ? { paymentIntentId, clientKey } : {}),
      ...(couponCode ? { couponCode } : {}),
    },
  }))
export const confirmPackagePayment = async (purchaseId) =>
  normalizePurchase(await apiRequest(`/trainings/package-purchases/${encodeURIComponent(purchaseId)}/confirm-payment`, { method: 'PATCH' }))
export const schedulePackageSession = async (purchaseId, { start, trainingId, note } = {}) =>
  normalizePurchase(await apiRequest(`/trainings/package-purchases/${encodeURIComponent(purchaseId)}/sessions`, {
    method: 'POST',
    body: { ...(start ? { start: start.toISOString() } : {}), ...(trainingId ? { trainingId } : {}), ...(note?.trim() ? { note: note.trim() } : {}) },
  }))
export const cancelPackage = async (purchaseId) =>
  normalizePurchase(await apiRequest(`/trainings/package-purchases/${encodeURIComponent(purchaseId)}/cancel`, { method: 'PATCH', body: {} }))

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
  /// `{ active, upcoming, past }` — admin-created incentives for me, with my progress.
  incentives: () => apiRequest('/coach/incentives'),
  confirmCash: (id, userId) => patch(`/trainings/${id}/participants/${userId}/confirm-cash`),
  declineCash: (id, userId) => patch(`/trainings/${id}/participants/${userId}/decline-cash`),
  // Bookable (PRIVATE/GROUP) listings: their booked sessions.
  bookings: async (id) => (await apiList(`/coach/trainings/${id}/bookings`)).map(normalizeBooking),
  acceptBooking: async (id, bookingId, { scheduledStart, coachNote } = {}) =>
    normalizeBooking(await patch(`/coach/trainings/${id}/bookings/${bookingId}/accept`, {
      ...(scheduledStart ? { scheduledStart: scheduledStart.toISOString() } : {}),
      ...(coachNote?.trim() ? { coachNote: coachNote.trim() } : {}),
    })),
  declineBooking: async (id, bookingId, reason) =>
    normalizeBooking(await patch(`/coach/trainings/${id}/bookings/${bookingId}/decline`, reason?.trim() ? { reason: reason.trim() } : undefined)),
  bookingSettlementPreview: (id, bookingId) => apiRequest(`/coach/trainings/${id}/bookings/${bookingId}/settlement-preview`),
  completeBooking: (id, bookingId) => patch(`/coach/trainings/${id}/bookings/${bookingId}/complete`),
  // Training packages
  packages: async (id) => {
    const res = await apiRequest(`/coach/trainings/${id}/packages`)
    return {
      packages: (res?.packages || []).map(normalizePackageOffer),
      purchases: (res?.purchases || []).map(normalizePurchase),
    }
  },
  acceptPackage: async (purchaseId, coachNote) =>
    normalizePurchase(await patch(`/coach/package-purchases/${purchaseId}/accept`, coachNote?.trim() ? { coachNote: coachNote.trim() } : {})),
  declinePackage: async (purchaseId, reason) =>
    normalizePurchase(await patch(`/coach/package-purchases/${purchaseId}/decline`, reason?.trim() ? { reason: reason.trim() } : {})),
  extendPackage: async (purchaseId, days) => normalizePurchase(await patch(`/coach/package-purchases/${purchaseId}/extend`, { days })),
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
