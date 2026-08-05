/// Single fetch path for the whole app — the web counterpart of the Flutter
/// player's `ApiClient` singleton (lib/data/api_client.dart). Attaches the
/// stored bearer token the same way, so calls that are public when signed out
/// transparently return the personalized shape once a player logs in.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const TOKEN_KEY = 'vc-auth-token'

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

export async function apiRequest(path, { query, auth = true, signal, ...options } = {}) {
  const token = auth ? authToken() : null
  let response
  try {
    response = await fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      ...options,
      signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
