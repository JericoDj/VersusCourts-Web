import { CheckCircle2 } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'

export default function GlobalSnackbar() {
  const { notice } = usePlayer()
  if (!notice) return null
  return <div className="toast" role="status" aria-live="polite"><CheckCircle2 size={18} /><span>{notice}</span></div>
}
