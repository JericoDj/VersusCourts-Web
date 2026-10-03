import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
const ClubBridgePage = lazy(() => import('../pages/ClubBridgePage'))
const QueueBridgePage = lazy(() => import('../pages/QueueBridgePage'))
const TrainingBridgePage = lazy(() => import('../pages/TrainingBridgePage'))

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
const ProfileAccountPage = lazy(() => import('../pages/ProfileAccountPage'))
const QueueMasterPage = lazy(() => import('../pages/QueueMasterPage'))
const TransactionsPage = lazy(() => import('../pages/TransactionsPage'))
const AccountSecurityPage = lazy(() => import('../pages/AccountSecurityPage'))
const MessagesPage = lazy(() => import('../pages/MessagesPage'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const ScoreboardPage = lazy(() => import('../pages/ScoreboardPage'))
const TrainingsPage = lazy(() => import('../pages/TrainingsPage'))

// Coach mode — its own shell, like the Flutter `/host` route over the Player app
const CoachShell = lazy(() => import('../pages/coach/CoachShell'))
const CoachSessionsPage = lazy(() => import('../pages/coach/CoachSessionsPage'))
const CoachTrainingsPage = lazy(() => import('../pages/coach/CoachTrainingsPage'))
const CoachTrainingFormPage = lazy(() => import('../pages/coach/CoachTrainingFormPage'))
const CoachTrainingDetailPage = lazy(() => import('../pages/coach/CoachTrainingDetailPage'))
const CoachProfilePage = lazy(() => import('../pages/coach/CoachProfilePage'))
const CoachClubsPage = lazy(() => import('../pages/coach/CoachClubsPage'))
const CoachInboxPage = lazy(() => import('../pages/coach/CoachInboxPage'))
const CoachNotificationsPage = lazy(() => import('../pages/coach/CoachNotificationsPage'))

/// Gate for everything under /app. While a stored token is still being
/// validated `isLoading` is true — render nothing rather than redirect, or a
/// signed-in user gets bounced to the landing page on every refresh.
/// Unauthenticated users opening shared queue, club or training links are gracefully routed
/// to the public bridge/detail view instead of being thrown to the homepage.
function RequireAuth({ children }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return null
  if (!user) {
    if (location.pathname.startsWith('/app/queues/')) {
      const qId = location.pathname.replace('/app/queues/', '')
      return <Navigate to={`/q/${qId}`} replace />
    }
    if (location.pathname.startsWith('/app/trainings/')) {
      const tId = location.pathname.replace('/app/trainings/', '')
      return <Navigate to={`/t/${tId}`} replace />
    }
    if (location.pathname.startsWith('/app/clubs/')) {
      const cId = location.pathname.replace('/app/clubs/', '')
      return <Navigate to={`/c/${cId}`} replace />
    }
    return <Navigate to="/" replace />
  }
  return children
}

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/venues" element={<VenuesPage />} />
        <Route path="/queues" element={<PublicQueuesPage />} />
        <Route path="/queues/:queueId" element={<PublicQueuesPage />} />
        <Route path="/q/:queueId" element={<QueueBridgePage />} />
        <Route path="/events" element={<PublicEventsPage />} />
        <Route path="/clubs" element={<PublicClubsPage />} />
        <Route path="/clubs/:clubId" element={<PublicClubsPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/proposal" element={<ProposalPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/c/:clubId" element={<ClubBridgePage />} />
        <Route path="/c/code/:clubId" element={<ClubBridgePage />} />
        {/* Training share links — `/t/<id>` is what the Player app shares. */}
        <Route path="/t/:trainingId" element={<TrainingBridgePage />} />
        <Route path="/training/:trainingId" element={<TrainingBridgePage />} />
        <Route path="/trainings/:trainingId" element={<TrainingBridgePage />} />
        <Route path="/coach" element={<RequireAuth><CoachShell /></RequireAuth>}>
          <Route index element={<CoachSessionsPage />} />
          <Route path="trainings" element={<CoachTrainingsPage />} />
          <Route path="trainings/new" element={<CoachTrainingFormPage />} />
          <Route path="trainings/:trainingId" element={<CoachTrainingDetailPage />} />
          <Route path="trainings/:trainingId/edit" element={<CoachTrainingFormPage />} />
          <Route path="clubs" element={<CoachClubsPage />} />
          <Route path="clubs/:clubId" element={<CoachClubsPage />} />
          <Route path="profile" element={<CoachProfilePage />} />
          <Route path="messages" element={<CoachInboxPage />} />
          <Route path="messages/:threadId" element={<CoachInboxPage />} />
          <Route path="notifications" element={<CoachNotificationsPage />} />
        </Route>
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
          <Route path="trainings" element={<TrainingsPage />} />
          <Route path="trainings/:trainingId" element={<TrainingsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:threadId" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/queue-master" element={<QueueMasterPage />} />
          <Route path="profile/transactions" element={<TransactionsPage />} />
          <Route path="profile/coupons" element={<ProfilePage />} />
          <Route path="profile/security" element={<AccountSecurityPage />} />
          <Route path="profile/:section" element={<ProfileAccountPage />} />
          <Route path="scoreboard" element={<ScoreboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
