import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const TOKEN_KEY = 'vc-auth-token'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const initials = (firstName = '', lastName = '') => `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'VC'
const toPlayerUser = (user) => {
  const [firstName = 'Player', ...last] = (user.name || '').trim().split(/\s+/)
  const emailPrefix = user.email?.split('@')[0] || 'player'
  return {
    ...user,
    firstName: user.firstName || firstName,
    name: user.name || `${user.firstName || firstName} ${user.lastName || last.join(' ') || ''}`.trim(),
    handle: user.handle || `@${user.username || emailPrefix}`,
    location: user.location || 'Metro Manila',
    initials: user.initials || initials(user.firstName || firstName, user.lastName || last.join(' ')),
  }
}

async function request(path, { token, ...options } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
  } catch {
    throw new Error('Unable to reach Versus Courts. Please try again.')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message
    throw new Error(message || 'Something went wrong. Please try again.')
  }
  return payload
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const startSession = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token)
    setUser(toPlayerUser(session.user))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return undefined
    request('/auth/me', { token })
      .then((remoteUser) => setUser(toPlayerUser(remoteUser)))
      .catch(clearSession)
      .finally(() => setIsLoading(false))
    return undefined
  }, [clearSession])

  const signIn = useCallback(async ({ email, password }) => {
    const session = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    startSession(session)
    return session.user
  }, [startSession])

  const signUp = useCallback(async ({ name, email, password }) => {
    const [firstName, ...lastName] = name.trim().split(/\s+/)
    const session = await request('/auth/register', { method: 'POST', body: JSON.stringify({ firstName, lastName: lastName.join(' '), email, password, role: 'PLAYER' }) })
    startSession(session)
    return session.user
  }, [startSession])

  const forgotPassword = useCallback((email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }), [])

  const value = useMemo(() => ({ user, isLoading, isAuthenticated: Boolean(user), signIn, signUp, forgotPassword, signOut: clearSession }), [clearSession, forgotPassword, isLoading, signIn, signUp, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
