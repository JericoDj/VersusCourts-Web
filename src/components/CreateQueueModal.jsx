import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  ArrowRight,
  Award,
  Banknote,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Hourglass,
  Info,
  LayoutGrid,
  Loader2,
  Lock,
  Maximize2,
  Minus,
  Plus,
  Type,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../data/apiClient'
import { uploadImage } from '../data/imageUploadService'
import MultiDateCalendar from './MultiDateCalendar'
import '../styles/coach.css'
import { SportGlyph } from './SportIcon'
import CourtPickerModal from './CourtPickerModal'
import { TimePickerSheet, formatTimeDisplay, isOvernightTime } from './TimePickerSheet'
import '../styles/modals.css'

// Sport list matching mobile: Badminton is default, Basketball is LAST
const QUEUE_SPORTS = [
  { id: 'badminton', label: 'Badminton', color: '#16a34a' },
  { id: 'pickleball', label: 'Pickleball', color: '#ca8a04' },
  { id: 'tennis', label: 'Tennis', color: '#0284c7' },
  { id: 'padel', label: 'Padel', color: '#0d9488' },
  { id: 'basketball', label: 'Basketball', color: '#ea580c' },
]

const SKILL_LEVELS = [
  { id: 'BEGINNER', label: 'Beginner', color: '#16a34a' },
  { id: 'INTERMEDIATE', label: 'Intermediate', color: '#06b6d4' },
  { id: 'ADVANCED', label: 'Advanced', color: '#ea580c' },
  { id: 'PROFESSIONAL', label: 'Professional', color: '#dc2626' },
]

