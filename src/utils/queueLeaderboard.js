/**
 * Computes queue leaderboard from matches, mirroring the mobile Flutter implementation
 * in `computeQueueLeaderboard()`.
 */

const nameOf = (p) => {
  if (typeof p === 'string') return p
  return p?.name || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Player'
}

const idOf = (p, fallback) => {
  if (typeof p === 'string') return p
  return p?.id || p?.userId || fallback
}

export function computeQueueLeaderboard(matches = [], _sport = 'badminton') {
  const rows = {}

  const getRow = (p, fallbackId) => {
    const id = idOf(p, fallbackId)
    if (!rows[id]) {
      rows[id] = {
        userId: id,
        name: nameOf(p),
        avatarUrl: p?.avatarUrl || p?.user?.avatarUrl || '',
        wins: 0,
        losses: 0,
        ties: 0,
        setsWon: 0,
        setsLost: 0,
        points: 0,
        games: 0,
      }
    }
    return rows[id]
  }

  for (const m of matches) {
    if (m.status === 'ONGOING' || (!m.completed && m.status !== 'COMPLETED')) continue

    const sets = m.sets || []
    let setsA = 0
    let setsB = 0
    let ptsA = 0
    let ptsB = 0

    if (sets.length > 0) {
      for (const s of sets) {
        ptsA += Number(s.scoreA || 0)
        ptsB += Number(s.scoreB || 0)
        if (s.scoreA > s.scoreB) setsA++
        else if (s.scoreB > s.scoreA) setsB++
      }
    } else {
      ptsA = Number(m.scoreA || 0)
      ptsB = Number(m.scoreB || 0)
      if (ptsA > ptsB) setsA = 1
      else if (ptsB > ptsA) setsB = 1
    }

    const winner = m.winner || (m.result === 'teamA' ? 'A' : m.result === 'teamB' ? 'B' : m.result === 'tie' ? 'TIE' : null)

    const playersA = m.playersA?.length ? m.playersA : (m.teamA || []).map((name) => ({ name }))
    const playersB = m.playersB?.length ? m.playersB : (m.teamB || []).map((name) => ({ name }))

    for (let i = 0; i < playersA.length; i++) {
      const p = playersA[i]
      const r = getRow(p, `teamA_${i}_${nameOf(p)}`)
      r.games++
      r.setsWon += setsA
      r.setsLost += setsB
      r.points += ptsA
      if (winner === 'A') r.wins++
      else if (winner === 'B') r.losses++
      else if (winner === 'TIE') r.ties++
    }

    for (let i = 0; i < playersB.length; i++) {
      const p = playersB[i]
      const r = getRow(p, `teamB_${i}_${nameOf(p)}`)
      r.games++
      r.setsWon += setsB
      r.setsLost += setsA
      r.points += ptsB
      if (winner === 'B') r.wins++
      else if (winner === 'A') r.losses++
      else if (winner === 'TIE') r.ties++
    }
  }

  const entries = Object.values(rows)
  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    const aSetDiff = a.setsWon - a.setsLost
    const bSetDiff = b.setsWon - b.setsLost
    if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff
    return b.points - a.points
  })

  return entries
}
