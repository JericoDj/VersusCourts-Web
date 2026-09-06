export function toPlayerUser(user, existingUser = null) {
  if (!user && !existingUser) return null
  const merged = { ...existingUser, ...user }
  const [first = 'Player', ...last] = (merged.name || '').trim().split(/\s+/)
  const firstName = merged.firstName ?? first
  const lastName = merged.lastName ?? last.join(' ')
  return {
    ...merged,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    handle: `@${merged.username || merged.email?.split('@')[0] || 'player'}`,
    location: merged.area ?? merged.location ?? '',
    initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'VC',
  }
}
