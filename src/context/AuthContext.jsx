import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const demoUser = {
  id: 'p-2048',
  name: 'Mika Santos',
  firstName: 'Mika',
  handle: '@mikaplays',
  location: 'Quezon City',
  initials: 'MS',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(demoUser)
  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    signIn: () => setUser(demoUser),
    signOut: () => setUser(null),
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
