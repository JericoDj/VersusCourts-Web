/// Single fetch path for the whole app — the web counterpart of the Flutter
/// player's `ApiClient` singleton (lib/data/api_client.dart). Attaches the
/// stored bearer token the same way, so calls that are public when signed out
/// transparently return the personalized shape once a player logs in.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const TOKEN_KEY = 'vc-auth-token'

/// Mirrors `ApiClient.actingAsCoach` in the Flutter app: while coach mode is
/// open, club actions (join, post, "my clubs") belong to the coach identity.
/// The backend only reads `X-Acting-As` in the clubs module, so the header
/// goes on `/clubs` calls only — a custom header forces a CORS preflight, and
/// an API whose CORS config doesn't list it would otherwise reject every
/// coach-mode request.
let actingAsCoach = false
let coachHeaderBlocked = false
export const setActingAsCoach = (value) => { actingAsCoach = Boolean(value) }
export const isActingAsCoach = () => actingAsCoach
const wantsCoachHeader = (path) => actingAsCoach && !coachHeaderBlocked && /^\/clubs(\/|\?|$)/.test(path)

/// Club routes whose result depends on *who* is acting (`@ActingAsCoach` in
/// clubs.module.ts). These must never silently fall back to the player
/// account — that would mix the coach's and the player's clubs.
const IDENTITY_CLUB_ROUTES = [
  ['GET', /^\/clubs\/mine(\?|$)/],
  ['POST', /^\/clubs\/?(\?|$)/],
  ['POST', /^\/clubs\/join-by-code(\?|$)/],
  ['POST', /^\/clubs\/[^/]+\/(join|request|leave|posts)(\?|$)/],
  ['POST', /^\/clubs\/posts\/[^/]+\/comments(\?|$)/],
]
const dependsOnIdentity = (path, method = 'GET') =>
  IDENTITY_CLUB_ROUTES.some(([m, re]) => m === String(method).toUpperCase() && re.test(path))

const coachClubsBlocked = () => {
  const error = new Error('Coach clubs need the latest Versus Courts server update. Please try again later.')
  error.status = 0
  error.coachHeaderBlocked = true
  return error
}

export const authToken = () => {
  const token = localStorage.getItem(TOKEN_KEY)
  return !token || token === 'undefined' || token === 'null' ? null : token
}

const buildQuery = (params) => {
  const search = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export async function apiRequest(path, options = {}) {
  if (actingAsCoach && coachHeaderBlocked && dependsOnIdentity(path, options.method)) {
    throw coachClubsBlocked()
  }
  try {
    return await sendRequest(path, options, wantsCoachHeader(path))
  } catch (error) {
    // Preflight rejected (API not yet allowing X-Acting-As): remember it.
    // Identity-scoped club calls fail loudly; anything else (e.g. browsing
    // all clubs) retries without the header, since the backend ignores it there.
    if (error.status === 0 && wantsCoachHeader(path)) {
      coachHeaderBlocked = true
      if (dependsOnIdentity(path, options.method)) {
        throw coachClubsBlocked()
      }
      return sendRequest(path, options, false)
    }
    throw error
  }
}

async function sendRequest(path, { query, auth = true, signal, ...options } = {}, coachHeader = false) {
  const token = auth ? authToken() : null
  let response
  try {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    const isObject = options.body && typeof options.body === 'object' && !isFormData
    const body = isObject ? JSON.stringify(options.body) : options.body

    response = await fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      ...options,
      body,
      signal,
      headers: {
        Accept: 'application/json',
        ...(isFormData ? {} : options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(token && coachHeader ? { 'X-Acting-As': 'coach' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    const networkError = new Error('Unable to reach Versus Courts. Please try again.')
    networkError.status = 0
    throw networkError
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message
    const error = new Error(message || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return payload
}

/// List endpoints occasionally answer `{ data: [...] }` instead of a bare
/// array; every caller here wants the array either way.
export const apiList = async (path, options) => {
  const payload = await apiRequest(path, options)
  if (Array.isArray(payload)) return payload
  return Array.isArray(payload?.data) ? payload.data : []
}

export { API_BASE }
