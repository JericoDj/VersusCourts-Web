/// Centralized date utilities for safe parsing and formatting.
/// Handles Firestore Timestamps ({ seconds, nanoseconds } or .toDate()),
/// Date objects, ISO strings, and numeric timestamps. Never throws or returns 'Invalid Date'.

export function parseDateSafely(val) {
  if (!val) return null
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val
  }
  if (typeof val?.toDate === 'function') {
    try {
      const d = val.toDate()
      return Number.isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  }
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    const d = new Date(val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000))
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'number') {
    const d = new Date(val)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function formatRelativeTime(val) {
  const d = parseDateSafely(val)
  if (!d) return ''
  try {
    const now = new Date()
    const diffMs = now - d
    if (diffMs < 0) return 'Just now'
    const diffSecs = Math.floor(diffMs / 1000)
    if (diffSecs < 60) return 'Just now'
    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins < 60) return `${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function formatTime(val) {
  const d = parseDateSafely(val)
  if (!d) return ''
  try {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function formatDate(val) {
  const d = parseDateSafely(val)
  if (!d) return ''
  try {
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function toIsoSafely(val) {
  const d = parseDateSafely(val)
  return d ? d.toISOString() : new Date().toISOString()
}
