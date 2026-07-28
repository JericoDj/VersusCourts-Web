import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../components/AppShell'
import BookingPage from '../pages/BookingPage'
import ClubsPage from '../pages/ClubsPage'
import CourtDetailPage from '../pages/CourtDetailPage'
import DiscoverPage from '../pages/DiscoverPage'
import EventsPage from '../pages/EventsPage'
import HomePage from '../pages/HomePage'
import HowItWorksPage from '../pages/HowItWorksPage'
import LandingPage from '../pages/LandingPage'
import PrivacyPage from '../pages/PrivacyPage'
import ProfilePage from '../pages/ProfilePage'
import PublicClubsPage from '../pages/PublicClubsPage'
import PublicEventsPage from '../pages/PublicEventsPage'
import PublicQueuesPage from '../pages/PublicQueuesPage'
import ProposalPage from '../pages/ProposalPage'
import QueuesPage from '../pages/QueuesPage'
import SecurityPage from '../pages/SecurityPage'
import SupportPage from '../pages/SupportPage'
import TermsPage from '../pages/TermsPage'
import VenuesPage from '../pages/VenuesPage'

export default function AppRoutes() {
  return (
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
      <Route path="/app" element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="clubs" element={<ClubsPage />} />
        <Route path="courts/:courtId" element={<CourtDetailPage />} />
        <Route path="queues" element={<QueuesPage />} />
        <Route path="bookings" element={<BookingPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
