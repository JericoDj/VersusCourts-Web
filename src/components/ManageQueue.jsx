import { useEffect, useState } from 'react'
import { Shuffle, Hand, Search, Award, Trash2, Pencil, Users, Grid2X2, Banknote, X } from 'lucide-react'
import { apiList, apiRequest } from '../data/apiClient'
import { queueFormatLabel } from '../data/queueFormat'
import QueueSportIcon from './QueueSportIcon'
import { sportColor, sportLabel } from '../data/sports'
import '../styles/manage-queue.css'

const nameOf = (p) => p?.name || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Player'
const shortName = (p) => p?.firstName ? `${p.firstName}${p.lastName ? ` ${p.lastName[0]}.` : ''}` : nameOf(p)

function MatchHistoryCard({ match, basketball, disabled, finished, run }) {
  const sets = [...(match.sets || [])].sort((a, b) => a.setNumber - b.setNumber)
  const scores = basketball
    ? [sets.at(-1)?.scoreA || 0, sets.at(-1)?.scoreB || 0]
    : [sets.filter((s) => s.scoreA > s.scoreB).length, sets.filter((s) => s.scoreB > s.scoreA).length]
  return <article className="queue-detail-white-card manage-history-card">
    <div className="manage-history-card__teams"><span>{match.playersA?.map(shortName).join(' & ') || 'Team A'}</span><b>{scores[0]}–{scores[1]}</b><span>{match.playersB?.map(shortName).join(' & ') || 'Team B'}</span></div>
    {!!sets.length && <p className="manage-history-card__scores"><Award size={14} />{sets.map((s) => `${s.scoreA}–${s.scoreB}`).join(' · ')}</p>}
    <div className="manage-history-card__footer"><span>● Completed</span>{!finished && <button type="button" aria-label="Delete match" disabled={disabled} onClick={() => window.confirm('Delete this match and its scores? This cannot be undone.') && run(`/queues/matches/${match.id}`, undefined, 'DELETE')}><Trash2 size={16} /></button>}</div>
  </article>
}
const localDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function MatchEditor({ match, run, disabled, finished }) {
  const latest = [...(match.sets || [])].sort((a, b) => a.setNumber - b.setNumber).at(-1)
  const [setNumber, setSetNumber] = useState(latest?.setNumber || 1)
  const [a, setA] = useState(latest?.scoreA || 0)
  const [b, setB] = useState(latest?.scoreB || 0)
  const [winner, setWinner] = useState('')
  const [drop, setDrop] = useState(false)
  const base = `/queues/matches/${match.id}`
  return <section className="queue-detail-white-card">
    <h4>{match.playersA?.map(nameOf).join(' / ') || 'Team A'} vs {match.playersB?.map(nameOf).join(' / ') || 'Team B'}</h4>
    <p>{match.status === 'ONGOING' ? match.paused ? 'Starting soon / paused' : 'Live' : 'Completed'}</p>
    {!!match.sets?.length && <p>{match.sets.map((s) => `Set ${s.setNumber}: ${s.scoreA}–${s.scoreB}`).join(' · ')}</p>}
    {match.status === 'ONGOING' && !finished && <fieldset disabled={disabled}>
      <button type="button" onClick={() => run(`${base}/pause`, { paused: !match.paused })}>{match.paused ? 'Start / resume match' : 'Pause match'}</button>
      <form onSubmit={(e) => { e.preventDefault(); run(`${base}/sets`, { setNumber: Number(setNumber), scoreA: Number(a), scoreB: Number(b) }) }}>
        <div className="manage-queue__row">
          <label>Set<input type="number" min="1" max="9" required value={setNumber} onChange={(e) => setSetNumber(e.target.value)} /></label>
          <label>Team A<input type="number" min="0" required value={a} onChange={(e) => setA(e.target.value)} /></label>
          <label>Team B<input type="number" min="0" required value={b} onChange={(e) => setB(e.target.value)} /></label>
        </div>
        <button type="submit">Save score</button>
      </form>
      <label>Result<select value={winner} onChange={(e) => setWinner(e.target.value)}><option value="">Calculate from scores</option><option value="A">Team A wins</option><option value="B">Team B wins</option><option value="TIE">Draw</option></select></label>
      <label className="manage-queue__check"><input type="checkbox" checked={drop} onChange={(e) => setDrop(e.target.checked)} />Exclude unfinished last set</label>
      <button type="button" onClick={() => window.confirm('Finish this match and record its result?') && run(`${base}/complete`, { ...(winner ? { winner } : {}), dropLastSet: drop })}>Finish match</button>
    </fieldset>}
    {!finished && <button type="button" disabled={disabled} onClick={() => window.confirm('Delete this match and its scores? This cannot be undone.') && run(base, undefined, 'DELETE')}>Delete match</button>}
  </section>
}

