import { useNavigate } from 'react-router-dom'
import TermsOfUseDialog from '../components/TermsOfUseDialog'

export default function TermsPage() {
  const navigate = useNavigate()
  return <TermsOfUseDialog isOpen={true} onClose={() => navigate(-1)} />
}
