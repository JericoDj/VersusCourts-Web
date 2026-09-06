import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createScoreWriter } from './scoreWriter.js'
import { queueScoreState, pointsToQueueWin } from './queueScoring.js'

test('undo across sets discards later pending sets and keeps rewind on subsequent taps', async () => {
  const calls = []
  const writer = createScoreWriter(async (score) => { calls.push(score) })
  writer.enqueue({ setNumber: 1, scoreA: 21, scoreB: 5 })
  writer.enqueue({ setNumber: 2, scoreA: 3, scoreB: 0 })
  writer.enqueue({ setNumber: 1, scoreA: 20, scoreB: 5, rewind: true })
  writer.enqueue({ setNumber: 1, scoreA: 19, scoreB: 5, rewind: true })
  writer.enqueue({ setNumber: 1, scoreA: 20, scoreB: 5 })
  await writer.flush()
  assert.deepEqual(calls, [{ setNumber: 1, scoreA: 20, scoreB: 5, rewind: true }])
  assert.equal(queueScoreState({ sport: 'badminton', rules: { bestOf: 3 } }, calls).wins.A, 0)
})

test('last-point warnings account for deuce and badminton cap', () => {
  const queue = { sport: 'badminton' }
  assert.equal(pointsToQueueWin(queue, 19, 10), 2)
  assert.equal(pointsToQueueWin(queue, 20, 10), 1)
  assert.equal(pointsToQueueWin(queue, 20, 20), 2)
  assert.equal(pointsToQueueWin(queue, 29, 29), 1)
})

test('rapid taps coalesce and newer taps during a save are sent afterward', async () => {
  let release
  const calls = []
  const writer = createScoreWriter(async (score) => {
    calls.push(score)
    if (calls.length === 1) await new Promise((resolve) => { release = resolve })
  }, { onIdle() {}, onError(error) { throw error } })
  writer.enqueue({ setNumber: 1, scoreA: 1, scoreB: 0 })
  writer.enqueue({ setNumber: 1, scoreA: 2, scoreB: 0 })
  const saving = writer.flush()
  writer.enqueue({ setNumber: 1, scoreA: 3, scoreB: 0 })
  release()
  await saving
  assert.deepEqual(calls.map((score) => score.scoreA), [2, 3])
})
test('failed saves retain the newest score for retry and preserve set ordering', async () => {
  let fail = true
  const calls = []
  const writer = createScoreWriter(async (score) => {
    if (fail) throw new Error('offline')
    calls.push(score)
  }, { onIdle() {}, onError() {} })
  writer.enqueue({ setNumber: 1, scoreA: 20, scoreB: 0 })
  await writer.flush()
  writer.enqueue({ setNumber: 1, scoreA: 21, scoreB: 0 })
  writer.enqueue({ setNumber: 2, scoreA: 1, scoreB: 0 })
  fail = false
  await writer.flush()
  assert.deepEqual(calls.map((score) => [score.setNumber, score.scoreA]), [[1, 21], [2, 1]])
})
