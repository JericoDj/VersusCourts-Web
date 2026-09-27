import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import ClubsPage from '../ClubsPage'
import { apiList } from '../../data/apiClient'
import { useCoach } from '../../context/CoachContext'
import CoachHeader from './CoachHeader'

/// Coach mode › Clubs — the Player clubs screen acting as the coach identity
/// (`X-Acting-As: coach` on club calls), like the Flutter coach nav embedding
/// `ClubsScreen`. Joining, creating and posting here are the coach's, kept
/// apart from the player account's clubs.
export default function CoachClubsPage() {
  const { identity } = useCoach()
  const [blocked, setBlocked] = useState('')

  // Probe the coach-scoped list once: if the API can't take the coach
  // header yet, say so instead of showing the player's clubs.
  useEffect(() => {
    let active = true
    apiList('/clubs/mine')
      .then(() => { if (active) setBlocked('') })
      .catch((err) => { if (active && err.coachHeaderBlocked) setBlocked(err.message) })
    return () => { active = false }
  }, [])

  return (
    <div className="coach-page">
      <CoachHeader title="Clubs" subtitle={`As ${identity.name} — separate from your player clubs`} />
      {blocked ? (
        <div className="coach-empty">
          <Shield size={22} />
          <p>{blocked}</p>
        </div>
      ) : (
        <ClubsPage />
      )}
    </div>
  )
}
