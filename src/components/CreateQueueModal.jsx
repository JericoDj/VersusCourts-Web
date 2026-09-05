import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Loader2, X } from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { SPORTS, sportGradient } from '../data/sports'
import { SportGlyph } from './SportIcon'
import '../styles/modals.css'

const SKILL_OPTIONS = [
  { id: 'BEGINNER', label: 'Beginner' },
  { id: 'INTERMEDIATE', label: 'Intermediate' },
  { id: 'ADVANCED', label: 'Advanced' },
  { id: 'PROFESSIONAL', label: 'Professional' },
]

export default function CreateQueueModal({ open, onClose, onCreated }) {
  const [sport, setSport] = useState('basketball')
  const [basketballFormat, setBasketballFormat] = useState('5x5')
  const [racketMode, setRacketMode] = useState('DOUBLES')
  const [title, setTitle] = useState('')
  const [customCourtName, setCustomCourtName] = useState('')
  const [customArea, setCustomArea] = useState('Metro Manila')
  const [dateStr, setDateStr] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [timeStr, setTimeStr] = useState('19:00')
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [playersNeeded, setPlayersNeeded] = useState(10)
  const [entryFee, setEntryFee] = useState(0)
  const [skill, setSkill] = useState('INTERMEDIATE')
  const [visibility, setVisibility] = useState('PUBLIC')
  const [description, setDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdResult, setCreatedResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleClose = useCallback(() => {
    setCreatedResult(null)
    setError('')
    setCopied(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleClose])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!customCourtName.trim()) {
      setError('Please provide a venue or court name.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const startDateTime = new Date(`${dateStr}T${timeStr}:00`).toISOString()

      const payload = {
        sport: sport.toUpperCase(),
        title: title.trim() || `${sport.charAt(0).toUpperCase() + sport.slice(1)} Openplay`,
        customCourtName: customCourtName.trim(),
        customArea: customArea.trim() || 'Metro Manila',
        startTime: startDateTime,
        playersNeeded: Number(playersNeeded) || 10,
        entryFee: Math.max(0, Number(entryFee) || 0),
        skill: skill,
        skills: [skill],
        visibility: visibility,
        description: description.trim() || undefined,
        rules: {
          ...(sport === 'basketball' ? { format: basketballFormat } : { mode: racketMode }),
          courtCount: 1,
          durationMinutes: Number(durationMinutes) || 120,
        },
      }

      const res = await apiRequest('/queues', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setCreatedResult(res)
      onCreated?.(res)
    } catch (err) {
      setError(err.message || 'Unable to create queue. Please check your details.')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    if (!createdResult?.inviteCode) return
    navigator.clipboard.writeText(createdResult.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return createPortal(
    <div
      className="sport-picker-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="sport-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="sport-picker-header">
          <h2 className="sport-picker-title">
            {createdResult ? 'Queue Created!' : 'Host a Queue / Open Play'}
          </h2>
          <button
            type="button"
            className="sport-picker-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {createdResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(22, 163, 74, 0.12)',
                color: '#16a34a',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Check size={32} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>
                {createdResult.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--vc-text-secondary)' }}>
                Your queue is now live! Share this invite code with players:
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 20px',
                background: 'var(--vc-surface-alt, #f8fafc)',
                border: '2px dashed var(--vc-primary)',
                borderRadius: 12,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  letterSpacing: 4,
                  color: 'var(--vc-primary)',
                  fontFamily: 'monospace',
                }}
              >
                {createdResult.inviteCode || 'CODE'}
              </span>

              <button
                type="button"
                className="scoreboard-icon-btn"
                onClick={copyCode}
                title="Copy code"
              >
                {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              className="scoreboard-main-point-btn"
              onClick={onClose}
              style={{ width: '100%', marginTop: 8 }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Sport selector buttons */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: 'var(--vc-text-secondary)' }}>
                SELECT SPORT
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {SPORTS.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSport(s.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '8px 4px',
                      border: sport === s.id ? '2px solid var(--vc-primary)' : '1px solid var(--vc-border)',
                      borderRadius: 10,
                      background: sport === s.id ? 'rgba(37, 99, 235, 0.08)' : 'var(--vc-surface-alt)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: sportGradient(s.id),
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                      }}
                    >
                      <SportGlyph sport={s.id} size={16} />
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--vc-text-primary)' }}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Venue */}
            <div>
              <label htmlFor="queue-format" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Game format</label>
              <select id="queue-format" className="scoreboard-settings-input" value={sport === 'basketball' ? basketballFormat : racketMode} onChange={(e) => sport === 'basketball' ? setBasketballFormat(e.target.value) : setRacketMode(e.target.value)}>
                {sport === 'basketball' ? <><option value="1x1">1v1</option><option value="3x3">3v3</option><option value="5x5">5v5</option></> : <><option value="SINGLES">Singles</option><option value="DOUBLES">Doubles</option></>}
              </select>
            </div>
            <div>
              <label htmlFor="queue-title" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                Queue Title
              </label>
              <input
                id="queue-title"
                className="scoreboard-settings-input"
                placeholder="e.g. Friday Night Runs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="queue-venue" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  Venue / Court Name *
                </label>
                <input
                  id="queue-venue"
                  required
                  className="scoreboard-settings-input"
                  placeholder="e.g. Kerry Sports BGC"
                  value={customCourtName}
                  onChange={(e) => setCustomCourtName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="queue-area" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  City / Area
                </label>
                <input
                  id="queue-area"
                  className="scoreboard-settings-input"
                  placeholder="e.g. Taguig"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                />
              </div>
            </div>

            {/* Schedule (Date & Start Time) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="queue-date" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  Date
                </label>
                <input
                  id="queue-date"
                  type="date"
                  required
                  className="scoreboard-settings-input"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="queue-time" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  Start Time
                </label>
                <input
                  id="queue-time"
                  type="time"
                  required
                  className="scoreboard-settings-input"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="queue-duration" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  Duration
                </label>
                <select
                  id="queue-duration"
                  className="scoreboard-settings-input"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                >
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                </select>
              </div>
            </div>

            {/* Capacity, Fee & Skill */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10 }}>
              <div>
                <label htmlFor="queue-needed" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  Players
                </label>
                <input
                  id="queue-needed"
                  type="number"
                  min="2"
                  max="100"
                  required
                  className="scoreboard-settings-input"
                  value={playersNeeded}
                  onChange={(e) => setPlayersNeeded(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="queue-fee" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  Fee (₱)
                </label>
                <input
                  id="queue-fee"
                  type="number"
                  min="0"
                  step="50"
                  className="scoreboard-settings-input"
                  placeholder="0 = Free"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="queue-skill" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  Skill Level
                </label>
                <select
                  id="queue-skill"
                  className="scoreboard-settings-input"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                >
                  {SKILL_OPTIONS.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description Notes */}
            <div>
              <label htmlFor="queue-desc" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                Description / Notes (Optional)
              </label>
              <textarea
                id="queue-desc"
                className="scoreboard-settings-input"
                rows={2}
                placeholder="What to expect — drills, format, match rules, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Visibility toggle */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ fontSize: 12.5, fontWeight: 700 }}>Visibility:</label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="vis"
                  checked={visibility === 'PUBLIC'}
                  onChange={() => setVisibility('PUBLIC')}
                />
                Public (Listed in Feed)
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="vis"
                  checked={visibility === 'PRIVATE'}
                  onChange={() => setVisibility('PRIVATE')}
                />
                Private (Code only)
              </label>
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--vc-danger, #ef4444)', fontWeight: 600 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="scoreboard-main-point-btn"
              style={{ marginTop: 8 }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Host Queue Now'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
