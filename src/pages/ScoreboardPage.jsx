import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowLeftRight,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Trophy,
  Undo2,
  X,
} from 'lucide-react'
import { SPORTS, sportColor } from '../data/sports'
import ConfettiCanvas from '../components/ConfettiCanvas'
import '../styles/scoreboard.css'

const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
]

function calcTennisScore(pointA, pointB, gamesA, gamesB, setsA, setsB, scoringTeam) {
  let nextPtA = pointA
  let nextPtB = pointB
  let nextGamesA = gamesA
  let nextGamesB = gamesB
  let nextSetsA = setsA
  let nextSetsB = setsB
  let matchWonBy = null
  let setFinished = null

  const handleGameWon = (winner) => {
    nextPtA = 0
    nextPtB = 0
    if (winner === 'A') nextGamesA += 1
    else nextGamesB += 1

    const wonSetA = (nextGamesA >= 6 && nextGamesA - nextGamesB >= 2) || nextGamesA === 7
    const wonSetB = (nextGamesB >= 6 && nextGamesB - nextGamesA >= 2) || nextGamesB === 7

    if (wonSetA) {
      nextSetsA += 1
      setFinished = { a: nextGamesA, b: nextGamesB }
      nextGamesA = 0
      nextGamesB = 0
      if (nextSetsA >= 2) matchWonBy = 'A'
    } else if (wonSetB) {
      nextSetsB += 1
      setFinished = { a: nextGamesA, b: nextGamesB }
      nextGamesA = 0
      nextGamesB = 0
      if (nextSetsB >= 2) matchWonBy = 'B'
    }
  }

  if (scoringTeam === 'A') {
    if (pointA <= 2) {
      nextPtA += 1
    } else if (pointA === 3) {
      if (pointB < 3) handleGameWon('A')
      else if (pointB === 3) nextPtA = 4
      else if (pointB === 4) nextPtB = 3
    } else if (pointA === 4) {
      handleGameWon('A')
    }
  } else {
    if (pointB <= 2) {
      nextPtB += 1
    } else if (pointB === 3) {
      if (pointA < 3) handleGameWon('B')
      else if (pointA === 3) nextPtB = 4
      else if (pointA === 4) nextPtA = 3
    } else if (pointB === 4) {
      handleGameWon('B')
    }
  }

  return {
    tennisPointA: nextPtA,
    tennisPointB: nextPtB,
    gamesA: nextGamesA,
    gamesB: nextGamesB,
    setsA: nextSetsA,
    setsB: nextSetsB,
    setFinished,
    matchWonBy,
  }
}

function calcRallyScore(scoreA, scoreB, setsA, setsB, scoringTeam, target, cap) {
  let nextA = scoreA
  let nextB = scoreB
  let nextSetsA = setsA
  let nextSetsB = setsB
  let setFinished = null
  let matchWonBy = null

  if (scoringTeam === 'A') {
    nextA += 1
  } else {
    nextB += 1
  }

  const isWonA = (nextA >= target && nextA - nextB >= 2) || (cap > 0 && nextA >= cap)
  const isWonB = (nextB >= target && nextB - nextA >= 2) || (cap > 0 && nextB >= cap)

  if (isWonA) {
    nextSetsA += 1
    setFinished = { a: nextA, b: nextB }
    nextA = 0
    nextB = 0
    if (nextSetsA >= 2) matchWonBy = 'A'
  } else if (isWonB) {
    nextSetsB += 1
    setFinished = { a: nextA, b: nextB }
    nextA = 0
    nextB = 0
    if (nextSetsB >= 2) matchWonBy = 'B'
  }

  return {
    rallyScoreA: nextA,
    rallyScoreB: nextB,
    rallySetsA: nextSetsA,
    rallySetsB: nextSetsB,
    setFinished,
    matchWonBy,
  }
}

