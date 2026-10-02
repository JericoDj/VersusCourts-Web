import { useState } from 'react'
import { Link2, Send } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import SharePlayerDialog from './SharePlayerDialog'
import { usePlayer } from '../context/PlayerContext'
import { shareTraining, trainingShareUrl } from '../data/trainings'
import '../styles/checkout.css'
import '../styles/trainings.css'

/// The app's training share sheet: share/copy the link, or send it to a
/// player in chat. [asCoach] words the message as an invite.
export default function TrainingShareDialog({ training: t, asCoach = false, onClose }) {
  const { setNotice } = usePlayer()
  const [picking, setPicking] = useState(false)
  const title = t.title?.trim() || 'Training'
  const where = t.courtName ? ` at ${t.courtName}` : ''
  const message = `${asCoach ? 'Join my training' : 'Check out this training'}: ${title}${where}!\n${trainingShareUrl(t.id)}`

  if (picking) return <SharePlayerDialog title="Share training to a player" message={message} onClose={onClose} />

  return (
    <ProfileDialog title="Share training" onClose={onClose}>
      <div className="co-methods">
        <button type="button" className="tr-pay__option" onClick={async () => {
          try {
            if ((await shareTraining(t)) === 'copied') setNotice('Training link copied')
            onClose()
          } catch {
            setNotice('Could not share this training')
          }
        }}>
          <Link2 size={22} />
          <span><b>Share link</b><small>{trainingShareUrl(t.id)}</small></span>
        </button>
        <button type="button" className="tr-pay__option" onClick={() => setPicking(true)}>
          <Send size={22} />
          <span><b>Send to a player</b><small>Message the link to someone on Versus Courts.</small></span>
        </button>
      </div>
    </ProfileDialog>
  )
}
