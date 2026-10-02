import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowLeftRight, Award, CircleStop, Info, Minus, Monitor, Pause, Play, Plus, Trash2, Undo2 } from 'lucide-react'
import QueueSportIcon from './QueueSportIcon'
import { apiRequest } from '../data/apiClient'
import { createScoreWriter } from '../data/scoreWriter'
import { queueScoreState, isQueueSetWon, pointsToQueueWin } from '../data/queueScoring'
import { callOf, rally, resumeGame, serveFromRight, serveJson } from '../data/pickleball'
import '../styles/queue-match-scoring.css'

const playerName = (player) => player.displayName || player.name || [player.firstName, player.lastName].filter(Boolean).join(' ') || player.username || 'Player'

export default function QueueMatchEditor({ match, game, run, disabled, finished, onConfirmModal, onScoresSaved }) {
  const [optimistic, setOptimistic] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [history, setHistory] = useState([])
  const historyRef = useRef([])
  const [prompt, setPrompt] = useState(null)
  const [celebration, setCelebration] = useState(0)
  const [swapped, setSwapped] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  // Pickleball: who serves, saved with each score (null = use the match's).
  const [localServe, setLocalServe] = useState(null)
  const localSets = useRef(null)
  const timer = useRef(null)
  const [writer] = useState(() => createScoreWriter(
    (score) => apiRequest(`/queues/matches/${match.id}/sets`, { method: 'PATCH', body: score }),
  ))
  const closeButton = useRef(null)
  const openButton = useRef(null)
  const state = queueScoreState(game, optimistic || match.sets || [])
  const { current, wins, decided, usesSets } = state
  const base = `/queues/matches/${match.id}`
  const teams = [match.playersA, match.playersB].map((players, i) => players?.map(playerName).join(' / ') || `Team ${i ? 'B' : 'A'}`)
  const locked = disabled || finished || match.status !== 'ONGOING'
  const sport = String(game.sport).toLowerCase()
  const target = Number(game.rules?.points) || (sport === 'pickleball' ? 11 : 21)
  const scoringRule = !usesSets ? 'Tap to add a point' : sport === 'tennis' || sport === 'padel'
    ? `First to 6 games · win by 2 (tie-break at 6–6) · best of ${game.rules?.bestOf || 1}`
    : `First to ${target} · win by 2${sport === 'badminton' ? ' (cap 30)' : ''} · best of ${game.rules?.bestOf || 1}`
  const pickleball = sport === 'pickleball'
  const pbGame = pickleball
    ? resumeGame({ scoreA: current.scoreA, scoreB: current.scoreB, doubles: (match.playersA?.length || 1) > 1, serve: localServe ?? match.serve })
    : null
  const latestSaved = [...(optimistic || match.sets || [])].sort((a, b) => a.setNumber - b.setNumber).at(-1)
  const lastEdit = history.at(-1)
  const canUndo = lastEdit && latestSaved?.setNumber === lastEdit.after.setNumber
    && latestSaved.scoreA === lastEdit.after.scoreA && latestSaved.scoreB === lastEdit.after.scoreB

  useEffect(() => {
    writer.setCallbacks({
      onIdle: () => {
        onScoresSaved?.(localSets.current)
        localSets.current = null
        setOptimistic(null)
        setSaveError('')
      },
      onError: () => setSaveError('Scores are not saved yet. Retry to sync your changes.'),
    })
  })
  useEffect(() => () => { clearTimeout(timer.current); writer.flush() }, [writer])

  const queueScore = (score) => {
    const { rewind, ...value } = score
    const sets = (localSets.current || match.sets || []).filter((set) => rewind ? set.setNumber < score.setNumber : set.setNumber !== score.setNumber).concat(value)
    localSets.current = sets
    setOptimistic(sets)
    setSaveError('')
    writer.enqueue(score)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => writer.flush(), 250)
  }

  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    const opener = openButton.current
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const onKey = (event) => {
      if (event.target.closest('.queue-score-prompt')) return
      if (event.key === 'Escape') { event.stopPropagation(); setExpanded(false) }
      if (event.key === 'Tab') {
        const buttons = [...closeButton.current.closest('[role="dialog"]').querySelectorAll('button:not(:disabled)')]
        const first = buttons[0], last = buttons.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey, true)
      opener?.focus()
    }
  }, [expanded])

  /// Pickleball side-out: only the serving side scores; otherwise the serve
  /// moves (partner, or side out). The serve is saved with the score.
  const playRally = (aWon) => {
    if (!pbGame || locked || match.paused || decided) return
    const { game: next, scored } = rally(pbGame, aWon)
    const serve = serveJson(next)
    setLocalServe(serve)
    if (scored) bump(aWon ? 'scoreA' : 'scoreB', 1, { serve })
    else queueScore({ setNumber: current.setNumber, scoreA: current.scoreA, scoreB: current.scoreB, serve })
  }

  const bump = (side, delta, extra = {}) => {
    const live = queueScoreState(game, localSets.current || match.sets || [])
    if (locked || match.paused || live.decided || live.current.setNumber > 9) return
    const previous = live.current
    const next = { setNumber: previous.setNumber, scoreA: previous.scoreA, scoreB: previous.scoreB, [side]: Math.min(999, Math.max(0, previous[side] + delta)), ...extra }
    if (next.scoreA === previous.scoreA && next.scoreB === previous.scoreB) return
    const prior = [...(localSets.current || match.sets || [])].sort((a, b) => a.setNumber - b.setNumber).at(-1) || previous
    historyRef.current = [...historyRef.current, { before: { setNumber: prior.setNumber, scoreA: prior.scoreA, scoreB: prior.scoreB }, after: next }]
    setHistory(historyRef.current)
    queueScore(next)
    if (delta > 0 && isQueueSetWon(game, next.scoreA, next.scoreB)) {
      const after = queueScoreState(game, (localSets.current || []))
      setCelebration((n) => n + 1)
      setPrompt({ type: after.decided ? 'win' : 'set', winner: next.scoreA > next.scoreB ? 'A' : 'B', setNumber: next.setNumber, scoreA: next.scoreA, scoreB: next.scoreB })
    } else if (delta > 0 && ['badminton', 'pickleball'].includes(sport)
      && previous.setNumber === Number(game.rules?.bestOf || 1)
      && Math.max(previous.scoreA, previous.scoreB) < Math.ceil(target / 2)
      && Math.max(next.scoreA, next.scoreB) >= Math.ceil(target / 2)) {
      setPrompt({ type: 'switch', urgent: true })
    }
  }

  const undo = () => {
    if (!canUndo || locked || match.paused) return
    const edit = historyRef.current.at(-1)
    if (!edit) return
    queueScore({ ...edit.before, rewind: true })
    historyRef.current = historyRef.current.slice(0, -1)
    setHistory(historyRef.current)
    setPrompt(null)
    setCelebration(0)
  }

  const endMatch = () => {
    const a = usesSets ? wins.A : current.scoreA
    const b = usesSets ? wins.B : current.scoreB
    if (a === b) { setPrompt({ type: 'end' }); return }
    const winner = a > b ? 'A' : 'B'
    setExpanded(false)
    onConfirmModal({
      title: 'End match?',
      description: `${teams[winner === 'A' ? 0 : 1]} wins ${a > b ? a : b}–${a > b ? b : a}${usesSets ? ' in completed sets' : ''}.${state.dropLastSet ? ' The unfinished last set will be excluded.' : ''} Record this result?`,
      confirmText: 'End Match', variant: 'danger', icon: Award,
      onConfirm: () => run(`${base}/complete`, { winner, dropLastSet: state.dropLastSet }),
    })
  }

  const warning = (side) => {
    if (decided) return null
    const left = pointsToQueueWin(game, current[`score${side}`], current[side === 'A' ? 'scoreB' : 'scoreA'])
    return left <= 2 ? <span className={`queue-point-warning${left === 1 ? ' is-last' : ''}`}>{left === 1 ? 'Last point!' : '2 points to win'}</span> : null
  }

  const scores = (large = false) => (
    <div className={`queue-live-scores${large ? ' is-expanded' : ''}`}>
      <div className="queue-live-scores__caption">{decided ? 'Match decided' : usesSets ? `Set ${current.setNumber}` : 'Score'}<span aria-live="polite">{optimistic ? 'Saving…' : 'Scores save automatically'}</span></div>
      {saveError && <p className="queue-live-score-error" role="alert">{saveError} <button type="button" onClick={() => writer.flush()}>Retry</button></p>}
      {pbGame && !decided && (
        <div className="pb-serve">
          <span className="pb-serve__call" aria-label="Score call">{callOf(pbGame)}</span>
          <small>{teams[pbGame.aServing ? 0 : 1]} serving{pbGame.doubles ? ` · server ${pbGame.server}` : ''} · from the {serveFromRight(pbGame) ? 'right' : 'left'}</small>
          <div className="pb-serve__rally">
            {['A', 'B'].map((side, i) => (
              <button key={side} type="button" disabled={locked || match.paused} onClick={() => playRally(side === 'A')}>Rally won: {teams[i]}</button>
            ))}
          </div>
        </div>
      )}
      {['A', 'B'].map((side, index) => <div className="queue-live-score" key={side}>
        <div className="queue-live-score__team"><small>Team {side}</small><strong>{teams[index]}</strong>{usesSets && <small>{wins[side]} set {wins[side] === 1 ? 'win' : 'wins'}</small>}{warning(side)}</div>
        <div className="queue-live-score__controls">
          <button type="button" aria-label={`Decrease Team ${side} score`} disabled={locked || decided || current[`score${side}`] === 0} onClick={() => bump(`score${side}`, -1)}><Minus size={20} /></button>
          <output aria-label={`Team ${side} score`} aria-live="polite">{current[`score${side}`]}</output>
          <button type="button" aria-label={`Increase Team ${side} score`} disabled={locked || decided} onClick={() => bump(`score${side}`, 1)}><Plus size={20} /></button>
        </div>
      </div>)}
    </div>
  )
  const actions = <div className="queue-live-actions">
    <button type="button" disabled={locked || !!optimistic} onClick={() => run(`${base}/pause`, { paused: true })}><Pause size={17} />Pause</button>
    <button type="button" className="queue-live-end" disabled={locked || !!optimistic} onClick={endMatch}><CircleStop size={18} />End Match</button>
  </div>

  return <section className="queue-detail-white-card manage-match-editor queue-live-match">
    <div className="manage-match-editor__header"><h4>{teams[0]} <span>vs</span> {teams[1]}</h4><span className={`manage-match-status${match.paused ? ' is-paused' : ''}`}>{match.paused ? match.sets?.length ? 'Paused' : 'Queued' : 'Live'}</span></div>
    {!!match.sets?.length && <div className="manage-match-sets">{[...match.sets].sort((a, b) => a.setNumber - b.setNumber).map((set) => <span key={set.setNumber}>{usesSets ? `Set ${set.setNumber}` : 'Score'} <b>{set.scoreA}–{set.scoreB}</b></span>)}</div>}
    {match.paused ? <>
      <p className="manage-match-hint">{match.sets?.length ? 'Paused — resume to continue scoring.' : 'Queued — start the match to begin scoring.'}</p>
      <button type="button" className="manage-match-action" disabled={locked} onClick={() => run(`${base}/pause`, { paused: false })}><Play size={18} />{match.sets?.length ? 'Resume Match' : 'Start Match'}</button>
    </> : <>{scores()}{actions}<button ref={openButton} type="button" className="queue-live-open" onClick={() => setExpanded(true)}><Monitor size={19} />Open Scoreboard</button></>}
    {!finished && <button type="button" className="manage-match-delete" disabled={locked || !!optimistic} onClick={() => onConfirmModal({ title: 'Delete match?', description: 'Delete this match and its scores? This cannot be undone.', confirmText: 'Delete', variant: 'danger', icon: Trash2, onConfirm: () => run(base, undefined, 'DELETE') })}><Trash2 size={16} />Delete match</button>}
    {expanded && createPortal(<div className="queue-scoreboard" role="dialog" aria-modal="true" aria-labelledby={`scoreboard-${match.id}`}>
      <header>
        <button type="button" ref={closeButton} aria-label="Close scoreboard" onClick={() => setExpanded(false)}><ArrowLeft /></button>
        <h2 id={`scoreboard-${match.id}`} className="queue-scoreboard__sr">{game.sport} scoreboard</h2>
        <div className="queue-scoreboard__tools">
          <button type="button" aria-label="Scoring information" aria-expanded={showInfo} onClick={() => setShowInfo(!showInfo)}><Info size={21} /></button>
          <span className="queue-scoreboard__sport" aria-label={game.sport}><QueueSportIcon sport={sport} size={25} /></span>
          <button type="button" aria-label="Swap sides" onClick={() => setSwapped(!swapped)}><ArrowLeftRight size={21} /></button>
        </div>
      </header>
      <p className="queue-scoreboard__rule">{scoringRule}</p>
      {saveError && <p className="queue-live-score-error" role="alert">{saveError} <button type="button" onClick={() => writer.flush()}>Retry</button></p>}
      <main className="queue-scoreboard__court">
        {(swapped ? ['B', 'A'] : ['A', 'B']).map((side) => <button type="button" key={side} className={`queue-scoreboard__side is-team-${side.toLowerCase()}`} aria-label={`Add point to ${teams[side === 'A' ? 0 : 1]}`} disabled={locked || match.paused || decided} onClick={() => bump(`score${side}`, 1)}>
          <span className="queue-scoreboard__name">{teams[side === 'A' ? 0 : 1]}<i /></span>
          <span className="queue-scoreboard__points" aria-live="polite">{current[`score${side}`]}</span>
          {warning(side)}
          {usesSets && <><span className="queue-scoreboard__sets">{wins[side]}</span><span className="queue-scoreboard__label">Sets</span></>}
          <span className="queue-scoreboard__hint">{match.paused ? 'Paused' : decided ? 'Match decided' : optimistic ? 'Saving…' : 'Tap to score'}</span>
        </button>)}
      </main>
      <footer><button type="button" disabled={locked || match.paused || !canUndo} onClick={undo}><Undo2 size={18} />Undo</button></footer>
    </div>, document.body)}
    {showInfo && createPortal(<ScorePrompt onClose={() => setShowInfo(false)}>
      <h2 style={{ textTransform: 'capitalize' }}>{sport} scoring</h2>
      <p>{scoringRule}.</p>
      {['tennis', 'padel'].includes(sport) && <p>Points progress 0 → 15 → 30 → 40. At deuce, win two consecutive points to win the game. This match board records games in each set.</p>}
      <p>Tap a score to add a {['tennis', 'padel'].includes(sport) ? 'game' : 'point'}. Yellow means two points from winning; red means the last point. Undo reverses score changes in order.</p>
      <p>Change ends between sets and when prompted during the deciding set. Scores save to this match automatically.</p>
      <button type="button" onClick={() => setShowInfo(false)}>Got it</button>
    </ScorePrompt>, document.body)}
    {celebration > 0 && createPortal(<div key={celebration} className="queue-score-confetti" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, background: ['#22c55e', '#ff7810', '#22d3ee', '#facc15'][index % 4], animationDelay: `${(index % 8) * .08}s`, transform: `rotate(${index * 29}deg)` }} />)}</div>, document.body)}
    {prompt && createPortal(<ScorePrompt onClose={() => setPrompt(null)}>
      <h2>{prompt.type === 'end' ? 'Who wins this match?' : prompt.type === 'switch' ? prompt.urgent ? 'Last change!' : 'Change ends' : `${teams[prompt.winner === 'A' ? 0 : 1]} ${prompt.type === 'win' ? 'wins the match!' : `wins Set ${prompt.setNumber}!`}`}</h2>
      <p>{prompt.type === 'end' ? 'The match is not decided. Choose the winner or record a draw.' : prompt.type === 'switch' ? 'Switch court ends before continuing play.' : `${prompt.scoreA}–${prompt.scoreB} · ${wins.A}–${wins.B} sets`}</p>
      {prompt.type === 'end' ? <>
        {['A', 'B', 'TIE'].map((winner) => <button type="button" key={winner} disabled={locked || !!optimistic} onClick={async () => {
          if (await run(`${base}/complete`, { winner, dropLastSet: state.dropLastSet })) { setPrompt(null); setExpanded(false) }
        }}>{winner === 'TIE' ? 'Draw' : `${teams[winner === 'A' ? 0 : 1]} wins`}</button>)}
        <button type="button" onClick={() => setPrompt(null)}>Cancel</button>
      </> : prompt.type === 'set' ? <>
        <p>{prompt.setNumber + 1 === Number(game.rules?.bestOf || 1) ? 'Deciding set coming up — change ends?' : `Change ends for Set ${prompt.setNumber + 1}?`}</p>
        <button type="button" disabled={locked || !canUndo} onClick={undo}>Undo Last Point</button>
        <div className="queue-score-prompt-actions">
          <button type="button" onClick={() => setPrompt(null)}>Later</button>
          <button type="button" onClick={() => { setSwapped((value) => !value); setPrompt(null) }}>Switch Ends</button>
        </div>
      </> : prompt.type === 'switch' ? <>
        <button type="button" onClick={() => setPrompt(null)}>Later</button>
        <button type="button" onClick={() => { setSwapped((value) => !value); setPrompt(null) }}>Switch</button>
      </> : <>
        <button type="button" disabled={locked || !canUndo} onClick={undo}>Undo Last Point</button>
        <button type="button" disabled={prompt.type === 'win' && (locked || !!optimistic)} onClick={() => {
          if (prompt.type === 'win') { setPrompt(null); endMatch() }
          else setPrompt({ type: 'switch' })
        }}>{prompt.type === 'win' ? 'End Match' : 'Continue'}</button>
      </>}
      {optimistic && <small role="status">Saving scores…</small>}
      {saveError && <p role="alert">{saveError}<button type="button" onClick={() => writer.flush()}>Retry</button></p>}
    </ScorePrompt>, document.body)}
  </section>
}

function ScorePrompt({ children, onClose }) {
  const panel = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    panel.current?.focus()
    return () => previous?.focus()
  }, [])
  return <div className="queue-score-prompt" onKeyDown={(event) => {
    event.stopPropagation()
    if (event.key === 'Escape') onClose()
    if (event.key === 'Tab') {
      const buttons = [...panel.current.querySelectorAll('button:not(:disabled)')]
      if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === panel.current)) { event.preventDefault(); buttons.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus() }
    }
  }}><div ref={panel} role="dialog" aria-modal="true" aria-label="Match scoring" tabIndex={-1}>{children}</div></div>
}