export default function ScoreboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentSportId = searchParams.get('sport') || 'basketball'
  const sport = useMemo(() => {
    return SPORTS.find((s) => s.id === currentSportId) || SPORTS[0]
  }, [currentSportId])

  // Team configurations
  const [teamA, setTeamA] = useState({ name: 'Team A', color: sportColor(sport.id) || '#f97316' })
  const [teamB, setTeamB] = useState({ name: 'Team B', color: '#06b6d4' })
  const [sidesSwapped, setSidesSwapped] = useState(false)

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  // Confetti / Winner celebration
  const [winner, setWinner] = useState(null)
  const [confettiActive, setConfettiActive] = useState(false)

  // Undo history
  const [history, setHistory] = useState([])

  // Basketball State
  const [quarter, setQuarter] = useState(1)
  const [quarterMinutes, setQuarterMinutes] = useState(10)
  const [clockSeconds, setClockSeconds] = useState(10 * 60)
  const [isClockRunning, setIsClockRunning] = useState(false)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [foulsA, setFoulsA] = useState(0)
  const [foulsB, setFoulsB] = useState(0)
  const [timeoutsA, setTimeoutsA] = useState(3)
  const [timeoutsB, setTimeoutsB] = useState(3)

  // Tennis & Padel State
  // Point values: 0, 1, 2, 3 (for 0, 15, 30, 40), 4 (Ad)
  const [tennisPointA, setTennisPointA] = useState(0)
  const [tennisPointB, setTennisPointB] = useState(0)
  const [gamesA, setGamesA] = useState(0)
  const [gamesB, setGamesB] = useState(0)
  const [setsA, setSetsA] = useState(0)
  const [setsB, setSetsB] = useState(0)
  const [setsHistory, setSetsHistory] = useState([]) // e.g. [{ a: 6, b: 4 }]

  // Rally (Badminton / Pickleball) State
  const [rallyScoreA, setRallyScoreA] = useState(0)
  const [rallyScoreB, setRallyScoreB] = useState(0)
  const [servingTeam, setServingTeam] = useState('A')
  const [rallySetsA, setRallySetsA] = useState(0)
  const [rallySetsB, setRallySetsB] = useState(0)
  const [rallySetsHistory, setRallySetsHistory] = useState([])
  const [changeEndsPrompt, setChangeEndsPrompt] = useState(false)

  // Target points for rally sports
  const rallyTarget = sport.id === 'pickleball' ? 11 : 21
  const rallyCap = sport.id === 'pickleball' ? 15 : 30

  // Basketball clock timer interval
  const timerRef = useRef(null)
  useEffect(() => {
    if (isClockRunning) {
      timerRef.current = window.setInterval(() => {
        setClockSeconds((prev) => {
          if (prev <= 1) {
            setIsClockRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isClockRunning])

  // Push state snapshot to undo history before making modifications
  const recordHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-15), // keep last 15 actions
      {
        quarter,
        clockSeconds,
        scoreA,
        scoreB,
        foulsA,
        foulsB,
        timeoutsA,
        timeoutsB,
        tennisPointA,
        tennisPointB,
        gamesA,
        gamesB,
        setsA,
        setsB,
        setsHistory: [...setsHistory],
        rallyScoreA,
        rallyScoreB,
        servingTeam,
        rallySetsA,
        rallySetsB,
        rallySetsHistory: [...rallySetsHistory],
        winner,
      },
    ])
  }, [
    quarter,
    clockSeconds,
    scoreA,
    scoreB,
    foulsA,
    foulsB,
    timeoutsA,
    timeoutsB,
    tennisPointA,
    tennisPointB,
    gamesA,
    gamesB,
    setsA,
    setsB,
    setsHistory,
    rallyScoreA,
    rallyScoreB,
    servingTeam,
    rallySetsA,
    rallySetsB,
    rallySetsHistory,
    winner,
  ])

  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((curr) => curr.slice(0, -1))

    setQuarter(prev.quarter)
    setClockSeconds(prev.clockSeconds)
    setScoreA(prev.scoreA)
    setScoreB(prev.scoreB)
    setFoulsA(prev.foulsA)
    setFoulsB(prev.foulsB)
    setTimeoutsA(prev.timeoutsA)
    setTimeoutsB(prev.timeoutsB)

    setTennisPointA(prev.tennisPointA)
    setTennisPointB(prev.tennisPointB)
    setGamesA(prev.gamesA)
    setGamesB(prev.gamesB)
    setSetsA(prev.setsA)
    setSetsB(prev.setsB)
    setSetsHistory(prev.setsHistory)

    setRallyScoreA(prev.rallyScoreA)
    setRallyScoreB(prev.rallyScoreB)
    setServingTeam(prev.servingTeam)
    setRallySetsA(prev.rallySetsA)
    setRallySetsB(prev.rallySetsB)
    setRallySetsHistory(prev.rallySetsHistory)

    setWinner(prev.winner)
  }

  const triggerVictory = useCallback((winningTeam) => {
    setWinner(winningTeam)
    setConfettiActive(true)
    setTimeout(() => setConfettiActive(false), 3000)
  }, [])

  // Basketball Actions
  const addBasketballScore = (team, points) => {
    recordHistory()
    if (team === 'A') {
      setScoreA((s) => Math.max(0, s + points))
    } else {
      setScoreB((s) => Math.max(0, s + points))
    }
  }

  const addFoul = (team) => {
    recordHistory()
    if (team === 'A') setFoulsA((f) => f + 1)
    else setFoulsB((f) => f + 1)
  }

  const consumeTimeout = (team) => {
    recordHistory()
    if (team === 'A') setTimeoutsA((t) => Math.max(0, t - 1))
    else setTimeoutsB((t) => Math.max(0, t - 1))
  }

  const advanceQuarter = () => {
    recordHistory()
    setQuarter((q) => (q >= 4 ? (q === 4 ? 'OT' : q) : q + 1))
    setClockSeconds(quarterMinutes * 60)
    setIsClockRunning(false)
    setFoulsA(0)
    setFoulsB(0)
  }

  // Tennis & Padel Logic
  const addTennisPoint = (team) => {
    recordHistory()
    const res = calcTennisScore(
      tennisPointA,
      tennisPointB,
      gamesA,
      gamesB,
      setsA,
      setsB,
      team
    )
    setTennisPointA(res.tennisPointA)
    setTennisPointB(res.tennisPointB)
    setGamesA(res.gamesA)
    setGamesB(res.gamesB)
    setSetsA(res.setsA)
    setSetsB(res.setsB)

    if (res.setFinished) {
      setSetsHistory((h) => [...h, res.setFinished])
    }
    if (res.matchWonBy) {
      triggerVictory(res.matchWonBy === 'A' ? teamA.name : teamB.name)
    }
  }

  const formatTennisPoint = (pt, otherPt) => {
    if (pt === 0) return '0'
    if (pt === 1) return '15'
    if (pt === 2) return '30'
    if (pt === 3) {
      if (otherPt === 3) return '40 (Deuce)'
      return '40'
    }
    if (pt === 4) return 'Ad'
    return '0'
  }

  // Rally (Badminton / Pickleball) Logic
  const addRallyPoint = (team) => {
    recordHistory()
    setServingTeam(team)

    const isDecidingGame = rallySetsA === 1 && rallySetsB === 1
    const switchPoint = sport.id === 'pickleball' ? 6 : 11
    if (
      isDecidingGame &&
      ((team === 'A' && rallyScoreA + 1 === switchPoint) ||
        (team === 'B' && rallyScoreB + 1 === switchPoint))
    ) {
      setChangeEndsPrompt(true)
    }

    const res = calcRallyScore(
      rallyScoreA,
      rallyScoreB,
      rallySetsA,
      rallySetsB,
      team,
      rallyTarget,
      rallyCap
    )
    setRallyScoreA(res.rallyScoreA)
    setRallyScoreB(res.rallyScoreB)
    setRallySetsA(res.rallySetsA)
    setRallySetsB(res.rallySetsB)

    if (res.setFinished) {
      setRallySetsHistory((h) => [...h, res.setFinished])
    }
    if (res.matchWonBy) {
      triggerVictory(res.matchWonBy === 'A' ? teamA.name : teamB.name)
    }
  }

  const resetAll = () => {
    setHistory([])
    setWinner(null)
    setConfettiActive(false)
    setConfirmResetOpen(false)

    setQuarter(1)
    setClockSeconds(quarterMinutes * 60)
    setIsClockRunning(false)
    setScoreA(0)
    setScoreB(0)
    setFoulsA(0)
    setFoulsB(0)
    setTimeoutsA(3)
    setTimeoutsB(3)

    setTennisPointA(0)
    setTennisPointB(0)
    setGamesA(0)
    setGamesB(0)
    setSetsA(0)
    setSetsB(0)
    setSetsHistory([])

    setRallyScoreA(0)
    setRallyScoreB(0)
    setServingTeam('A')
    setRallySetsA(0)
    setRallySetsB(0)
    setRallySetsHistory([])
    setChangeEndsPrompt(false)
  }

  // Format clock MM:SS
  const clockDisplay = useMemo(() => {
    const mins = Math.floor(clockSeconds / 60)
    const secs = clockSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [clockSeconds])

  // Which team is on left/right based on sidesSwapped
  const leftTeam = sidesSwapped ? teamB : teamA
  const rightTeam = sidesSwapped ? teamA : teamB
  const leftKey = sidesSwapped ? 'B' : 'A'
  const rightKey = sidesSwapped ? 'A' : 'B'

  return (
    <div className="scoreboard-container">
      <ConfettiCanvas active={confettiActive} color={teamA.color} />

      {/* Top Header Toolbar */}
      <div className="scoreboard-header">
        <div className="scoreboard-header__left">
          <button
            type="button"
            className="scoreboard-back-btn"
            onClick={() => navigate('/app/queues')}
          >
            <ArrowLeft size={16} /> Back to Play
          </button>

          {/* Sport Selector Dropdown */}
          <select
            className="scoreboard-sport-select"
            value={sport.id}
            onChange={(e) => {
              setSearchParams({ sport: e.target.value })
              resetAll()
            }}
          >
            {SPORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} Scoreboard
              </option>
            ))}
          </select>
        </div>

        <div className="scoreboard-header__actions">
          {history.length > 0 && (
            <button
              type="button"
              className="scoreboard-icon-btn"
              onClick={handleUndo}
              title="Undo last action"
            >
              <Undo2 size={16} />
              <span>Undo</span>
            </button>
          )}

          <button
            type="button"
            className="scoreboard-icon-btn"
            onClick={() => setSidesSwapped((s) => !s)}
            title="Swap sides"
          >
            <ArrowLeftRight size={16} />
            <span>Switch Sides</span>
          </button>

          <button
            type="button"
            className="scoreboard-icon-btn"
            onClick={() => setSettingsOpen(true)}
            title="Match Settings"
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>

          <button
            type="button"
            className="scoreboard-icon-btn"
            onClick={() => setConfirmResetOpen(true)}
            title="Reset match"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Winner Banner */}
      {winner && (
        <div className="scoreboard-winner-banner">
          <div className="scoreboard-winner-banner__text">
            <Trophy size={28} />
            <div>
              <h3>{winner} Wins the Match!</h3>
              <p>Congratulations to the winners. Great match!</p>
            </div>
          </div>
          <button
            type="button"
            className="scoreboard-winner-banner__btn"
            onClick={resetAll}
          >
            Start New Match
          </button>
        </div>
      )}

      {/* Deciding game change ends prompt */}
      {changeEndsPrompt && (
        <div
          className="scoreboard-winner-banner"
          style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)' }}
        >
          <div className="scoreboard-winner-banner__text">
            <ArrowLeftRight size={24} />
            <div>
              <h3>Change Ends</h3>
              <p>Deciding game reached mid-way target point. Please swap court sides!</p>
            </div>
          </div>
          <button
            type="button"
            className="scoreboard-winner-banner__btn"
            onClick={() => {
              setSidesSwapped((s) => !s)
              setChangeEndsPrompt(false)
            }}
          >
            Swap & Dismiss
          </button>
        </div>
      )}

      {/* Sport Center Info Panel */}
      {sport.id === 'basketball' && (
        <div className="scoreboard-center-panel">
          <div className="scoreboard-clock-row">
            <div
              className={`scoreboard-clock-digits ${isClockRunning ? 'is-running' : ''}`}
            >
              {clockDisplay}
            </div>

            <div className="scoreboard-clock-controls">
              <button
                type="button"
                className={`scoreboard-clock-btn ${isClockRunning ? '' : 'scoreboard-clock-btn--primary'}`}
                onClick={() => setIsClockRunning((r) => !r)}
                title={isClockRunning ? 'Pause Clock' : 'Start Clock'}
              >
                {isClockRunning ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                type="button"
                className="scoreboard-clock-btn"
                onClick={() => setClockSeconds((s) => Math.min(60 * 60, s + 60))}
                title="+1 Minute"
              >
                +1m
              </button>

              <button
                type="button"
                className="scoreboard-clock-btn"
                onClick={() => setClockSeconds((s) => Math.max(0, s - 60))}
                title="-1 Minute"
              >
                -1m
              </button>

              <button
                type="button"
                className="scoreboard-clock-btn"
                onClick={() => {
                  setClockSeconds(quarterMinutes * 60)
                  setIsClockRunning(false)
                }}
                title="Reset Clock"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          <div className="scoreboard-meta-pills">
            <span className="scoreboard-meta-pill scoreboard-meta-pill--active">
              Quarter: {typeof quarter === 'number' ? `Q${quarter}` : quarter}
            </span>
            <button
              type="button"
              className="scoreboard-meta-pill"
              onClick={advanceQuarter}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              Next Quarter →
            </button>
          </div>
        </div>
      )}

      {/* Tennis & Padel Set Indicator */}
      {(sport.id === 'tennis' || sport.id === 'padel') && (
        <div className="scoreboard-center-panel">
          <div className="scoreboard-meta-pills">
            <span className="scoreboard-meta-pill scoreboard-meta-pill--active">
              Sets: {teamA.name} {setsA} – {setsB} {teamB.name}
            </span>
            <span className="scoreboard-meta-pill">
              Games this set: {gamesA} – {gamesB}
            </span>
          </div>
          {setsHistory.length > 0 && (
            <div className="scoreboard-sets-bar">
              {setsHistory.map((sh, idx) => (
                <span key={idx} className="scoreboard-set-chip">
                  Set {idx + 1}: {sh.a}–{sh.b}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rally (Badminton / Pickleball) Set Indicator */}
      {(sport.id === 'badminton' || sport.id === 'pickleball') && (
        <div className="scoreboard-center-panel">
          <div className="scoreboard-meta-pills">
            <span className="scoreboard-meta-pill scoreboard-meta-pill--active">
              Game {rallySetsA + rallySetsB + 1} of 3 (Target: {rallyTarget} pts)
            </span>
            <span className="scoreboard-meta-pill">
              Games: {teamA.name} {rallySetsA} – {rallySetsB} {teamB.name}
            </span>
          </div>
          {rallySetsHistory.length > 0 && (
            <div className="scoreboard-sets-bar">
              {rallySetsHistory.map((rh, idx) => (
                <span key={idx} className="scoreboard-set-chip">
                  Game {idx + 1}: {rh.a}–{rh.b}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dual Teams Scoreboard Grid */}
      <div className="scoreboard-teams-grid">
        {[
          { team: leftTeam, key: leftKey },
          { team: rightTeam, key: rightKey },
        ].map(({ team, key }) => {
          const isTeamA = key === 'A'

          // Basketball values
          const curScore = isTeamA ? scoreA : scoreB
          const curFouls = isTeamA ? foulsA : foulsB
          const curTimeouts = isTeamA ? timeoutsA : timeoutsB

          // Tennis values
          const curTennisPt = isTeamA ? tennisPointA : tennisPointB
          const otherTennisPt = isTeamA ? tennisPointB : tennisPointA
          const curGames = isTeamA ? gamesA : gamesB

          // Rally values
          const curRallyPt = isTeamA ? rallyScoreA : rallyScoreB
          const isServing = servingTeam === key

          return (
            <article
              key={key}
              className="scoreboard-team-card"
              style={{ '--team-color': team.color }}
            >
              <div className="scoreboard-team-top-bar" />

              {/* Team Header */}
              <div className="scoreboard-team-header">
                <div className="scoreboard-team-name-row">
                  <span className="scoreboard-team-dot" />
                  <h2 className="scoreboard-team-name">{team.name}</h2>
                </div>

                {(sport.id === 'badminton' || sport.id === 'pickleball') && isServing && (
                  <span className="scoreboard-serve-badge">Serve</span>
                )}
              </div>

              {/* Big Score Display */}
              <div className="scoreboard-score-display">
                <div className="scoreboard-score-number">
                  {sport.id === 'basketball' && curScore}
                  {(sport.id === 'tennis' || sport.id === 'padel') &&
                    formatTennisPoint(curTennisPt, otherTennisPt)}
                  {(sport.id === 'badminton' || sport.id === 'pickleball') && curRallyPt}
                </div>

                <div className="scoreboard-score-sublabel">
                  {sport.id === 'basketball' && 'Points'}
                  {(sport.id === 'tennis' || sport.id === 'padel') && `Games: ${curGames}`}
                  {(sport.id === 'badminton' || sport.id === 'pickleball') &&
                    `Sets won: ${isTeamA ? rallySetsA : rallySetsB}`}
                </div>
              </div>

              {/* Score Action Buttons */}
              {sport.id === 'basketball' ? (
                <div className="scoreboard-btn-row scoreboard-btn-row--points">
                  <button
                    type="button"
                    className="scoreboard-point-btn"
                    onClick={() => addBasketballScore(key, 1)}
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    className="scoreboard-point-btn"
                    onClick={() => addBasketballScore(key, 2)}
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    className="scoreboard-point-btn"
                    onClick={() => addBasketballScore(key, 3)}
                  >
                    +3
                  </button>
                  <button
                    type="button"
                    className="scoreboard-point-btn scoreboard-point-btn--minus"
                    onClick={() => addBasketballScore(key, -1)}
                    title="Subtract 1"
                  >
                    -1
                  </button>
                </div>
              ) : sport.id === 'tennis' || sport.id === 'padel' ? (
                <button
                  type="button"
                  className="scoreboard-main-point-btn"
                  onClick={() => addTennisPoint(key)}
                >
                  + Point
                </button>
              ) : (
                <div className="scoreboard-btn-row">
                  <button
                    type="button"
                    className="scoreboard-main-point-btn"
                    onClick={() => addRallyPoint(key)}
                  >
                    + Point
                  </button>
                </div>
              )}

              {/* Secondary Stats for Basketball */}
              {sport.id === 'basketball' && (
                <div className="scoreboard-team-stats">
                  <div className="scoreboard-stat-col">
                    <span className="scoreboard-stat-label">Team Fouls</span>
                    <div className="scoreboard-stat-val-row">
                      <span className="scoreboard-stat-number">{curFouls}</span>
                      {curFouls >= 5 && (
                        <span className="scoreboard-stat-bonus">BONUS</span>
                      )}
                      <button
                        type="button"
                        className="scoreboard-stat-mini-btn"
                        onClick={() => addFoul(key)}
                        title="Add Foul"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="scoreboard-stat-col">
                    <span className="scoreboard-stat-label">Timeouts Left</span>
                    <div className="scoreboard-stat-val-row">
                      <span className="scoreboard-stat-number">{curTimeouts}</span>
                      <button
                        type="button"
                        className="scoreboard-stat-mini-btn"
                        onClick={() => consumeTimeout(key)}
                        disabled={curTimeouts <= 0}
                        title="Use Timeout"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {/* Match Settings Dialog */}
      {settingsOpen && (
        <div
          className="sport-picker-backdrop"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="scoreboard-settings-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sport-picker-header">
              <h2 className="sport-picker-title">Scoreboard Settings</h2>
              <button
                type="button"
                className="sport-picker-close"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Team A name & color */}
            <div className="scoreboard-settings-group">
              <label htmlFor="team-a-name">Team A Name</label>
              <input
                id="team-a-name"
                className="scoreboard-settings-input"
                value={teamA.name}
                onChange={(e) =>
                  setTeamA((t) => ({ ...t, name: e.target.value }))
                }
              />
              <label style={{ marginTop: 10 }}>Team A Color</label>
              <div className="scoreboard-color-palette">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`scoreboard-color-dot ${teamA.color === color ? 'is-active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setTeamA((t) => ({ ...t, color }))}
                  />
                ))}
              </div>
            </div>

            {/* Team B name & color */}
            <div className="scoreboard-settings-group">
              <label htmlFor="team-b-name">Team B Name</label>
              <input
                id="team-b-name"
                className="scoreboard-settings-input"
                value={teamB.name}
                onChange={(e) =>
                  setTeamB((t) => ({ ...t, name: e.target.value }))
                }
              />
              <label style={{ marginTop: 10 }}>Team B Color</label>
              <div className="scoreboard-color-palette">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`scoreboard-color-dot ${teamB.color === color ? 'is-active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setTeamB((t) => ({ ...t, color }))}
                  />
                ))}
              </div>
            </div>

            {/* Basketball quarter length */}
            {sport.id === 'basketball' && (
              <div className="scoreboard-settings-group">
                <label htmlFor="quarter-minutes">Quarter Length (Minutes)</label>
                <input
                  id="quarter-minutes"
                  type="number"
                  min="1"
                  max="20"
                  className="scoreboard-settings-input"
                  value={quarterMinutes}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 10)
                    setQuarterMinutes(val)
                    if (!isClockRunning) setClockSeconds(val * 60)
                  }}
                />
              </div>
            )}

            <button
              type="button"
              className="scoreboard-main-point-btn"
              onClick={() => setSettingsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {confirmResetOpen && (
        <div
          className="sport-picker-backdrop"
          onClick={() => setConfirmResetOpen(false)}
        >
          <div
            className="sport-picker-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: 'center' }}
          >
            <h2 className="sport-picker-title" style={{ marginBottom: 8 }}>
              Reset Scoreboard?
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: 'var(--vc-text-secondary)',
                marginBottom: 20,
              }}
            >
              All points, quarters, fouls, and sets will be cleared to zero.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="scoreboard-back-btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setConfirmResetOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="scoreboard-main-point-btn"
                style={{
                  flex: 1,
                  background: 'var(--vc-danger, #ef4444)',
                  padding: 12,
                  fontSize: 14,
                }}
                onClick={resetAll}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