function CourtMatchEditor({ match, save, disabled }) {
  const [a, setA] = useState(match.scoreA || 0)
  const [b, setB] = useState(match.scoreB || 0)
  const [result, setResult] = useState('')
  return <section className="queue-detail-white-card"><h4>{match.court || 'Court match'}</h4><p>{match.teamA.join(' / ')} vs {match.teamB.join(' / ')}</p>
    {match.completed ? <p>Final: {match.scoreA}–{match.scoreB} · {match.result === 'tie' ? 'Draw' : match.result === 'teamA' ? 'Team A won' : 'Team B won'}</p> : <fieldset disabled={disabled}>
      <form onSubmit={(e) => { e.preventDefault(); save({ ...match, scoreA: Number(a), scoreB: Number(b) }) }}><div className="manage-queue__row"><label>Team A<input type="number" min="0" required value={a} onChange={(e) => setA(e.target.value)} /></label><label>Team B<input type="number" min="0" required value={b} onChange={(e) => setB(e.target.value)} /></label></div><button>Save score</button></form>
      <label>Result<select value={result} onChange={(e) => setResult(e.target.value)}><option value="">Select result</option><option value="teamA">Team A wins</option><option value="teamB">Team B wins</option><option value="tie">Draw</option></select></label>
      <button type="button" disabled={!result} onClick={() => window.confirm('Finish this court match?') && save({ ...match, scoreA: Number(a), scoreB: Number(b), completed: true, result })}>Finish court match</button>
    </fieldset>}
  </section>
}

