import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../components/AppShell'
import BookingPage from '../pages/BookingPage'
import ClubsPage from '../pages/ClubsPage'
import BusinessPage from '../pages/BusinessPage'
import CourtDetailPage from '../pages/CourtDetailPage'
import DiscoverPage from '../pages/DiscoverPage'
import EventsPage from '../pages/EventsPage'
import HomePage from '../pages/HomePage'
import HowItWorksPage from '../pages/HowItWorksPage'
import LandingPage from '../pages/LandingPage'
import ProfilePage from '../pages/ProfilePage'
import PublicClubsPage from '../pages/PublicClubsPage'
import PublicEventsPage from '../pages/PublicEventsPage'
import PublicQueuesPage from '../pages/PublicQueuesPage'
import QueuesPage from '../pages/QueuesPage'
import VenuesPage from '../pages/VenuesPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/venues" element={<VenuesPage />} />
      <Route path="/for-business" element={<BusinessPage />} />
      <Route path="/queues" element={<PublicQueuesPage />} />
      <Route path="/events" element={<PublicEventsPage />} />
      <Route path="/clubs" element={<PublicClubsPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
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
