import { useMemo, useState } from 'react'
import { X, Trophy, Timer, Users, Award, Flame, CheckCircle2, Copy } from 'lucide-react'
import { computeQueueLeaderboard } from '../utils/queueLeaderboard'
import { sportColor, sportEmoji, sportLabel } from '../data/sports'

export default function QueueAnalyticsModal({ queue, matches = [], onClose }) {
  const [shareStatus, setShareStatus] = useState('')
  const recapUrl = `https://versuscourts.com/q/${encodeURIComponent(queue.id)}?openAnalytics=1`
  const shareRecap = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `${queue.title || 'Queue'} Recap`, text: 'View the queue analytics on Versus Courts.', url: recapUrl })
      else { await navigator.clipboard.writeText(recapUrl); setShareStatus('Recap link copied!') }
    } catch (error) { if (error.name !== 'AbortError') setShareStatus('Could not share. Copy the link below.') }
  }
  const sport = String(queue.sport || 'badminton').toLowerCase()
  const leaderboard = useMemo(() => computeQueueLeaderboard(matches, sport), [matches, sport])
  const mvp = leaderboard[0]

  const finishedMatches = useMemo(
    () => matches.filter((m) => m.status === 'COMPLETED' || m.completed),
    [matches]
  )

  const totalPoints = useMemo(() => {
    let pts = 0
    for (const m of finishedMatches) {
      if (m.sets?.length) {
        for (const s of m.sets) {
          pts += Number(s.scoreA || 0) + Number(s.scoreB || 0)
        }
      } else {
        pts += Number(m.scoreA || 0) + Number(m.scoreB || 0)
      }
    }
    return pts
  }, [finishedMatches])

  const durationLabel = useMemo(() => {
    const start = queue.startedAt || queue.startTime
    const end = queue.completedAt || queue.endTime
    if (!start) return '2h session'
    if (!end) return 'Finished'
    const diff = new Date(end) - new Date(start)
    const mins = Math.max(1, Math.round(diff / 60000))
    const hours = Math.floor(mins / 60)
    const remMins = mins % 60
    if (hours === 0) return `${mins}m`
    return remMins === 0 ? `${hours}h` : `${hours}h ${remMins}m`
  }, [queue.startedAt, queue.startTime, queue.completedAt, queue.endTime])

  const copySummary = () => {
    const lines = [
      `🏆 ${queue.title || 'Queue'} Recap (${sportLabel(sport)})`,
      `📍 ${queue.venue || queue.court?.name || 'Court'}`,
      `⏱️ Matches: ${finishedMatches.length} | Points: ${totalPoints} | Duration: ${durationLabel}`,
      mvp ? `⭐ MVP: ${mvp.name} (${mvp.wins}W - ${mvp.losses}L)` : '',
      '',
      '🏅 Standings:',
      ...leaderboard.map((p, i) => `${i + 1}. ${p.name} - ${p.wins}W/${p.losses}L (${p.points} pts)`),
      recapUrl,
    ].filter(Boolean)

    navigator.clipboard?.writeText(lines.join('\n'))
    alert('Queue analytics summary copied to clipboard!')
  }

  return (
    <div className="dialog-overlay" role="presentation" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="dialog queue-modal-sheet queue-analytics-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Queue Analytics"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="queue-modal-sheet__header">
          <div className="queue-modal-sheet__title-row">
            <span className="queue-analytics-badge">
              <Trophy size={15} /> RECAP
            </span>
            <h3>Queue Analytics</h3>
          </div>
          <button
            type="button"
            className="queue-modal-sheet__close"
            onClick={onClose}
            aria-label="Close analytics"
          >
            <X size={20} />
          </button>
        </header>

        <div className="queue-modal-sheet__content">
          {/* Hero Banner */}
          <div className="queue-analytics-hero" style={{ '--sport-color': sportColor(sport) }}>
            <div className="queue-analytics-hero__tag">
              {sportEmoji(sport)} {sportLabel(sport).toUpperCase()}
            </div>
            <h2 className="queue-analytics-hero__title">{queue.title || 'Queue / OpenPlay'}</h2>
            <p className="queue-analytics-hero__venue">
              {queue.court?.name || queue.venue || 'Versus Courts'}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="queue-analytics-grid">
            <div className="queue-analytics-stat-box">
              <span className="stat-box-icon"><Award size={18} /></span>
              <span className="stat-box-val">{finishedMatches.length}</span>
              <span className="stat-box-label">Matches</span>
            </div>
            <div className="queue-analytics-stat-box">
              <span className="stat-box-icon"><Flame size={18} /></span>
              <span className="stat-box-val">{totalPoints}</span>
              <span className="stat-box-label">Total Points</span>
            </div>
            <div className="queue-analytics-stat-box">
              <span className="stat-box-icon"><Timer size={18} /></span>
              <span className="stat-box-val">{durationLabel}</span>
              <span className="stat-box-label">Duration</span>
            </div>
            <div className="queue-analytics-stat-box">
              <span className="stat-box-icon"><Users size={18} /></span>
              <span className="stat-box-val">{leaderboard.length || queue.players || 0}</span>
              <span className="stat-box-label">Players</span>
            </div>
          </div>

          {/* MVP Card */}
          {mvp && (
            <div className="queue-analytics-mvp-card">
              <div className="queue-analytics-mvp-badge">
                <Trophy size={14} /> QUEUE MVP
              </div>
              <div className="queue-analytics-mvp-body">
                <div className="queue-analytics-mvp-avatar">
                  {mvp.avatarUrl ? <img src={mvp.avatarUrl} alt="" /> : mvp.name[0]?.toUpperCase()}
                </div>
                <div className="queue-analytics-mvp-info">
                  <h4>{mvp.name}</h4>
                  <p>
                    <b>{mvp.wins} Wins</b> · {mvp.losses} Losses · {mvp.points} Points scored
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Final Standings */}
          <div className="queue-analytics-section">
            <h4 className="queue-analytics-section-title">
              <Award size={16} /> Final Standings
            </h4>
            <div className="queue-leaderboard-list">
              {leaderboard.length === 0 ? (
                <p className="queue-detail-notes-body" style={{ color: 'var(--vc-text-secondary)' }}>
                  No match scores recorded.
                </p>
              ) : (
                leaderboard.map((p, idx) => (
                  <div key={p.userId || idx} className={`queue-leaderboard-row ${idx === 0 ? 'is-top' : ''}`}>
                    <span className="lb-rank">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </span>
                    <div className="lb-player">
                      <div className="lb-avatar">
                        {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : p.name[0]?.toUpperCase()}
                      </div>
                      <span className="lb-name">{p.name}</span>
                    </div>
                    <span className="lb-stat">{p.games}G</span>
                    <span className="lb-stat lb-wins"><b>{p.wins}W</b></span>
                    <span className="lb-stat lb-losses">{p.losses}L</span>
                    <span className="lb-stat lb-pts">{p.points} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Matches Recap */}
          {finishedMatches.length > 0 && (
            <div className="queue-analytics-section">
              <h4 className="queue-analytics-section-title">
                <CheckCircle2 size={16} /> Match Results ({finishedMatches.length})
              </h4>
              <div className="queue-analytics-matches-list">
                {finishedMatches.map((m, i) => {
                  const sets = [...(m.sets || [])].sort((a, b) => a.setNumber - b.setNumber)
                  const teamA = m.playersA?.map((p) => p.name || p.firstName).join(' / ') || (m.teamA || []).join(' / ') || 'Team A'
                  const teamB = m.playersB?.map((p) => p.name || p.firstName).join(' / ') || (m.teamB || []).join(' / ') || 'Team B'
                  const winner = m.winner || (m.result === 'teamA' ? 'A' : m.result === 'teamB' ? 'B' : null)
                  return (
                    <div key={m.id || i} className="queue-analytics-match-item">
                      <div className="analytics-match-teams">
                        <span className={winner === 'A' ? 'is-winner' : ''}>{teamA}</span>
                        <span className="vs">vs</span>
                        <span className={winner === 'B' ? 'is-winner' : ''}>{teamB}</span>
                      </div>
                      <div className="analytics-match-scores">
                        {sets.length > 0
                          ? sets.map((s) => `S${s.setNumber}: ${s.scoreA}-${s.scoreB}`).join(' · ')
                          : `${m.scoreA || 0} - ${m.scoreB || 0}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Share Button */}
          <button type="button" className="queue-detail-action-btn queue-detail-action-btn--primary" onClick={shareRecap}>Share Analytics Link</button>
          {shareStatus && <p role="status">{shareStatus} <a href={recapUrl}>Open recap</a></p>}
          <button type="button" className="queue-detail-action-btn queue-detail-action-btn--primary" onClick={copySummary}>
            <Copy size={18} /> Copy Recap Summary
          </button>
        </div>
      </div>
    </div>
  )
}
