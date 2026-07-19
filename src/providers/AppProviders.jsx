import { AuthProvider } from '../context/AuthContext'
import { PlayerProvider } from '../context/PlayerContext'

export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <PlayerProvider>{children}</PlayerProvider>
    </AuthProvider>
  )
}
