import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Moon, X } from 'lucide-react'

// Convert "HH:mm" (24h) to { hour: 1-12, minute: '00'..'55', period: 'AM' | 'PM' }
export function parse24To12(time24) {
  let h = 19
  let m = 0
  if (time24 && typeof time24 === 'string' && time24.includes(':')) {
    const [hStr, mStr] = time24.split(':')
    h = parseInt(hStr, 10)
    m = parseInt(mStr, 10)
    if (isNaN(h)) h = 19
    if (isNaN(m)) m = 0
  }
  // Round minute to nearest 5
  m = Math.round(m / 5) * 5
  if (m >= 60) {
    h = (h + 1) % 24
    m = 0
  }
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  const minuteStr = String(m).padStart(2, '0')
  return { hour: displayH, minute: minuteStr, period }
}

// Convert { hour, minute, period } to "HH:mm" (24h)
export function format12To24({ hour, minute, period }) {
  let h = Number(hour) % 12
  if (period === 'PM') h += 12
  const m = String(minute).padStart(2, '0')
  return `${String(h).padStart(2, '0')}:${m}`
}

// Format 12-hour display string for UI (e.g. "7:00 PM")
export function formatTimeDisplay(time24) {
  if (!time24) return null
  const { hour, minute, period } = parse24To12(time24)
  return `${hour}:${minute} ${period}`
}

// Determine whether end time is overnight compared to start time
export function isOvernightTime(start24, end24) {
  if (!start24 || !end24) return false
  const [sH, sM] = start24.split(':').map(Number)
  const [eH, eM] = end24.split(':').map(Number)
  const startMin = sH * 60 + sM
  const endMin = eH * 60 + eM
  return endMin <= startMin
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
const PERIODS = ['AM', 'PM']

const ITEM_HEIGHT = 40

function WheelColumn({ items, value, onChange }) {
  const containerRef = useRef(null)
  const isScrollingRef = useRef(false)
  const timerRef = useRef(null)

  const selectedIndex = Math.max(0, items.indexOf(value))

  useEffect(() => {
    if (!containerRef.current || isScrollingRef.current) return
    const targetY = selectedIndex * ITEM_HEIGHT
    if (Math.abs(containerRef.current.scrollTop - targetY) > 2) {
      containerRef.current.scrollTop = targetY
    }
  }, [selectedIndex])

  // Mouse wheel scroll support
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let wheelAcc = 0
    let lastWheelTime = 0

    const onWheel = (e) => {
      e.preventDefault()
      e.stopPropagation()

      wheelAcc += e.deltaY
      const now = Date.now()

      if (Math.abs(wheelAcc) >= 25 || now - lastWheelTime > 90) {
        const step = wheelAcc > 0 ? 1 : -1
        wheelAcc = 0
        lastWheelTime = now

        const currentIdx = Math.max(0, items.indexOf(value))
        const nextIdx = Math.max(0, Math.min(items.length - 1, currentIdx + step))
        if (nextIdx !== currentIdx) {
          el.scrollTo({
            top: nextIdx * ITEM_HEIGHT,
            behavior: 'smooth',
          })
          onChange(items[nextIdx])
        }
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [items, value, onChange])

  const handleScroll = () => {
    if (!containerRef.current) return
    isScrollingRef.current = true

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!containerRef.current) return
      const currentScroll = containerRef.current.scrollTop
      const targetIdx = Math.round(currentScroll / ITEM_HEIGHT)
      const clampedIdx = Math.max(0, Math.min(items.length - 1, targetIdx))

      containerRef.current.scrollTo({
        top: clampedIdx * ITEM_HEIGHT,
        behavior: 'smooth',
      })

      if (items[clampedIdx] !== value) {
        onChange(items[clampedIdx])
      }
      isScrollingRef.current = false
    }, 60)
  }

  const handleItemClick = (index) => {
    if (!containerRef.current) return
    isScrollingRef.current = false
    containerRef.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: 'smooth',
    })
    onChange(items[index])
  }

  return (
    <div
      ref={containerRef}
      className="queue-time-wheel-col"
      onScroll={handleScroll}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' && selectedIndex > 0) {
          e.preventDefault()
          handleItemClick(selectedIndex - 1)
        } else if (e.key === 'ArrowDown' && selectedIndex < items.length - 1) {
          e.preventDefault()
          handleItemClick(selectedIndex + 1)
        }
      }}
    >
      <div style={{ height: 80, flexShrink: 0 }} />
      {items.map((item, idx) => {
        const isSelected = idx === selectedIndex
        const dist = Math.abs(idx - selectedIndex)
        return (
          <div
            key={item}
            className={`queue-time-wheel-item ${isSelected ? 'is-selected' : ''}`}
            onClick={() => handleItemClick(idx)}
            style={{
              height: ITEM_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              cursor: 'pointer',
              fontSize: isSelected ? 22 : dist === 1 ? 18 : 15,
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? '#0f172a' : dist === 1 ? '#64748b' : '#94a3b8',
              opacity: isSelected ? 1 : dist === 1 ? 0.7 : 0.35,
              transition: 'all 0.1s ease',
              userSelect: 'none',
            }}
          >
            {item}
          </div>
        )
      })}
      <div style={{ height: 80, flexShrink: 0 }} />
    </div>
  )
}

