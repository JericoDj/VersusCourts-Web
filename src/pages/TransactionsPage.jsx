import { useNavigate } from 'react-router-dom'
import TransactionsDialog from '../components/TransactionsDialog'

export default function TransactionsPage() {
  const navigate = useNavigate()
  return <TransactionsDialog isOpen={true} onClose={() => navigate('/app/profile')} />
}
