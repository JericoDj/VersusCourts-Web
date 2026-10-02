import { test } from 'node:test'
import assert from 'node:assert/strict'
import { callOf, rally, resumeGame, serveFromRight } from './pickleball.js'

test('doubles opens on the 2nd server and only the serving side scores', () => {
  let g = resumeGame({ scoreA: 0, scoreB: 0, doubles: true })
  assert.equal(callOf(g), '0-0-2')
  let r = rally(g, true) // A serving, A wins → point
  assert.equal(r.scored, true)
  assert.equal(callOf(r.game), '1-0-2')
  r = rally(r.game, false) // A loses on the 2nd server → side out to B's 1st
  assert.equal(r.scored, false)
  assert.equal(r.game.aServing, false)
  assert.equal(callOf(r.game), '0-1-1')
  g = rally(r.game, true).game // B loses on the 1st → partner serves
  assert.equal(callOf(g), '0-1-2')
})

test('singles: even score serves from the right; losing a rally sides out', () => {
  const g = resumeGame({ scoreA: 3, scoreB: 2, doubles: false, serve: { aServing: true } })
  assert.equal(callOf(g), '3-2')
  assert.equal(serveFromRight(g), false)
  assert.equal(rally(g, false).game.aServing, false)
})
