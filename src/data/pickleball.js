/// Web port of the app's PickleballGame (pickleball_score.dart) —
/// traditional side-out scoring:
/// - Only the serving side scores; win the rally while serving → a point,
///   and the same server serves again from the other side.
/// - Doubles: each side has a 1st and 2nd server. Lose on the 1st → the
///   partner serves; lose on the 2nd → side out. A game opens "0-0-2".
/// - Singles: lose the rally while serving → side out.
/// - The call is "server – receiver – server #" (no # in singles).
/// The serve state is saved with each score as `serve`:
/// `{ aServing, server, serveRight, doubles }`.

/// Picks up a game from its score and saved `serve` (team A on the 1st
/// server when nothing is saved).
export function resumeGame({ scoreA, scoreB, doubles, serve }) {
  const atStart = scoreA === 0 && scoreB === 0
  const saved = serve && typeof serve === 'object' ? serve : {}
  const server = doubles ? Math.min(2, Math.max(1, Number(saved.server) || (atStart ? 2 : 1))) : 1
  return {
    scoreA,
    scoreB,
    doubles,
    aServing: saved.aServing !== undefined ? Boolean(saved.aServing) : true,
    server,
    serveRight: saved.serveRight !== undefined ? Boolean(saved.serveRight) : true,
  }
}

export const servingScore = (g) => (g.aServing ? g.scoreA : g.scoreB)
export const receivingScore = (g) => (g.aServing ? g.scoreB : g.scoreA)

/// "4-2-1" (doubles) or "4-2" (singles).
export const callOf = (g) => (g.doubles ? `${servingScore(g)}-${receivingScore(g)}-${g.server}` : `${servingScore(g)}-${receivingScore(g)}`)

/// Serve from the right-hand court? (Singles: the server's score even.)
export const serveFromRight = (g) => (g.doubles ? g.serveRight : servingScore(g) % 2 === 0)

/// The game after a rally won by A ([aWon]) or B — `{ game, scored }`.
export function rally(g, aWon) {
  if (aWon === g.aServing) {
    return {
      scored: true,
      game: { ...g, scoreA: g.scoreA + (g.aServing ? 1 : 0), scoreB: g.scoreB + (g.aServing ? 0 : 1), serveRight: !g.serveRight },
    }
  }
  if (g.doubles && g.server === 1) {
    return { scored: false, game: { ...g, server: 2, serveRight: !g.serveRight } }
  }
  return { scored: false, game: sideOut(g) }
}

/// The serve passes to the other side's 1st server, from the right.
export const sideOut = (g) => ({ ...g, aServing: !g.aServing, server: 1, serveRight: true })

/// What's saved with the score.
export const serveJson = (g) => ({ aServing: g.aServing, server: g.server, serveRight: g.serveRight, doubles: g.doubles })
