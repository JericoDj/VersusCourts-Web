import { useNavigate } from 'react-router-dom'
import PrivacyPolicyDialog from '../components/PrivacyPolicyDialog'

export default function PrivacyPage() {
  const navigate = useNavigate()
  return <PrivacyPolicyDialog isOpen={true} onClose={() => navigate(-1)} />
}
