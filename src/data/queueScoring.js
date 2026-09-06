export function pointsToQueueWin(queue, points, opponent) {
  const sport = String(queue.sport).toLowerCase()
  if (sport === 'basketball') return Infinity
  for (let extra = 1; extra <= 999; extra++) if (isQueueSetWon(queue, points + extra, opponent) && points + extra > opponent) return extra
  return Infinity
}

export function isQueueSetWon(queue, a, b) {
  const sport = String(queue.sport).toLowerCase()
  if (sport === 'basketball' || a === b) return false
  if (sport === 'tennis' || sport === 'padel') {
    return (Math.max(a, b) >= 6 && Math.abs(a - b) >= 2) || Math.max(a, b) === 7
  }
  const target = Number(queue.rules?.points) || (sport === 'pickleball' ? 11 : 21)
  return (Math.max(a, b) >= target && Math.abs(a - b) >= 2)
    || (sport === 'badminton' && Math.max(a, b) >= 30)
}

export function queueScoreState(queue, sets = []) {
  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber)
  const usesSets = String(queue.sport).toLowerCase() !== 'basketball'
  const wins = { A: 0, B: 0 }
  for (const set of sorted) {
    if (usesSets && isQueueSetWon(queue, set.scoreA, set.scoreB)) wins[set.scoreA > set.scoreB ? 'A' : 'B']++
  }
  const needed = Math.ceil((Number(queue.rules?.bestOf) || 1) / 2)
  const decided = usesSets && Math.max(wins.A, wins.B) >= needed
  const last = sorted.at(-1)
  const advance = last && usesSets && isQueueSetWon(queue, last.scoreA, last.scoreB) && !decided
  const current = !last || advance
    ? { setNumber: last ? last.setNumber + 1 : 1, scoreA: 0, scoreB: 0 }
    : last
  return { current, wins, decided, usesSets, dropLastSet: !!last && usesSets && !isQueueSetWon(queue, last.scoreA, last.scoreB) }
}
