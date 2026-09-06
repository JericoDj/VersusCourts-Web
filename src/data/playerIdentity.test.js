import test from 'node:test'
import assert from 'node:assert/strict'
import { toPlayerUser } from './playerIdentity.js'

test('profile refresh replaces cached display identity and preserves session fields', () => {
  const result = toPlayerUser({ firstName: 'Jordan', lastName: 'Rivera', username: 'newhandle', area: 'Quezon City' }, { id: 'one', name: 'Old Name', handle: '@old', location: 'Manila', initials: 'ON' })
  assert.equal(result.name, 'Jordan Rivera')
  assert.equal(result.handle, '@newhandle')
  assert.equal(result.location, 'Quezon City')
  assert.equal(result.initials, 'JR')
  assert.equal(result.id, 'one')
})

test('cleared profile fields do not restore stale cached values', () => {
  const result = toPlayerUser({ firstName: 'Jordan', lastName: '', area: '' }, { name: 'Jordan Rivera', lastName: 'Rivera', location: 'Manila' })
  assert.equal(result.name, 'Jordan')
  assert.equal(result.location, '')
  assert.equal(result.initials, 'J')
  assert.equal(toPlayerUser(null), null)
})
