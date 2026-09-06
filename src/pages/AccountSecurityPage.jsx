import { useNavigate } from 'react-router-dom'
import AccountSecurityDialog from '../components/AccountSecurityDialog'

export default function AccountSecurityPage() {
  const navigate = useNavigate()
  return <AccountSecurityDialog isOpen={true} onClose={() => navigate('/app/profile')} />
}
