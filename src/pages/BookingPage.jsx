import { useNavigate } from 'react-router-dom'
import BookingsDialog from '../components/BookingsDialog'

export default function BookingPage() {
  const navigate = useNavigate()
  return <BookingsDialog isOpen={true} onClose={() => navigate('/app/profile')} />
}