export default function ManageQueue({ queue, user, onBack, onUpdated }) {
  const [game, setGame] = useState(queue)
  const [tab, setTab] = useState('scoreboard')
  const [editor, setEditor] = useState(null)
  const [matches, setMatches] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState(null)
  const [search, setSearch] = useState('')
  const [manual, setManual] = useState(false)
  const [teams, setTeams] = useState({})
  const base = `/queues/${queue.id}`
  const primaryHost = user?.id && (game.hostId === user.id || game.host?.id === user.id)
  const coHost = user?.id && game.participants?.some((p) => (p.userId || p.user?.id) === user.id && p.isHost && p.status === 'JOINED')
  const finished = ['COMPLETED', 'CANCELLED'].includes(game.status)
  const basketball = String(game.sport).toUpperCase() === 'BASKETBALL'
  const teamSize = basketball ? Number(String(game.rules?.format || '5x5').split('x')[0]) : game.rules?.mode === 'SINGLES' ? 1 : 2
  const ongoing = matches.filter((m) => m.status === 'ONGOING')
  const occupied = new Set(ongoing.flatMap((m) => [...m.teamA, ...m.teamB]))
  const roster = [
    ...(game.participants || []).filter((p) => p.status === 'JOINED' && (game.hostIsPlaying !== false || p.userId !== game.hostId)).map((p) => ({ id: p.userId || p.user?.id, name: nameOf(p.user) })),
    ...(game.localPlayers || []).map((name) => ({ id: `guest:${name}`, name })),
  ].filter((p) => !occupied.has(p.id))

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([apiRequest(base, { signal: controller.signal }), apiList(`${base}/matches`, { signal: controller.signal })])
      .then(([detail, rows]) => { setGame(detail); setMatches(rows) })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [base])

  const run = async (path, body, method = 'PATCH') => {
    if (busy) return false
    setBusy(true); setError(''); setNotice('')
    try {
      if (path === `${base}/status` && body?.status === 'COMPLETED' && game.liveMatches?.length) {
        path = `${base}/publish-results`
        body = { matches: game.liveMatches }
        method = 'POST'
      }
      await apiRequest(path, { method, body })
      const [detail, rows] = await Promise.all([apiRequest(base), apiList(`${base}/matches`)])
      setGame(detail); setMatches(rows); onUpdated(detail); setNotice('Saved.'); setPreview(null); setEditor(null)
      return true
    } catch (e) { setError(e.message); return false }
    finally { setBusy(false) }
  }
  const saveDetails = (event) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    run(base, { title: data.title, description: data.description, startTime: new Date(data.startTime).toISOString(), ...(data.endTime ? { endTime: new Date(data.endTime).toISOString() } : {}), ...(!game.courtId ? { customCourtName: data.venue, customArea: data.area } : {}) })
  }
  const saveRules = (event) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const rules = { ...game.rules, courtCount: Number(data.courtCount) }
    if (basketball) {
      delete rules.mode; delete rules.bestOf; delete rules.points; delete rules.scoring
      Object.assign(rules, { format: data.format, minutesPerQuarter: Number(data.minutesPerQuarter) })
    } else {
      delete rules.format; delete rules.quarters; delete rules.minutesPerQuarter
      Object.assign(rules, { mode: data.mode, bestOf: Number(data.bestOf), points: Number(data.points) })
    }
    run(`${base}/rules`, { rules })
  }
  const finishPreview = async () => {
    setBusy(true); setError('')
    try { setPreview(await apiRequest(`${base}/completion-preview`)) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  if (!primaryHost && !coHost) return <div className="queue-detail-white-card"><p>Only the queue host or co-host can manage this queue.</p><button onClick={onBack}>Back to queue</button></div>
  return <div className="manage-queue">
    <h2>Manage Queue</h2>
    <div className="manage-queue__tabs" role="tablist" aria-label="Queue management"><button role="tab" aria-selected={tab === 'scoreboard'} onClick={() => setTab('scoreboard')}>Scoreboard</button><button role="tab" aria-selected={tab === 'management'} onClick={() => setTab('management')}>Management</button></div>
    <section className="queue-detail-white-card manage-queue__summary">
      <div className="manage-queue__summary-title"><span style={{ color: sportColor(String(game.sport).toLowerCase()) }}><QueueSportIcon sport={String(game.sport).toLowerCase()} size={24} /></span><div><h4>{game.title}</h4><small>{sportLabel(game.sport)}</small></div>{!finished && <button className="manage-queue__pencil" type="button" aria-label="Edit game details" onClick={() => setEditor('details')}><Pencil size={17} /></button>}<span className="manage-queue__status">{game.status.toLowerCase()}</span></div>
      <p>{new Date(game.startTime).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
      {game.description && <p>{game.description}</p>}
      {queue.isHiddenFromPublic && <p className="manage-queue__hidden">Scheduled time has ended. This queue is hidden from public discovery.</p>}
      <div className="manage-queue__summary-pills"><span><Users size={14} />{game.participants?.filter((p) => p.status === 'JOINED').length || 0}/{game.playersNeeded} players</span><button type="button" disabled={finished} onClick={() => setEditor('format')}><Grid2X2 size={14} />{queueFormatLabel(game)}{!finished && <Pencil size={13} />}</button><span className="manage-queue__fee"><Banknote size={14} />{Number(game.entryFee) ? `₱${game.entryFee}` : 'Free'}</span></div>
    </section>
    {error && <p role="alert" className="manage-queue__error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {busy && <p role="status">Saving / refreshing…</p>}
    {editor && <div className="manage-editor-backdrop" onClick={() => { if (!busy) setEditor(null) }}><section className="manage-editor-sheet" role="dialog" aria-modal="true" aria-label={editor === 'details' ? 'Edit game details' : editor === 'format' ? 'Edit game format' : 'Edit player capacity'} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); if (!busy) setEditor(null) } }}>
      <button type="button" className="manage-editor-close" aria-label="Close editor" disabled={busy} onClick={() => setEditor(null)} autoFocus><X size={20} /></button>
      {error && <p role="alert" className="manage-queue__error">{error}</p>}
      {editor === 'details' ? <>      <section className="queue-detail-white-card"><h3>Game details</h3><form onSubmit={saveDetails}><fieldset disabled={busy || finished}>
        <label>Title<input name="title" defaultValue={game.title || ''} required /></label><label>Description<textarea name="description" defaultValue={game.description || ''} /></label>
        <label>Start time<input name="startTime" type="datetime-local" required defaultValue={localDate(game.startTime)} /></label><label>End time<input name="endTime" type="datetime-local" defaultValue={localDate(game.endTime || game.rules?.endTime)} /></label>
        {!game.courtId && <><label>Venue<input name="venue" defaultValue={game.customCourtName || ''} required /></label><label>Area<input name="area" defaultValue={game.customArea || ''} /></label></>}
        <button>Save details</button></fieldset></form></section>
</> : editor === 'format' ? <>      <section className="queue-detail-white-card"><h3>Game format</h3><form onSubmit={saveRules}><fieldset disabled={busy || finished}>
        {basketball ? <><label>Format<select name="format" defaultValue={game.rules?.format || '5x5'}><option>1x1</option><option>3x3</option><option>5x5</option></select></label><label>Minutes per quarter<input type="number" name="minutesPerQuarter" min="1" defaultValue={game.rules?.minutesPerQuarter || 10} required /></label></> : <><label>Mode<select name="mode" defaultValue={game.rules?.mode || 'DOUBLES'}><option value="SINGLES">Singles</option><option value="DOUBLES">Doubles</option></select></label><label>Sets<select name="bestOf" defaultValue={game.rules?.bestOf || 1}><option value="1">1 Set</option><option value="3">Best of 3</option></select></label><label>Points<input type="number" name="points" min="1" defaultValue={game.rules?.points || (game.sport.toLowerCase() === 'pickleball' ? 11 : 21)} required /></label></>}
        <label>Courts<input name="courtCount" type="number" min="1" max="20" defaultValue={game.rules?.courtCount || 1} required /></label><button>Save format</button>
      </fieldset></form></section>
</> : <section className="queue-detail-white-card"><h3>Players needed</h3><fieldset disabled={busy}>        <form onSubmit={(e) => { e.preventDefault(); run(`${base}/capacity`, { playersNeeded: Number(new FormData(e.currentTarget).get('capacity')) }) }}><label>Player capacity<input name="capacity" type="number" min="0" max="200" defaultValue={game.playersNeeded} required /></label><button>Save capacity</button></form></fieldset></section>}
    </section></div>}
    {tab === 'scoreboard' ? <>
      {(game.liveMatches || []).map((m) => <CourtMatchEditor key={m.id} match={m} disabled={busy || finished} save={(updated) => run(`${base}/live-matches`, { liveMatches: game.liveMatches.map((item) => item.id === updated.id ? updated : item) })} />)}
      {!primaryHost && <p>Match creation and registered-match scoring require the primary host. You can manage players and court matches as co-host.</p>}
      {ongoing.map((m) => <MatchEditor key={m.id} match={m} run={run} disabled={busy || !primaryHost} finished={finished} />)}
      {!ongoing.length && !(game.liveMatches || []).some((m) => !m.completed) && <p className="manage-queue__empty">No ongoing matches.</p>}
      {!finished && <section className="queue-detail-white-card manage-match-queue"><h3>Match Queue</h3><p>{roster.length < teamSize * 2 ? `Need at least ${teamSize * 2} free players to start a match` : `${roster.length} players available`} ({queueFormatLabel(game)}).</p>
        <fieldset disabled={busy || !primaryHost}>
          <div className="manage-match-queue__actions">
            <button className="manage-match-queue__auto" type="button" disabled={roster.length < teamSize * 2} onClick={() => { setManual(false); run(`${base}/matches`, { teamSize }, 'POST') }}><Shuffle size={18} />Auto</button>
            <button className="manage-match-queue__manual" type="button" disabled={roster.length < teamSize * 2} aria-expanded={manual} onClick={() => setManual(!manual)}><Hand size={18} />Manual</button>
          </div>
          {manual && roster.map((p) => <label key={p.id}>{p.name}<select value={teams[p.id] || ''} onChange={(e) => setTeams({ ...teams, [p.id]: e.target.value })}><option value="">Resting</option><option value="A">Team A</option><option value="B">Team B</option></select></label>)}
          {manual && <button type="button" disabled={roster.length < teamSize * 2} onClick={() => {
            const teamA = roster.filter((p) => teams[p.id] === 'A').map((p) => p.id)
            const teamB = roster.filter((p) => teams[p.id] === 'B').map((p) => p.id)
            if (manual && (teamA.length !== teamSize || teamB.length !== teamSize)) { setError(`Choose ${teamSize} players on each team.`); return }
            run(`${base}/matches`, { teamSize, ...(manual ? { teamA, teamB } : {}) }, 'POST')
          }}>Create match</button>}
        </fieldset></section>}
      <div className="manage-history-search"><Search size={20} /><input aria-label="Search match history" placeholder="Search match history by player name" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <h3 className="manage-history-title">Match history</h3>
      {matches.filter((m) => m.status !== 'ONGOING' && [...(m.playersA || []), ...(m.playersB || [])].map(nameOf).join(' ').toLowerCase().includes(search.toLowerCase())).map((m) => <MatchHistoryCard key={m.id} match={m} basketball={basketball} run={run} disabled={busy || !primaryHost} finished={finished} />)}
      {!matches.some((m) => m.status !== 'ONGOING') && <p>No completed matches yet.</p>}
    </> : <>
      <section className="queue-detail-white-card manage-queue__roster"><div className="manage-queue__roster-heading"><h3>Players</h3><button type="button" disabled={finished} onClick={() => setEditor('capacity')}>{game.playersNeeded} needed <Pencil size={14} /></button></div><fieldset disabled={busy || finished}>

        <label className="manage-queue__host-switch"><span><b>I'll be playing too</b><small>Off if you're just running the queue, not playing.</small></span><input type="checkbox" role="switch" checked={game.hostIsPlaying !== false} onChange={(e) => run(`${base}/host-playing`, { hostIsPlaying: e.target.checked })} /></label>
        {(game.participants || []).filter((p) => !['CANCELLED', 'DECLINED'].includes(p.status)).map((p) => {
          const uid = p.userId || p.user?.id
          return <div className="manage-queue__player" key={p.id || uid}><b>{nameOf(p.user)}</b><small>{p.status}{p.isHost ? ' · Co-host' : ''}</small>
            {p.status === 'REQUESTED' && <><button type="button" onClick={() => run(`${base}/participants/${uid}/approve-request`, {})}>Approve</button><button type="button" onClick={() => run(`${base}/participants/${uid}/decline-request`, {})}>Decline</button></>}
            {p.paymentMethod === 'CASH' && p.paymentStatus === 'PENDING' && <button type="button" onClick={() => window.confirm(`Confirm cash received from ${nameOf(p.user)}?`) && run(`${base}/participants/${uid}/confirm-cash`, {})}>Confirm cash received</button>}
            {uid !== game.hostId && p.status === 'JOINED' && <button type="button" onClick={() => run(`${base}/participants/${uid}/host`, { isHost: !p.isHost })}>{p.isHost ? 'Remove co-host' : 'Make co-host'}</button>}
            {uid !== game.hostId && <button type="button" onClick={() => { const reason = window.prompt(`Reason for removing ${nameOf(p.user)}:`); if (reason?.trim()) run(`${base}/participants/${uid}/remove`, { reason: reason.trim() }, 'DELETE') }}>Remove player</button>}
          </div>
        })}
        {(game.localPlayers || []).map((name, i) => <div className="manage-queue__player" key={`${name}-${i}`}><span>{name} · Guest</span><button type="button" onClick={() => window.confirm(`Remove guest ${name}?`) && run(`${base}/local-players`, { localPlayers: game.localPlayers.filter((_, index) => index !== i) })}>Remove guest</button></div>)}
        <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const name = new FormData(form).get('guest').trim(); if (name && await run(`${base}/local-players`, { localPlayers: [...(game.localPlayers || []), name] })) form.reset() }}><label>Guest name<input name="guest" required /></label><button>Add guest</button></form>
      </fieldset></section>
      {!finished && <section className="manage-queue__actions"><h3 className="sr-only">Queue actions</h3><fieldset disabled={busy}>
        {['OPEN', 'FULL'].includes(game.status) && <button type="button" onClick={() => run(`${base}/status`, { status: 'STARTED' })}>Start Queue</button>}
        {game.status === 'STARTED' && <><label className="manage-queue__check"><input type="checkbox" checked={!!game.requestsLocked} onChange={(e) => run(`${base}/requests-lock`, { requestsLocked: e.target.checked })} />Lock join requests</label><label className="manage-queue__check"><input type="checkbox" checked={!!game.playersCanScore} onChange={(e) => run(`${base}/players-can-score`, { playersCanScore: e.target.checked })} />Allow players to score</label></>}
        <button type="button" disabled={ongoing.length > 0 || (game.liveMatches || []).some((m) => !m.completed)} onClick={finishPreview}>Finish / Close Queue</button>
        {(ongoing.length > 0 || (game.liveMatches || []).some((m) => !m.completed)) && <p>Finish ongoing matches before closing the queue.</p>}
        {preview && <div className="queue-detail-white-card"><h4>Finish queue?</h4><p>Players served: {preview.playersServed}</p><p>Online collected: ₱{preview.totalOnlinePaid} · Cash collected: ₱{preview.totalCashPaid}</p><p>Platform fee: ₱{preview.totalPlatformFee}</p><p>Amount owed by host: ₱{preview.amountOwedByHost}</p><button type="button" onClick={() => run(`${base}/status`, { status: 'COMPLETED' })}>Confirm and finish queue</button><button type="button" onClick={() => setPreview(null)}>Keep queue open</button></div>}
        <button type="button" onClick={() => { const reason = window.prompt('Request queue deletion: enter a reason for admin review.'); if (reason?.trim()) run(`${base}/deletion-request`, { reason: reason.trim() }, 'POST') }}>Request queue deletion</button>
      </fieldset></section>}
    </>}
  </div>
}
