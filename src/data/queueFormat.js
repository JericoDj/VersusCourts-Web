// Same effective defaults as the mobile Manage Queue screen.
export function queueTeamSize(queue) {
  if (String(queue.sport).toLowerCase() === 'basketball') {
    const size = Number(String(queue.rules?.format || '5x5').split('x')[0])
    return Number.isInteger(size) && size > 0 ? size : 5
  }
  return String(queue.rules?.mode).toUpperCase() === 'SINGLES' ? 1 : 2
}

export function cyclePlayerTeam(teams, playerId, roster, teamSize) {
  const current = teams[playerId] || ''
  const choices = current === 'A' ? ['B', ''] : current === 'B' ? [''] : ['A', 'B', '']
  const next = choices.find((team) => !team || roster.filter((player) => player.id !== playerId && teams[player.id] === team).length < teamSize)
  return { ...teams, [playerId]: next }
}

export function queueFormatLabel(queue) {
  const rules = queue.rules || {}
  if (String(queue.sport).toLowerCase() === 'basketball') return `${rules.format || '5x5'} · ${rules.minutesPerQuarter || 10}m/qtr`
  const mode = String(rules.mode).toUpperCase() === 'SINGLES' ? 'Singles' : 'Doubles'
  const bestOf = rules.bestOf || 1
  const points = rules.points || (String(queue.sport).toLowerCase() === 'pickleball' ? 11 : 21)
  return `${mode} · ${bestOf === 1 ? '1 Set' : `Best of ${bestOf}`} · ${points} pts`
}
