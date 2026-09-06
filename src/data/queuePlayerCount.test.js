import { test } from 'node:test'
import assert from 'node:assert/strict'
import { queuePlayerCount } from './queuePlayerCount.js'

test('list count excludes a non-playing host but includes guests', () => {
  assert.equal(queuePlayerCount({ _count: { participants: 3 }, hostIsPlaying: false }), 2)
  assert.equal(queuePlayerCount({ _count: { participants: 3 }, hostIsPlaying: true }), 3)
  assert.equal(queuePlayerCount({ _count: { participants: 3 }, hostIsPlaying: false, localPlayers: ['Guest'] }), 3)
  assert.equal(queuePlayerCount({ _count: { participants: 0 }, hostIsPlaying: false }), 0)
})
test('full participant roster takes precedence over an unfiltered count', () => {
  assert.equal(queuePlayerCount({ hostId: 'host', hostIsPlaying: false, _count: { participants: 4 }, participants: [
    { userId: 'host', status: 'JOINED' },
    { userId: 'player', status: 'JOINED' },
    { userId: 'request', status: 'REQUESTED' },
    { userId: 'cancelled', status: 'CANCELLED' },
  ] }), 1)
})
