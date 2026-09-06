import { useEffect, useState } from 'react'
import { apiRequest } from '../data/apiClient'
import { useAuth } from '../context/AuthContext'
import ProfileDialog from './ProfileDialog'
import '../styles/profile.css'

export default function PendingDeletionDialog() {
  const { user, signOut } = useAuth()
  const [request, setRequest] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    apiRequest('/auth/account/deletion-request').then((data) => { if (active) setRequest(data.request) }).catch(() => {})
    return () => { active = false }
  }, [user?.id])
  if (!request) return null
  return <ProfileDialog title="Your account is scheduled for deletion" onClose={() => setRequest(null)} busy={busy}>
    <p>Deletion is scheduled for {new Date(request.scheduledFor).toLocaleDateString()}. Signing in does not cancel it.</p>
    {error && <p role="alert">{error}</p>}
    <div className="pf-form"><button className="button" disabled={busy} onClick={async () => {
      setBusy(true); setError('')
      try { await apiRequest('/auth/account/deletion-request', { method: 'DELETE' }); setRequest(null) } catch (error) { setError(error.message) } finally { setBusy(false) }
    }}>Keep My Account</button><button className="button button--outline" disabled={busy} onClick={() => signOut()}>Keep Deletion Scheduled & Sign Out</button></div>
  </ProfileDialog>
}
