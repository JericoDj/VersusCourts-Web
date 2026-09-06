import { X, Star, Clock, UserPlus } from 'lucide-react'

const playerName = (player) => {
  const user = player.user || player
  return user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Player'
}

export default function QueuePlayerListModal({
  queue,
  playingParticipants = [],
  tentativeParticipants = [],
  capacity = 10,
  onClose,
}) {
  const totalCount = playingParticipants.length + tentativeParticipants.length
  const emptySlotsCount = Math.max(0, capacity - playingParticipants.length)

  return (
    <div className="dialog-overlay" role="presentation" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="dialog queue-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Queue Players"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="queue-modal-sheet__header">
          <div className="queue-modal-sheet__title-row">
            <h3>Players ({totalCount}/{capacity})</h3>
          </div>
          <button
            type="button"
            className="queue-modal-sheet__close"
            onClick={onClose}
            aria-label="Close players modal"
          >
            <X size={20} />
          </button>
        </header>

        <div className="queue-modal-sheet__content">
          <div className="queue-player-list">
            {/* Playing Participants */}
            {playingParticipants.map((p, idx) => {
              const name = playerName(p)
              const avatar = p.avatarUrl || p.user?.avatarUrl
              const isHost = p.isHost || p.id === queue.hostId || p.userId === queue.hostId
              const isGuest = p.isLocal || p.isGuest || p.id?.startsWith?.('guest:')

              return (
                <div key={p.id || idx} className="queue-player-row">
                  <div className="queue-player-row__avatar">
                    {avatar ? (
                      <img src={avatar} alt="" />
                    ) : (
                      <span>{name[0]?.toUpperCase()}</span>
                    )}
                    {isHost && (
                      <span className="queue-player-row__badge-icon" title="Host">
                        <Star size={10} />
                      </span>
                    )}
                  </div>
                  <div className="queue-player-row__info">
                    <span className="queue-player-row__name">{name}</span>
                    {isHost ? (
                      <span className="queue-player-row__tag queue-player-row__tag--host">Host</span>
                    ) : isGuest ? (
                      <span className="queue-player-row__tag queue-player-row__tag--guest">Guest</span>
                    ) : null}
                  </div>
                </div>
              )
            })}

            {/* Tentative Participants */}
            {tentativeParticipants.length > 0 && (
              <>
                <h5 className="queue-player-list__subheading">Tentative</h5>
                {tentativeParticipants.map((p, idx) => {
                  const name = playerName(p)
                  const avatar = p.avatarUrl || p.user?.avatarUrl
                  const isAccepted = p.isAccepted || p.status === 'ACCEPTED'

                  return (
                    <div key={p.id || `tentative-${idx}`} className="queue-player-row is-tentative">
                      <div className="queue-player-row__avatar">
                        {avatar ? (
                          <img src={avatar} alt="" />
                        ) : (
                          <span>{name[0]?.toUpperCase()}</span>
                        )}
                        <span className="queue-player-row__badge-icon is-hourglass" title="Tentative">
                          <Clock size={10} />
                        </span>
                      </div>
                      <div className="queue-player-row__info">
                        <span className="queue-player-row__name">{name}</span>
                        <span className="queue-player-row__tag queue-player-row__tag--warning">
                          {isAccepted ? 'Awaiting payment' : 'Requested'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Empty Slots */}
            {emptySlotsCount > 0 && (
              <>
                <h5 className="queue-player-list__subheading">
                  Open Slots ({emptySlotsCount})
                </h5>
                {Array.from({ length: emptySlotsCount }).map((_, i) => (
                  <div key={`open-${i}`} className="queue-player-row is-empty">
                    <div className="queue-player-row__avatar is-open-avatar">
                      <UserPlus size={16} />
                    </div>
                    <div className="queue-player-row__info">
                      <span className="queue-player-row__name" style={{ color: 'var(--vc-text-secondary)' }}>
                        Open Slot {playingParticipants.length + i + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
