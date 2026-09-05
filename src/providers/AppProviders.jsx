import { useState } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { ChatProvider } from '../context/ChatContext'
import { DiscoveryProvider } from '../context/DiscoveryContext'
import { NotificationProvider } from '../context/NotificationContext'
import { PlayerProvider } from '../context/PlayerContext'
import { QueueProvider } from '../context/QueueContext'
import ScrollToTop from '../components/ScrollToTop'
import GlobalSnackbar from '../components/GlobalSnackbar'
import SplashScreen from '../components/SplashScreen'

/// Discovery sits under Auth (it re-fetches with the player's token once a
/// session starts) and above Player, which filters the feed it exposes.
export function AppProviders({ children }) {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <AuthProvider>
      <NotificationProvider>
        <DiscoveryProvider>
          <QueueProvider>
            <PlayerProvider>
              <ChatProvider>
                {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
                <ScrollToTop />
                {children}
                <GlobalSnackbar />
              </ChatProvider>
            </PlayerProvider>
          </QueueProvider>
        </DiscoveryProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}
