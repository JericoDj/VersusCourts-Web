import { useEffect, useState } from 'react'
import { Search, Send } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import { useChat } from '../context/ChatContext'
import { usePlayer } from '../context/PlayerContext'
import { searchPlayers } from '../data/userService'

/// Web port of the app's "Share to a player" (`PlayerPickerSheet` + a direct
/// message): search players, pick one, and [message] is sent to them in
/// a direct chat.
export default function SharePlayerDialog({ title = 'Send to a player', message, onClose }) {
  const { startDirectThread, sendMessage } = useChat()
  const { setNotice } = usePlayer()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState('')

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSearching(true)
      searchPlayers(q, { signal: controller.signal })
        .then(setResults)
        .finally(() => setSearching(false))
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  const send = async (player) => {
    setSending(player.id)
    try {
      const threadId = await startDirectThread({ id: player.id, name: player.name, avatarUrl: player.image })
      if (!threadId) throw new Error('no thread')
      await sendMessage(threadId, message)
      setNotice(`Sent to ${player.name}.`)
      onClose()
    } catch {
      setNotice('Could not send it. Try again.')
    } finally {
      setSending('')
    }
  }

  const shown = query.trim().length >= 2 ? results : []

  return (
    <ProfileDialog title={title} onClose={onClose} busy={!!sending}>
      <div className="co">
        <div className="queue-search-bar">
          <Search size={18} />
          <input autoFocus placeholder="Search players by name or username" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {query.trim().length < 2 ? (
          <p className="coach-hint">Type at least 2 letters.</p>
        ) : searching && !shown.length ? (
          <p className="coach-hint">Searching…</p>
        ) : shown.length ? shown.map((p) => (
          <button key={p.id} type="button" className="coach-row" disabled={!!sending} onClick={() => send(p)}>
            <span className="coach-face">{p.image ? <img src={p.image} alt="" /> : p.name[0]}</span>
            <span className="coach-row__body"><b>{p.name}</b><small>{[p.username && `@${p.username}`, p.area].filter(Boolean).join(' · ')}</small></span>
            {sending === p.id ? <span className="club-bridge-spinner" /> : <Send size={16} />}
          </button>
        )) : <p className="coach-hint">No players match “{query.trim()}”.</p>}
      </div>
    </ProfileDialog>
  )
}
