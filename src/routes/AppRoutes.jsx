import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import { useAuth } from '../context/AuthContext'

// Lazy-load secondary & authenticated routes so the initial landing bundle is tiny and instant
const VenuesPage = lazy(() => import('../pages/VenuesPage'))
const PublicQueuesPage = lazy(() => import('../pages/PublicQueuesPage'))
const PublicEventsPage = lazy(() => import('../pages/PublicEventsPage'))
const PublicClubsPage = lazy(() => import('../pages/PublicClubsPage'))
const HowItWorksPage = lazy(() => import('../pages/HowItWorksPage'))
const ProposalPage = lazy(() => import('../pages/ProposalPage'))
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'))
const TermsPage = lazy(() => import('../pages/TermsPage'))
const SecurityPage = lazy(() => import('../pages/SecurityPage'))
const SupportPage = lazy(() => import('../pages/SupportPage'))

// Authenticated app shell and pages
const AppShell = lazy(() => import('../components/AppShell'))
const HomePage = lazy(() => import('../pages/HomePage'))
const DiscoverPage = lazy(() => import('../pages/DiscoverPage'))
const ClubsPage = lazy(() => import('../pages/ClubsPage'))
const CourtDetailPage = lazy(() => import('../pages/CourtDetailPage'))
const QueuesPage = lazy(() => import('../pages/QueuesPage'))
const BookingPage = lazy(() => import('../pages/BookingPage'))
const EventsPage = lazy(() => import('../pages/EventsPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const MessagesPage = lazy(() => import('../pages/MessagesPage'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const ScoreboardPage = lazy(() => import('../pages/ScoreboardPage'))

/// Gate for everything under /app. While a stored token is still being
/// validated `isLoading` is true — render nothing rather than redirect, or a
/// signed-in user gets bounced to the landing page on every refresh.
function RequireAuth({ children }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/" replace />
  return children
}

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/venues" element={<VenuesPage />} />
        <Route path="/queues" element={<PublicQueuesPage />} />
        <Route path="/events" element={<PublicEventsPage />} />
        <Route path="/clubs" element={<PublicClubsPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/proposal" element={<ProposalPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<HomePage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="clubs" element={<ClubsPage />} />
          <Route path="clubs/:clubId" element={<ClubsPage />} />
          <Route path="courts/:courtId" element={<CourtDetailPage />} />
          <Route path="queues" element={<QueuesPage />} />
          <Route path="queues/:queueId" element={<QueuesPage />} />
          <Route path="bookings" element={<BookingPage />} />
          <Route path="bookings/:bookingId" element={<BookingPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:threadId" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="scoreboard" element={<ScoreboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
