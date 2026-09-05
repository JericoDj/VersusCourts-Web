// Same effective defaults as the mobile Manage Queue screen.
export function queueFormatLabel(queue) {
  const rules = queue.rules || {}
  if (String(queue.sport).toLowerCase() === 'basketball') return `${rules.format || '5x5'} · ${rules.minutesPerQuarter || 10}m/qtr`
  const mode = String(rules.mode).toUpperCase() === 'SINGLES' ? 'Singles' : 'Doubles'
  const bestOf = rules.bestOf || 1
  const points = rules.points || (String(queue.sport).toLowerCase() === 'pickleball' ? 11 : 21)
  return `${mode} · ${bestOf === 1 ? '1 Set' : `Best of ${bestOf}`} · ${points} pts`
}
