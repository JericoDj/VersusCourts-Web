import { useState } from 'react'
import { apiList, apiRequest } from '../data/apiClient'
import '../styles/manage-queue.css'

export default function QueueHeaderAction({ action, queue, user, canInvite, onLogin }) {
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [searched, setSearched] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState([])
  const [reported, setReported] = useState(false)
  const link = `${window.location.origin}/app/queues/${encodeURIComponent(queue.id)}`
  const perform = async (work) => {
    setBusy(true); setError(''); setMessage('')
    try { await work() } catch (e) { setError(e.message || 'Please try again.') }
    finally { setBusy(false) }
  }
  const name = (p) => p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.username || 'Player'
  return <section className="manage-queue queue-detail-white-card">
    <h3>{action === 'invite' ? 'Invite players' : action === 'report' ? 'Report queue' : 'Share queue'}</h3>
    {error && <p role="alert" className="manage-queue__error">{error}</p>}
    {message && <p role="status">{message}</p>}
    {action === 'share' ? <>
      <p>Share this link to open this queue directly.</p>
      <input aria-label="Queue share link" readOnly value={link} onFocus={(e) => e.target.select()} />
      <button disabled={busy} onClick={() => perform(async () => {
        if (!navigator.clipboard?.writeText) throw new Error('Select and copy the link above to share it.')
        await navigator.clipboard.writeText(link); setMessage('Queue link copied.')
      })}>Copy link</button>
      {typeof navigator.share === 'function' && <button disabled={busy} onClick={() => perform(async () => {
        try { await navigator.share({ title: queue.title || 'Versus Courts queue', url: link }) }
        catch (e) { if (e.name !== 'AbortError') throw e }
      })}>Share via…</button>}
      {queue.inviteCode && <p>Invite code: <b>{queue.inviteCode}</b></p>}
    </> : !user ? <><p>Sign in to {action === 'report' ? 'report this queue' : 'invite players'}.</p><button onClick={onLogin}>Sign in</button></> : action === 'invite' ? <>
      {!canInvite ? <p>Only the queue host or co-host can invite players.</p> : <>
        <form onSubmit={(e) => { e.preventDefault(); perform(async () => { setPlayers(await apiList('/users/search', { query: { q: query.trim() } })); setSearched(true) }) }}>
          <label>Search players<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or username" required /></label><button disabled={busy || !query.trim()}>Search</button>
        </form>
        {searched && !players.length && <p>No players found.</p>}
        {players.filter((p) => p.id !== user.id).map((p) => {
          const joined = queue.participants?.some((member) => (member.userId || member.user?.id) === p.id && member.status === 'JOINED')
          return <div className="manage-queue__player" key={p.id}><span>{name(p)}</span><button disabled={busy || joined || sent.includes(p.id)} onClick={() => perform(async () => {
            await apiRequest(`/queues/${queue.id}/invites`, { method: 'POST', body: { inviteeId: p.id } })
            setSent((current) => [...current, p.id]); setMessage(`Invitation sent to ${name(p)}.`)
          })}>{joined ? 'Already joined' : sent.includes(p.id) ? 'Invited' : 'Invite'}</button></div>
        })}
      </>}
    </> : reported ? <p>Report submitted. Thank you—we’ll review it.</p> : <form onSubmit={(e) => { e.preventDefault(); perform(async () => {
      await apiRequest('/reports', { method: 'POST', body: { targetType: 'QUEUE', targetId: queue.id, reason: reason.trim() } }); setReported(true)
    }) }}><label>Reason for reporting<textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue with this queue" /></label><button disabled={busy || !reason.trim()}>{busy ? 'Submitting…' : 'Submit report'}</button></form>}
  </section>
}