function TimePickerSheetContent({
  target,
  initialTime,
  startTime,
  onDone,
  onClose,
}) {
  const initial = parse24To12(initialTime)
  const [hour, setHour] = useState(initial.hour)
  const [minute, setMinute] = useState(initial.minute)
  const [period, setPeriod] = useState(initial.period)

  const currentTime24 = format12To24({ hour, minute, period })
  const isEnd = target === 'end'
  const isOvernight = isEnd && startTime ? isOvernightTime(startTime, currentTime24) : false
  const currentDisplayTime = `${hour}:${minute} ${period}`

  const handleDone = (e) => {
    if (e) e.stopPropagation()
    onDone(currentTime24)
  }

  const handleCancel = (e) => {
    if (e) e.stopPropagation()
    if (onClose) {
      onClose()
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onClose) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="queue-time-dialog-backdrop" onClick={handleCancel}>
      <div className="queue-time-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="queue-time-dialog-header">
          <div style={{ width: 30 }} />
          <span className="queue-time-dialog-title">
            {isEnd ? 'End Time' : 'Start Time'}
          </span>
          <button
            type="button"
            className="queue-time-dialog-close"
            onClick={handleCancel}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pill Banner for End Time */}
        {isEnd && startTime && (
          <div className="queue-time-dialog-pill-wrapper">
            <div
              className={`queue-time-dialog-pill ${
                isOvernight
                  ? 'queue-time-dialog-pill--overnight'
                  : 'queue-time-dialog-pill--sameday'
              }`}
            >
              {isOvernight ? (
                <>
                  <Moon size={13} style={{ flexShrink: 0 }} />
                  <span>
                    Next Day / Overnight (ends tomorrow at {currentDisplayTime})
                  </span>
                </>
              ) : (
                <>
                  <Clock size={13} style={{ flexShrink: 0 }} />
                  <span>
                    Same Day session (ends at {currentDisplayTime})
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* 3-column wheel */}
        <div className="queue-time-wheel-container">
          <div className="queue-time-wheel-highlight" />
          <WheelColumn
            items={HOURS}
            value={hour}
            onChange={setHour}
          />
          <WheelColumn
            items={MINUTES}
            value={minute}
            onChange={setMinute}
          />
          <WheelColumn
            items={PERIODS}
            value={period}
            onChange={setPeriod}
          />
        </div>

        {/* Footer Actions */}
        <div className="queue-time-dialog-actions">
          <button
            type="button"
            className="queue-time-dialog-btn-cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="queue-time-dialog-btn-done"
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function TimePickerSheet({
  isOpen,
  target, // 'start' | 'end'
  initialTime, // "HH:mm" (24h)
  startTime, // "HH:mm" (24h)
  onDone,
  onClose,
}) {
  if (!isOpen) return null

  return (
    <TimePickerSheetContent
      key={`${target}-${initialTime}`}
      target={target}
      initialTime={initialTime}
      startTime={startTime}
      onDone={onDone}
      onClose={onClose}
    />
  )
}
