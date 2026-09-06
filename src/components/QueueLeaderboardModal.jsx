import { X, Trophy, Medal, Award, BarChart3 } from 'lucide-react'
import { computeQueueLeaderboard } from '../utils/queueLeaderboard'
import { sportEmoji, sportLabel } from '../data/sports'

export default function QueueLeaderboardModal({ queue, matches = [], onClose }) {
  const sport = String(queue.sport || 'badminton').toLowerCase()
  const entries = computeQueueLeaderboard(matches, sport)
  const top3 = entries.slice(0, 3)

  return (
    <div className="dialog-overlay" role="presentation" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="dialog queue-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Queue Leaderboard"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="queue-modal-sheet__header">
          <div className="queue-modal-sheet__title-row">
            <span style={{ fontSize: 20 }}>{sportEmoji(sport)}</span>
            <h3>{sportLabel(sport)} Leaderboard</h3>
          </div>
          <button
            type="button"
            className="queue-modal-sheet__close"
            onClick={onClose}
            aria-label="Close leaderboard"
          >
            <X size={20} />
          </button>
        </header>

        <div className="queue-modal-sheet__content">
          {entries.length === 0 ? (
            <div className="queue-empty-state">
              <BarChart3 size={48} style={{ color: 'var(--vc-text-secondary)', opacity: 0.5, margin: '0 auto 12px' }} />
              <p>No games have been scored in this queue yet.</p>
            </div>
          ) : (
            <>
              {/* Podium for top 3 */}
              <div className="queue-leaderboard-podium">
                {/* 2nd Place */}
                {top3[1] ? (
                  <div className="podium-col podium-col--2">
                    <div className="podium-badge podium-badge--silver">2</div>
                    <div className="podium-avatar">
                      {top3[1].avatarUrl ? (
                        <img src={top3[1].avatarUrl} alt="" />
                      ) : (
                        <span>{top3[1].name[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="podium-name" title={top3[1].name}>
                      {top3[1].name.split(' ')[0]}
                    </div>
                    <div className="podium-stat">{top3[1].wins}W - {top3[1].losses}L</div>
                    <div className="podium-pillar podium-pillar--2">
                      <Medal size={18} />
                    </div>
                  </div>
                ) : <div className="podium-col-placeholder" />}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="podium-col podium-col--1">
                    <div className="podium-badge podium-badge--gold">
                      <Trophy size={14} /> 1
                    </div>
                    <div className="podium-avatar podium-avatar--gold">
                      {top3[0].avatarUrl ? (
                        <img src={top3[0].avatarUrl} alt="" />
                      ) : (
                        <span>{top3[0].name[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="podium-name" title={top3[0].name}>
                      {top3[0].name.split(' ')[0]}
                    </div>
                    <div className="podium-stat">{top3[0].wins}W - {top3[0].losses}L</div>
                    <div className="podium-pillar podium-pillar--1">
                      <Trophy size={20} />
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] ? (
                  <div className="podium-col podium-col--3">
                    <div className="podium-badge podium-badge--bronze">3</div>
                    <div className="podium-avatar">
                      {top3[2].avatarUrl ? (
                        <img src={top3[2].avatarUrl} alt="" />
                      ) : (
                        <span>{top3[2].name[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="podium-name" title={top3[2].name}>
                      {top3[2].name.split(' ')[0]}
                    </div>
                    <div className="podium-stat">{top3[2].wins}W - {top3[2].losses}L</div>
                    <div className="podium-pillar podium-pillar--3">
                      <Award size={18} />
                    </div>
                  </div>
                ) : <div className="podium-col-placeholder" />}
              </div>

              {/* Full Standings List */}
              <div className="queue-leaderboard-list">
                <div className="queue-leaderboard-row queue-leaderboard-row--head">
                  <span className="lb-rank">#</span>
                  <span className="lb-player">Player</span>
                  <span className="lb-stat">G</span>
                  <span className="lb-stat lb-wins">W</span>
                  <span className="lb-stat lb-losses">L</span>
                  <span className="lb-stat">PTS</span>
                </div>
                {entries.map((p, idx) => (
                  <div key={p.userId || idx} className={`queue-leaderboard-row ${idx < 3 ? 'is-top' : ''}`}>
                    <span className="lb-rank">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </span>
                    <div className="lb-player">
                      <div className="lb-avatar">
                        {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : p.name[0]?.toUpperCase()}
                      </div>
                      <span className="lb-name">{p.name}</span>
                    </div>
                    <span className="lb-stat">{p.games}</span>
                    <span className="lb-stat lb-wins"><b>{p.wins}</b></span>
                    <span className="lb-stat lb-losses">{p.losses}</span>
                    <span className="lb-stat lb-pts">{p.points}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