export default function CreateQueueModal({ open, onClose, onCreated, initialCourt, initialSport }) {
  const fileInputId = useId()
  const [title, setTitle] = useState('')
  const [coverImages, setCoverImages] = useState([]) // Array of { id, previewUrl, file, isExistingUrl }
  const [description, setDescription] = useState('')
  const [expandDescOpen, setExpandDescOpen] = useState(false)

  // Date selection: 14 days
  /// "Multiple dates": the same queue on every picked day (one queue
  /// credit each), linked as a series — like the app.
  const [multiDates, setMultiDates] = useState(false)
  const [seriesDays, setSeriesDays] = useState(() => new Set())
  const toggleSeriesDay = (key) => setSeriesDays((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else if (next.size < 30) next.add(key)
    return next
  })
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })

  // Time selection (start & optional end)
  const [startTime, setStartTime] = useState(() => {
    const now = new Date()
    let minute = Math.round(now.getMinutes() / 5) * 5
    let hour = now.getHours()
    if (minute >= 60) {
      hour = (hour + 1) % 24
      minute = 0
    }
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  })
  const [endTime, setEndTime] = useState('')
  const [timePickerTarget, setTimePickerTarget] = useState(null) // 'start' | 'end' | null

  const getDefaultEndTime = (start24) => {
    if (!start24) return '21:00'
    const [hStr, mStr] = start24.split(':')
    const h = (parseInt(hStr, 10) + 2) % 24
    const m = mStr || '00'
    return `${String(h).padStart(2, '0')}:${m}`
  }

  // Location / Court
  const [court, setCourt] = useState(initialCourt || null)
  const [courtPickerOpen, setCourtPickerOpen] = useState(false)

  // Sport (Badminton default, Basketball last)
  const [sport, setSport] = useState(initialSport ? String(initialSport).toLowerCase() : 'badminton')

  // Number of courts
  const [courtCount, setCourtCount] = useState(1)

  // Format
  const [racketMode, setRacketMode] = useState('DOUBLES') // 'SINGLES' | 'DOUBLES'
  const [basketballFormat, setBasketballFormat] = useState('5x5') // '1x1' | '3x3' | '5x5'

  // Score format & best of
  const [points, setPoints] = useState(21) // 11, 15, 21
  const [bestOf, setBestOf] = useState(3) // 1, 3, 5
  const [minPerQuarter, setMinPerQuarter] = useState(10) // 8, 10, 12 for basketball

  // Skill levels allowed
  const [selectedSkills, setSelectedSkills] = useState(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'])

  // Players needed
  const [playersNeeded, setPlayersNeeded] = useState(10)
  const [playersManuallySet, setPlayersManuallySet] = useState(false)

  // Host is playing
  const [hostIsPlaying, setHostIsPlaying] = useState(true)

  // Visibility
  const [visibility, setVisibility] = useState('PUBLIC') // 'PUBLIC' | 'PRIVATE'

  // Linked club
  const [leaderClubs, setLeaderClubs] = useState([])
  const [linkedClubId, setLinkedClubId] = useState(null)

  // Entry fee
  const [entryFee, setEntryFee] = useState(0)

  // Auth & Queue Master eligibility
  const { user } = useAuth()
  const roles = Array.isArray(user?.roles) ? user.roles : []
  const isEligibleForPaidQueue = Boolean(
    roles.includes('QUEUE_MASTER') ||
    roles.includes('ADMIN') ||
    roles.includes('SUPER_ADMIN') ||
    roles.includes('COACH')
  )
  const [qmApp, setQmApp] = useState(null)

  // Sport custom dropdown state
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false)
  const sportDropdownRef = useRef(null)

  // Submission / status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [snackbar, setSnackbar] = useState('')
  const snackbarTimerRef = useRef(null)
  const [createdResult, setCreatedResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const fileInputRef = useRef(null)
  const titleRef = useRef(null)
  const timeRef = useRef(null)
  const courtRef = useRef(null)
  const playersRef = useRef(null)
  const feeRef = useRef(null)

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current)
    }
  }, [])

  // Compute suggested players based on format and court count
  const getSuggestedPlayers = useCallback(
    (currentSport, bFormat, rMode, courts) => {
      let base = 4
      if (currentSport === 'basketball') {
        if (bFormat === '1x1') base = 2
        else if (bFormat === '3x3') base = 6
        else base = 10
      } else {
        base = rMode === 'SINGLES' ? 2 : 4
      }
      return base * courts
    },
    []
  )

  const handleSportChange = (newSport) => {
    setSport(newSport)
    if (!playersManuallySet) {
      setPlayersNeeded(getSuggestedPlayers(newSport, basketballFormat, racketMode, courtCount))
    }
  }

  const handleBasketballFormatChange = (newFormat) => {
    setBasketballFormat(newFormat)
    if (!playersManuallySet) {
      setPlayersNeeded(getSuggestedPlayers(sport, newFormat, racketMode, courtCount))
    }
  }

  const handleRacketModeChange = (newMode) => {
    setRacketMode(newMode)
    if (!playersManuallySet) {
      setPlayersNeeded(getSuggestedPlayers(sport, basketballFormat, newMode, courtCount))
    }
  }

  // Close sport dropdown when clicking outside
  useEffect(() => {
    if (!sportDropdownOpen) return
    const handleClickOutside = (e) => {
      if (sportDropdownRef.current && !sportDropdownRef.current.contains(e.target)) {
        setSportDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sportDropdownOpen])

  // Fetch Queue Master application status
  useEffect(() => {
    if (!open) return
    let active = true
    apiRequest('/queue-master-applications/my-application')
      .then((res) => {
        if (active) setQmApp(res)
      })
      .catch(() => {
        if (active) setQmApp(null)
      })
    return () => {
      active = false
    }
  }, [open])

  // Load user clubs for "Link to your club"
  useEffect(() => {
    if (!open) return
    let active = true
    apiRequest('/clubs/mine')
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        const eligible = list.filter((c) => c.myRole === 'CAPTAIN' || c.myRole === 'ADMIN')
        setLeaderClubs(eligible)
      })
      .catch(() => {
        // Non-critical: club selector just stays hidden
      })
    return () => {
      active = false
    }
  }, [open])

  const handleClose = useCallback(() => {
    setCreatedResult(null)
    setError('')
    setCopied(false)
    onClose()
  }, [onClose])

  // 14 days list for date picker chips
  const dateChips = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return d
  })

  // Check if end time is overnight
  const isOvernight = isOvernightTime

  // Cover image handling
  const handleImageFiles = (files) => {
    if (!files || files.length === 0) return
    const remainingSlots = 5 - coverImages.length
    if (remainingSlots <= 0) return

    const selected = Array.from(files).slice(0, remainingSlots)
    const newItems = selected.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      previewUrl: URL.createObjectURL(file),
      file,
      isExistingUrl: false,
    }))

    setCoverImages((prev) => [...prev, ...newItems])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveImage = (id) => {
    setCoverImages((prev) => {
      const item = prev.find((x) => x.id === id)
      if (item && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return prev.filter((x) => x.id !== id)
    })
  }

  // Stepper handlers
  const handleCourtCountChange = (delta) => {
    const next = Math.min(50, Math.max(1, courtCount + delta))
    setCourtCount(next)
    if (!playersManuallySet) {
      setPlayersNeeded(getSuggestedPlayers(sport, basketballFormat, racketMode, next))
    }
  }

  // Skill levels toggle
  const allLevelsSelected = selectedSkills.length === SKILL_LEVELS.length
  const handleToggleAllSkills = () => {
    if (allLevelsSelected) {
      setSelectedSkills(['INTERMEDIATE'])
    } else {
      setSelectedSkills(SKILL_LEVELS.map((s) => s.id))
    }
  }

  const handleToggleSkill = (skillId) => {
    if (selectedSkills.includes(skillId)) {
      if (selectedSkills.length > 1) {
        setSelectedSkills(selectedSkills.filter((id) => id !== skillId))
      }
    } else {
      setSelectedSkills([...selectedSkills, skillId])
    }
  }

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validations matching mobile
    const errors = {}
    if (!title.trim()) {
      errors.title = 'Give your queue a title.'
    }
    if (!startTime) {
      errors.time = 'Pick a start time.'
    }
    if (!court) {
      errors.court = 'Choose where you are playing.'
    }
    const players = Number(playersNeeded)
    if (!players || players < 2 || players > 100) {
      errors.players = 'Players needed must be between 2 and 100.'
    }
    const fee = Number(entryFee) || 0
    if (fee > 0) {
      if (fee < 20) {
        errors.fee = 'A paid queue must charge at least ₱20.'
      } else if (!isEligibleForPaidQueue) {
        errors.fee = 'Only approved Queue Masters can charge an entry fee. Set it to 0, or apply from your profile.'
      }
    }

    if (multiDates && seriesDays.size < 2) {
      errors.time = 'Pick at least two dates, or switch to a single date.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstKey = Object.keys(errors)[0]
      const firstMessage = errors[firstKey]
      setError(firstMessage)
      setSnackbar(firstMessage)

      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current)
      snackbarTimerRef.current = setTimeout(() => {
        setSnackbar('')
      }, 4500)

      const refMap = {
        title: titleRef,
        time: timeRef,
        court: courtRef,
        players: playersRef,
        fee: feeRef,
      }

      if (refMap[firstKey]?.current) {
        refMap[firstKey].current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const inputEl = refMap[firstKey].current.querySelector?.('input, textarea') || refMap[firstKey].current
        if (inputEl?.focus) inputEl.focus()
      }
      return
    }

    setFieldErrors({})
    setSnackbar('')
    setError('')
    setLoading(true)

    try {
      // 1. Upload pending cover images
      const uploadedImageUrls = []
      for (const item of coverImages) {
        if (item.isExistingUrl) {
          uploadedImageUrls.push(item.previewUrl)
        } else if (item.file) {
          try {
            const url = await uploadImage(item.file, { folder: 'queues' })
            uploadedImageUrls.push(url)
          } catch (uploadErr) {
            console.warn('Image upload failed, continuing without this photo:', uploadErr)
          }
        }
      }

      // 2. Build start & end ISO timestamps
      const y = selectedDate.getFullYear()
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const d = String(selectedDate.getDate()).padStart(2, '0')
      const startDateTime = new Date(`${y}-${m}-${d}T${startTime}:00`)

      let endDateTime = null
      if (endTime) {
        let endDate = new Date(selectedDate)
        if (isOvernight(startTime, endTime)) {
          endDate.setDate(endDate.getDate() + 1)
        }
        const ey = endDate.getFullYear()
        const em = String(endDate.getMonth() + 1).padStart(2, '0')
        const ed = String(endDate.getDate()).padStart(2, '0')
        endDateTime = new Date(`${ey}-${em}-${ed}T${endTime}:00`)
      }

      const rules = {
        ...(sport === 'basketball'
          ? { format: basketballFormat, minutesPerQuarter: minPerQuarter }
          : { mode: racketMode, points: points, bestOf: bestOf }),
        courtCount: Number(courtCount) || 1,
        ...(endDateTime ? { endTime: endDateTime.toISOString() } : {}),
      }

      const payload = {
        title: title.trim(),
        sport: sport.toUpperCase(),
        courtId: court.isCustom ? undefined : court.id || undefined,
        customCourtName: court.name.trim(),
        customArea: court.area.trim() || 'Metro Manila',
        customLat: court.lat || undefined,
        customLng: court.lng || undefined,
        startTime: startDateTime.toISOString(),
        playersNeeded: players,
        entryFee: fee,
        skill: selectedSkills[0] || 'INTERMEDIATE',
        skills: selectedSkills,
        rules,
        description: description.trim() || undefined,
        visibility,
        featured: fee > 0,
        hostIsPlaying,
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        clubId: linkedClubId || undefined,
      }

      // Multiple dates: every picked day at the same start time; the backend
      // keeps each date's length the same as the first's.
      const startTimes = multiDates
        ? [...seriesDays].sort().map((day) => new Date(`${day}T${startTime}:00`))
        : []
      if (multiDates && startTimes.some((t) => t <= new Date())) {
        throw new Error('Every date has to be in the future — check today’s start time.')
      }
      if (multiDates) {
        payload.startTime = startTimes[0].toISOString()
        payload.startTimes = startTimes.map((t) => t.toISOString())
        if (payload.rules?.endTime && endDateTime) {
          // Re-anchor the end to the first date.
          payload.rules.endTime = new Date(startTimes[0].getTime() + (endDateTime - startDateTime)).toISOString()
        }
      }
      const created = await apiRequest(multiDates ? '/queues/series' : '/queues', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const res = Array.isArray(created) ? created[0] : created

      setCreatedResult(res)
      onCreated?.(res)
    } catch (err) {
      const msg = err.message || 'Could not create queue. Please check your settings.'
      setError(msg)
      setSnackbar(msg)
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current)
      snackbarTimerRef.current = setTimeout(() => {
        setSnackbar('')
      }, 4500)
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

  if (!open) return null

  return createPortal(
    <div className="sport-picker-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div
        className="create-queue-modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching mobile: Close X on left, bold title centered */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--vc-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            className="sport-picker-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--vc-text-primary, #0f172a)' }}>
            {createdResult ? 'Queue Created!' : 'Create Queue Match'}
          </h2>
          <div style={{ width: 34 }} />
        </div>

        {createdResult ? (
          <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
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
              <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 800 }}>
                {createdResult.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--vc-text-secondary)' }}>
                Your queue match is now live! Share this invite code with players:
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 24px',
                background: 'var(--vc-surface-alt, #f8fafc)',
                border: '2px dashed var(--vc-primary, #2563eb)',
                borderRadius: 14,
              }}
            >
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: 4,
                  color: 'var(--vc-primary, #2563eb)',
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
              className="create-queue-submit-btn"
              onClick={handleClose}
              style={{ marginTop: 12 }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="create-queue-body">
              {/* 1. Queue Title */}
              <div>
                <label htmlFor="queue-title-input" className="create-queue-section-label" style={{ display: 'block', marginBottom: 8 }}>
                  Queue Title
                </label>
                <div
                  ref={titleRef}
                  className={`create-queue-input-wrap ${fieldErrors.title ? 'has-error' : ''}`}
                >
                  <Type size={18} color={fieldErrors.title ? '#ef4444' : '#94a3b8'} />
                  <input
                    id="queue-title-input"
                    type="text"
                    className="create-queue-input"
                    placeholder="e.g. Friday Night Pick-up"
                    maxLength={50}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (fieldErrors.title) {
                        setFieldErrors((prev) => ({ ...prev, title: undefined }))
                      }
                    }}
                  />
                </div>
                <div className="create-queue-counter">
                  {title.length}/50
                </div>
                {fieldErrors.title && (
                  <span className="queue-field-error-text">{fieldErrors.title}</span>
                )}
              </div>

              {/* 2. Cover Images (optional) 0/5 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label htmlFor={fileInputId} className="create-queue-section-label" style={{ cursor: 'pointer' }}>Cover Images (optional)</label>
                  <span style={{ fontSize: 12, color: 'var(--vc-text-tertiary, #94a3b8)', fontWeight: 600 }}>
                    {coverImages.length}/5
                  </span>
                </div>

                <div className="queue-images-row">
                  {coverImages.length < 5 && (
                    <label htmlFor={fileInputId} className="queue-image-add">
                      <Camera size={22} />
                      <Plus size={14} style={{ marginTop: -4 }} />
                    </label>
                  )}

                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageFiles(e.target.files)}
                  />

                  {coverImages.map((img, idx) => (
                    <div key={img.id} className="queue-image-tile">
                      <img src={img.previewUrl} alt="" />
                      {idx === 0 && <span className="queue-image-badge">Cover</span>}
                      <button
                        type="button"
                        className="queue-image-remove"
                        onClick={() => handleRemoveImage(img.id)}
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Description */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label htmlFor="queue-desc-input" className="create-queue-section-label">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpandDescOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 0,
                      color: 'var(--vc-primary, #2563eb)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 6,
                    }}
                  >
                    <Maximize2 size={13} />
                    <span>Expand</span>
                  </button>
                </div>
                <div className="create-queue-input-wrap" style={{ padding: '10px 14px', alignItems: 'flex-start' }}>
                  <textarea
                    id="queue-desc-input"
                    className="create-queue-input"
                    rows={3}
                    placeholder="Describe the queue match, rules, vibe..."
                    maxLength={5000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ resize: 'vertical', minHeight: 64 }}
                  />
                </div>
                <div className="create-queue-counter">
                  {description.length}/5000
                </div>
              </div>

              {/* 4. Date (Horizontal chips) */}
              <div>
                <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 8 }}>
                  Date
                </span>
                <div className="coach-segment coach-segment--small" role="tablist">
                  <button type="button" role="tab" aria-selected={!multiDates} className={!multiDates ? 'is-active' : ''} onClick={() => setMultiDates(false)}>Single</button>
                  <button type="button" role="tab" aria-selected={multiDates} className={multiDates ? 'is-active' : ''} onClick={() => setMultiDates(true)}>Multiple dates</button>
                </div>
                {multiDates ? (
                  <>
                    <MultiDateCalendar selected={seriesDays} onToggle={toggleSeriesDay} />
                    <p style={{ fontSize: 12, color: 'var(--vc-text-secondary)', margin: '6px 0 0' }}>
                      {seriesDays.size
                        ? `${seriesDays.size} dates picked · uses ${seriesDays.size} queue credits. Players see the next date; the rest show as scheduled.`
                        : 'Tap the days this queue runs. Each date uses one queue credit.'}
                    </p>
                  </>
                ) : (
                <div className="queue-date-scroll">
                  {dateChips.map((d) => {
                    const isSelected =
                      d.getFullYear() === selectedDate.getFullYear() &&
                      d.getMonth() === selectedDate.getMonth() &&
                      d.getDate() === selectedDate.getDate()

                    const today = new Date()
                    const isToday =
                      d.getFullYear() === today.getFullYear() &&
                      d.getMonth() === today.getMonth() &&
                      d.getDate() === today.getDate()

                    const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                    const dayNum = d.getDate()

                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        className={`queue-date-chip ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedDate(d)}
                      >
                        <span className="queue-date-chip__day">{dayAbbr}</span>
                        <span className="queue-date-chip__num">{dayNum}</span>
                        {isToday && <span className="queue-date-chip__dot" />}
                      </button>
                    )
                  })}
                </div>
                )}
              </div>

              {/* 5. Time (Start -> End) */}
              <div>
                <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 8 }}>
                  Time
                </span>
                <div className="queue-time-row">
                  {/* Start time tile */}
                  <div
                    ref={timeRef}
                    className={`queue-time-tile ${fieldErrors.time ? 'has-error' : ''}`}
                    onClick={() => setTimePickerTarget('start')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setTimePickerTarget('start')}
                  >
                    <Clock size={18} color={fieldErrors.time ? '#ef4444' : 'var(--vc-primary, #2563eb)'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="queue-time-tile__label">Start</div>
                      <div className="queue-time-tile__value">
                        {formatTimeDisplay(startTime) || 'Tap to set'}
                      </div>
                    </div>
                  </div>

                  <ArrowRight size={18} color="#94a3b8" style={{ flexShrink: 0 }} />

                  {/* End time tile */}
                  <div
                    className="queue-time-tile"
                    onClick={() => setTimePickerTarget('end')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setTimePickerTarget('end')}
                  >
                    <Clock size={18} color={endTime ? 'var(--vc-primary, #2563eb)' : '#94a3b8'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="queue-time-tile__label">End (Optional)</div>
                      <div className="queue-time-tile__value" style={{ color: endTime ? '#0f172a' : '#94a3b8' }}>
                        {endTime ? (
                          <>
                            {formatTimeDisplay(endTime)}
                            {isOvernight(startTime, endTime) && (
                              <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 700, marginLeft: 4 }}>
                                (+1 day)
                              </span>
                            )}
                          </>
                        ) : (
                          'Tap to set'
                        )}
                      </div>
                    </div>
                    {endTime && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEndTime('')
                        }}
                        style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer', color: '#94a3b8' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {fieldErrors.time && (
                  <span className="queue-field-error-text" style={{ marginTop: 6 }}>
                    {fieldErrors.time}
                  </span>
                )}

                {/* Cupertino Time Picker Bottom Sheet */}
                <TimePickerSheet
                  isOpen={Boolean(timePickerTarget)}
                  target={timePickerTarget}
                  initialTime={
                    timePickerTarget === 'start'
                      ? startTime
                      : endTime || getDefaultEndTime(startTime)
                  }
                  startTime={startTime}
                  onDone={(selectedTime24) => {
                    if (timePickerTarget === 'start') {
                      setStartTime(selectedTime24)
                      if (fieldErrors.time) {
                        setFieldErrors((prev) => ({ ...prev, time: undefined }))
                      }
                    } else {
                      setEndTime(selectedTime24)
                    }
                    setTimePickerTarget(null)
                  }}
                  onClose={() => setTimePickerTarget(null)}
                />
              </div>

              {/* 6. Location (Court Picker) */}
              <div>
                <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 4 }}>
                  Location
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--vc-text-secondary, #64748b)', marginBottom: 8 }}>
                  Court
                </span>
                <button
                  ref={courtRef}
                  type="button"
                  className={`queue-court-trigger ${fieldErrors.court ? 'has-error' : ''}`}
                  onClick={() => setCourtPickerOpen(true)}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: fieldErrors.court ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                      color: fieldErrors.court ? '#ef4444' : 'var(--vc-primary, #2563eb)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <LayoutGrid size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: court ? 800 : 500, color: court ? '#0f172a' : fieldErrors.court ? '#ef4444' : '#94a3b8' }}>
                      {court ? court.name : 'Tap to search a court'}
                    </div>
                    {court && (
                      <div style={{ fontSize: 12, color: 'var(--vc-text-secondary, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {court.organizationName
                          ? `${court.organizationName}${court.area ? ` · ${court.area}` : ''}`
                          : court.area}
                      </div>
                    )}
                  </div>
                  <ChevronDown size={18} color={fieldErrors.court ? '#ef4444' : '#94a3b8'} />
                </button>
                {fieldErrors.court && (
                  <span className="queue-field-error-text">
                    {fieldErrors.court}
                  </span>
                )}

                {court && court.organizationName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: 'var(--vc-text-secondary)' }}>
                    <Info size={14} />
                    <span>Hosted at {court.organizationName}</span>
                  </div>
                )}
                {court && court.isCustom && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: 'var(--vc-text-secondary)' }}>
                    <Info size={14} />
                    <span>Unlisted venue — not yet a registered business</span>
                  </div>
                )}
              </div>

              {/* 7. Sport (Badminton default, Basketball last) */}
              <div style={{ position: 'relative' }} ref={sportDropdownRef}>
                <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 8 }}>
                  Sport
                </span>
                <button
                  type="button"
                  className={`queue-sport-select-trigger ${sportDropdownOpen ? 'is-open' : ''}`}
                  onClick={() => setSportDropdownOpen((prev) => !prev)}
                >
                  <div style={{ color: (QUEUE_SPORTS.find((s) => s.id === sport) || QUEUE_SPORTS[0]).color, display: 'grid', placeItems: 'center', width: 22, height: 22, flexShrink: 0 }}>
                    <SportGlyph sport={sport} size={20} />
                  </div>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', flex: 1, textAlign: 'left' }}>
                    {(QUEUE_SPORTS.find((s) => s.id === sport) || QUEUE_SPORTS[0]).label}
                  </span>
                  <ChevronDown
                    size={18}
                    color="#94a3b8"
                    style={{
                      transform: sportDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {sportDropdownOpen && (
                  <div className="queue-sport-dropdown-menu">
                    {QUEUE_SPORTS.map((s) => {
                      const isActive = sport === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={`queue-sport-dropdown-item ${isActive ? 'is-active' : ''}`}
                          onClick={() => {
                            handleSportChange(s.id)
                            setSportDropdownOpen(false)
                          }}
                        >
                          <div style={{ color: s.color, display: 'grid', placeItems: 'center', width: 22, height: 22, flexShrink: 0 }}>
                            <SportGlyph sport={s.id} size={20} />
                          </div>
                          <span className="queue-sport-dropdown-item__label">{s.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 8. Number of Courts */}
              <div>
                <label htmlFor="queue-court-count-input" className="create-queue-section-label" style={{ display: 'block', marginBottom: 4 }}>
                  Number of Courts
                </label>
                <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--vc-text-secondary, #64748b)' }}>
                  Enter or select how many courts are allocated to this queue match.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="create-queue-input-wrap" style={{ flex: 1 }}>
                    <LayoutGrid size={18} color="#94a3b8" />
                    <input
                      id="queue-court-count-input"
                      type="number"
                      min="1"
                      max="50"
                      className="create-queue-input"
                      value={courtCount}
                      onChange={(e) => {
                        const val = Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1))
                        setCourtCount(val)
                        if (!playersManuallySet) {
                          setPlayersNeeded(getSuggestedPlayers(sport, basketballFormat, racketMode, val))
                        }
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', paddingRight: 4 }}>
                      {courtCount === 1 ? 'Court' : 'Courts'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="queue-stepper-btn"
                    disabled={courtCount <= 1}
                    onClick={() => handleCourtCountChange(-1)}
                    aria-label="Decrease courts"
                  >
                    <Minus size={18} />
                  </button>
                  <button
                    type="button"
                    className="queue-stepper-btn"
                    disabled={courtCount >= 50}
                    onClick={() => handleCourtCountChange(1)}
                    aria-label="Increase courts"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* 9. Format */}
              <div>
                <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 8 }}>
                  Format
                </span>
                {sport === 'basketball' ? (
                  <div className="queue-segmented">
                    {['1x1', '3x3', '5x5'].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        className={`queue-segmented-btn ${basketballFormat === fmt ? 'is-active' : ''}`}
                        onClick={() => handleBasketballFormatChange(fmt)}
                      >
                        {basketballFormat === fmt && <Check size={14} />}
                        <span>{fmt === '1x1' ? '1v1' : fmt === '3x3' ? '3v3' : '5v5'}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="queue-segmented">
                    {['SINGLES', 'DOUBLES'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`queue-segmented-btn ${racketMode === mode ? 'is-active' : ''}`}
                        onClick={() => handleRacketModeChange(mode)}
                      >
                        {racketMode === mode && <Check size={14} />}
                        <span>{mode === 'SINGLES' ? 'Singles' : 'Doubles'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 10. Score Format / Quarter Duration */}
              <div>
                <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 8 }}>
                  {sport === 'basketball' ? 'Minutes per quarter' : 'Score format'}
                </span>
                {sport === 'basketball' ? (
                  <div className="queue-chip-row">
                    {[8, 10, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`queue-chip ${minPerQuarter === m ? 'is-active' : ''}`}
                        onClick={() => setMinPerQuarter(m)}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="queue-chip-row">
                      {[11, 15, 21].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`queue-chip ${points === p ? 'is-active' : ''}`}
                          onClick={() => setPoints(p)}
                        >
                          {p} pts
                        </button>
                      ))}
                    </div>

                    <span className="create-queue-section-label" style={{ display: 'block', marginTop: 14, marginBottom: 8 }}>
                      Best of
                    </span>
                    <div className="queue-chip-row">
                      {[1, 3, 5].map((b) => (
                        <button
                          key={b}
                          type="button"
                          className={`queue-chip ${bestOf === b ? 'is-active' : ''}`}
                          onClick={() => setBestOf(b)}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 11. Skill Levels Allowed */}
              <div>
                <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 4 }}>
                  Skill Levels Allowed
                </span>
                <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--vc-text-secondary, #64748b)' }}>
                  Choose which player skill levels are welcome to join.
                </p>
                <div className="queue-chip-row">
                  <button
                    type="button"
                    className="queue-skill-pill"
                    style={{
                      backgroundColor: allLevelsSelected ? '#2563eb' : undefined,
                      borderColor: allLevelsSelected ? '#2563eb' : undefined,
                      color: allLevelsSelected ? '#ffffff' : undefined,
                    }}
                    onClick={handleToggleAllSkills}
                  >
                    {allLevelsSelected && <Check size={14} />}
                    <span>All Levels</span>
                  </button>

                  {SKILL_LEVELS.map((sk) => {
                    const isSelected = selectedSkills.includes(sk.id)
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        className={`queue-skill-pill ${isSelected ? 'is-active' : ''}`}
                        style={{
                          backgroundColor: isSelected ? sk.color : undefined,
                          borderColor: isSelected ? sk.color : undefined,
                        }}
                        onClick={() => handleToggleSkill(sk.id)}
                      >
                        {isSelected && <Check size={14} />}
                        <span>{sk.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 12. Players Needed */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="queue-players-needed-input" className="create-queue-section-label">
                    Players needed
                  </label>
                  <div style={{ width: 80 }}>
                    <input
                      ref={playersRef}
                      id="queue-players-needed-input"
                      type="number"
                      min="2"
                      max="100"
                      className={`scoreboard-settings-input ${fieldErrors.players ? 'has-error' : ''}`}
                      value={playersNeeded}
                      onChange={(e) => {
                        setPlayersManuallySet(true)
                        setPlayersNeeded(e.target.value)
                        if (fieldErrors.players) {
                          setFieldErrors((prev) => ({ ...prev, players: undefined }))
                        }
                      }}
                      style={{ textAlign: 'center', fontWeight: 800, fontSize: 16, padding: '8px 4px' }}
                    />
                  </div>
                </div>
                {fieldErrors.players && (
                  <span className="queue-field-error-text" style={{ textAlign: 'right' }}>
                    {fieldErrors.players}
                  </span>
                )}
              </div>

              {/* 13. I'll be playing too */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--vc-text-primary, #0f172a)' }}>
                    I&apos;ll be playing too
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--vc-text-secondary, #64748b)' }}>
                    Off if you&apos;re just running the queue, not playing.
                  </div>
                </div>
                <label className="queue-switch">
                  <input
                    type="checkbox"
                    checked={hostIsPlaying}
                    onChange={(e) => setHostIsPlaying(e.target.checked)}
                  />
                  <span className="queue-switch-slider" />
                </label>
              </div>

              {/* 14. Visibility (Public vs Private) */}
              <div>
                <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 8 }}>
                  Visibility
                </span>
                <div className="queue-choice-cards">
                  <button
                    type="button"
                    className={`queue-choice-card ${visibility === 'PUBLIC' ? 'is-selected' : ''}`}
                    onClick={() => setVisibility('PUBLIC')}
                  >
                    <div style={{ color: visibility === 'PUBLIC' ? '#0d57d4' : '#64748b', marginBottom: 8 }}>
                      <SportGlyph sport="all" size={20} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--vc-text-primary, #0f172a)' }}>
                      Public
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--vc-text-tertiary, #94a3b8)' }}>
                      Listed for anyone
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`queue-choice-card ${visibility === 'PRIVATE' ? 'is-selected' : ''}`}
                    onClick={() => setVisibility('PRIVATE')}
                  >
                    <div style={{ color: visibility === 'PRIVATE' ? '#0d57d4' : '#64748b', marginBottom: 8 }}>
                      <Lock size={20} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--vc-text-primary, #0f172a)' }}>
                      Private
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--vc-text-tertiary, #94a3b8)' }}>
                      Join by code only
                    </div>
                  </button>
                </div>
              </div>

              {/* 15. Link to your club (optional) */}
              {leaderClubs.length > 0 && (
                <div>
                  <span className="create-queue-section-label" style={{ display: 'block', marginBottom: 4 }}>
                    Link to your club (optional)
                  </span>
                  <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--vc-text-secondary, #64748b)' }}>
                    Shows this queue on your club&apos;s page under Upcoming.
                  </p>
                  <div className="queue-chip-row">
                    <button
                      type="button"
                      className={`queue-chip ${linkedClubId === null ? 'is-active' : ''}`}
                      onClick={() => setLinkedClubId(null)}
                    >
                      {linkedClubId === null && <Check size={14} />}
                      <span>None</span>
                    </button>
                    {leaderClubs.map((club) => (
                      <button
                        key={club.id}
                        type="button"
                        className={`queue-chip ${linkedClubId === club.id ? 'is-active' : ''}`}
                        onClick={() => setLinkedClubId(club.id)}
                      >
                        {linkedClubId === club.id && <Check size={14} />}
                        <span>{club.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 16. Entry fee per player */}
              <div>
                <label htmlFor="queue-entry-fee-input" className="create-queue-section-label" style={{ display: 'block', marginBottom: 4 }}>
                  Entry fee per player (₱)
                </label>
                <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--vc-text-secondary, #64748b)' }}>
                  Set to 0 for a free queue. Players will pay before joining.
                </p>
                <div
                  ref={feeRef}
                  className={`create-queue-input-wrap ${fieldErrors.fee ? 'has-error' : ''}`}
                >
                  <Banknote size={18} color={fieldErrors.fee ? '#ef4444' : '#94a3b8'} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: fieldErrors.fee ? '#ef4444' : '#94a3b8' }}>₱</span>
                  <input
                    id="queue-entry-fee-input"
                    type="number"
                    min="0"
                    step="10"
                    className="create-queue-input"
                    placeholder="0 = Free"
                    value={entryFee}
                    onChange={(e) => {
                      setEntryFee(e.target.value)
                      if (fieldErrors.fee) {
                        setFieldErrors((prev) => ({ ...prev, fee: undefined }))
                      }
                    }}
                  />
                </div>
                {fieldErrors.fee && (
                  <span className="queue-field-error-text">{fieldErrors.fee}</span>
                )}

                {Number(entryFee) > 0 && (
                  <>
                    {!isEligibleForPaidQueue ? (
                      qmApp?.status === 'PENDING' ? (
                        <div className="queue-qm-card is-pending">
                          <div className="queue-qm-card__header">
                            <div className="queue-qm-card__icon">
                              <Hourglass size={18} />
                            </div>
                            <div>
                              <div className="queue-qm-card__title">Application in Progress</div>
                              <div className="queue-qm-card__desc">
                                Your Queue Master application is currently under review by our team.
                              </div>
                            </div>
                          </div>
                          <a href="/profile" className="queue-qm-card__btn" onClick={handleClose}>
                            View Application Status
                          </a>
                        </div>
                      ) : (
                        <div className="queue-qm-card is-promo">
                          <div className="queue-qm-card__header">
                            <div className="queue-qm-card__icon">
                              <Award size={18} />
                            </div>
                            <div>
                              <div className="queue-qm-card__title">Become a Queue Master to charge fees</div>
                              <div className="queue-qm-card__desc">
                                Only approved Queue Masters can host paid queues.
                              </div>
                            </div>
                          </div>
                          <a href="/profile" className="queue-qm-card__btn" onClick={handleClose}>
                            Apply to become a Queue Master →
                          </a>
                        </div>
                      )
                    ) : (
                      <div className="queue-cancellation-notice">
                        No cancellations once a player has paid.
                      </div>
                    )}
                  </>
                )}
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 12, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Floating Snackbar Alert */}
            {snackbar && (
              <div className="queue-snackbar" role="alert">
                <div className="queue-snackbar__icon">
                  <AlertCircle size={18} />
                </div>
                <div className="queue-snackbar__text">{snackbar}</div>
                <button
                  type="button"
                  className="queue-snackbar__close"
                  onClick={() => setSnackbar('')}
                  aria-label="Dismiss error notification"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Sticky Bottom Bar with Full-Width Button */}
            <div className="create-queue-footer">
              <button
                type="submit"
                disabled={loading}
                className="create-queue-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Creating Queue Match...</span>
                  </>
                ) : (
                  'Create Queue Match'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Expanded Description Modal Dialog */}
      {expandDescOpen && (
        <div
          className="sport-picker-backdrop"
          style={{ zIndex: 1300 }}
          onClick={() => setExpandDescOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="sport-picker-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 580,
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
            }}
          >
            <div
              style={{
                padding: '16px 20px 12px',
                borderBottom: '1px solid var(--vc-border, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Queue Description</h3>
              <button
                type="button"
                className="sport-picker-close"
                onClick={() => setExpandDescOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                className="create-queue-input"
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: 280,
                  border: '1px solid var(--vc-border, #e2e8f0)',
                  borderRadius: 14,
                  padding: 14,
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  background: 'var(--vc-surface-alt, #f8fafc)',
                  boxSizing: 'border-box',
                  resize: 'none',
                }}
                placeholder="Describe the queue match, rules, vibe..."
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--vc-text-secondary)' }}>
                  Full description editor
                </span>
                <span className="create-queue-counter" style={{ margin: 0 }}>
                  {description.length}/5000
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--vc-border, #e2e8f0)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="create-queue-submit-btn"
                style={{ width: 'auto', padding: '0 24px', height: 42 }}
                onClick={() => setExpandDescOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Court Picker Modal */}
      <CourtPickerModal
        open={courtPickerOpen}
        value={court}
        onSelect={(selected) => {
          setCourt(selected)
          if (fieldErrors.court) {
            setFieldErrors((prev) => ({ ...prev, court: undefined }))
          }
        }}
        onClose={() => setCourtPickerOpen(false)}
      />
    </div>,
    document.body
  )
}
