import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isQueueSetWon, queueScoreState } from './queueScoring.js'

const badminton = { sport: 'BADMINTON', rules: { bestOf: 3, points: 21 } }
const set = (setNumber, scoreA, scoreB) => ({ setNumber, scoreA, scoreB })
test('badminton requires a two point lead, with a 30 point cap', () => {
  assert.equal(isQueueSetWon(badminton, 21, 20), false)
  assert.equal(isQueueSetWon(badminton, 22, 20), true)
  assert.equal(isQueueSetWon(badminton, 30, 29), true)
})
test('advances a completed set and stops when the match is decided', () => {
  const next = queueScoreState(badminton, [set(1, 21, 10)])
  assert.deepEqual(next.current, set(2, 0, 0))
  assert.deepEqual(next.wins, { A: 1, B: 0 })
  const final = queueScoreState(badminton, [set(1, 21, 10), set(2, 21, 19)])
  assert.equal(final.decided, true)
  assert.equal(final.current.setNumber, 2)
  assert.equal(final.dropLastSet, false)
})
test('excludes only an unfinished final set when ending', () => {
  assert.equal(queueScoreState(badminton, [set(1, 21, 10), set(2, 5, 7)]).dropLastSet, true)
  assert.equal(queueScoreState(badminton, []).dropLastSet, false)
})
test('respects one set format and custom point targets', () => {
  const queue = { sport: 'PICKLEBALL', rules: { bestOf: 1, points: 15 } }
  assert.equal(queueScoreState(queue, [set(1, 11, 5)]).decided, false)
  assert.equal(queueScoreState(queue, [set(1, 15, 5)]).decided, true)
})
test('basketball keeps a running score; tennis tallies games', () => {
  const state = queueScoreState({ sport: 'BASKETBALL' }, [set(1, 42, 31)])
  assert.equal(state.current.scoreA, 42)
  assert.equal(state.decided, false)
  assert.equal(state.dropLastSet, false)
  assert.equal(isQueueSetWon({ sport: 'TENNIS' }, 6, 5), false)
  assert.equal(isQueueSetWon({ sport: 'TENNIS' }, 7, 6), true)
})
