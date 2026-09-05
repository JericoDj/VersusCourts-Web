import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { firebaseAuth } from '../lib/firebase'

const AuthContext = createContext(null)
const TOKEN_KEY = 'vc-auth-token'
const USER_KEY = 'vc-auth-user'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const initials = (firstName = '', lastName = '') => `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'VC'

const toPlayerUser = (user, existingUser = null) => {
  if (!user && !existingUser) return null
  const merged = { ...existingUser, ...user }
  const [firstName = 'Player', ...last] = (merged.name || '').trim().split(/\s+/)
  const emailPrefix = merged.email?.split('@')[0] || 'player'
  const computedFirstName = merged.firstName || firstName
  const computedLastName = merged.lastName || last.join(' ')
  return {
    ...merged,
    firstName: computedFirstName,
    lastName: computedLastName,
    name: merged.name || `${computedFirstName} ${computedLastName}`.trim(),
    handle: merged.handle || `@${merged.username || emailPrefix}`,
    location: merged.location || 'Metro Manila',
    initials: merged.initials || initials(computedFirstName, computedLastName),
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
    const err = new Error('Unable to reach Versus Courts. Please try again.')
    err.status = 0
    throw err
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message
    const err = new Error(message || 'Something went wrong. Please try again.')
    err.status = response.status
    throw err
  }
  return payload
}

const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || token === 'undefined' || token === 'null') {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
  return token
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()))

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    try {
      localStorage.removeItem('vc_user_location')
    } catch {}
    setUser(null)
  }, [])

  const startSession = useCallback((session) => {
    const jwtToken = session.accessToken || session.token
    if (jwtToken) {
      localStorage.setItem(TOKEN_KEY, jwtToken)
    }
    setUser((currentUser) => {
      const playerUser = toPlayerUser(session.user, currentUser)
      localStorage.setItem(USER_KEY, JSON.stringify(playerUser))
      return playerUser
    })
  }, [])

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) return null
    try {
      const remoteUser = await request('/auth/me', { token })
      let playerUser
      setUser((currentUser) => {
        playerUser = toPlayerUser(remoteUser, currentUser)
        localStorage.setItem(USER_KEY, JSON.stringify(playerUser))
        return playerUser
      })
      return playerUser
    } catch (err) {
      if (err.status === 401) {
        clearSession()
      }
      throw err
    }
  }, [clearSession])

  useEffect(() => {
    const token = getToken()
    if (token) {
      request('/auth/me', { token })
        .then((remoteUser) => {
          setUser((currentUser) => {
            const playerUser = toPlayerUser(remoteUser, currentUser)
            localStorage.setItem(USER_KEY, JSON.stringify(playerUser))
            return playerUser
          })
        })
        .catch((err) => {
          if (err.status === 401) {
            clearSession()
          }
        })
        .finally(() => setIsLoading(false))
    }

    let unsubscribeFb = () => {}
    const initTimer = setTimeout(() => {
      unsubscribeFb = firebaseAuth.onAuthStateChanged(async (fbUser) => {
        const currentToken = getToken()
        if (fbUser && !currentToken) {
          try {
            const idToken = await fbUser.getIdToken()
            const session = await request('/auth/firebase', {
              method: 'POST',
              body: JSON.stringify({ idToken, role: 'PLAYER' }),
            })
            if (fbUser.displayName || fbUser.photoURL) {
              session.user = {
                ...session.user,
                name: session.user?.name || fbUser.displayName,
                photoURL: fbUser.photoURL || session.user?.photoURL,
              }
            }
            startSession(session)
          } catch (err) {
            console.warn('Firebase auto-login error:', err)
          }
        }
      })
    }, 1200)

    return () => {
      clearTimeout(initTimer)
      unsubscribeFb()
    }
  }, [clearSession, startSession])

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

  const signInWithGoogle = useCallback(async () => {
    const idToken = await firebaseAuth.signInWithGoogle()
    const session = await request('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ idToken, role: 'PLAYER' }),
    })
    startSession(session)
    return session.user
  }, [startSession])

  const signOut = useCallback(async () => {
    await firebaseAuth.signOut()
    clearSession()
  }, [clearSession])

  const forgotPassword = useCallback((email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }), [])

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signInWithGoogle,
    forgotPassword,
    signOut,
    refreshUser,
    firebaseReady: firebaseAuth.isReady,
  }), [forgotPassword, isLoading, refreshUser, signIn, signUp, signInWithGoogle, signOut, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
