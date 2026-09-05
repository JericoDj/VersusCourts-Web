import { apiRequest } from './apiClient'

/// Search players via the live backend API (/users/search?q=...)
/// Matches Flutter search_screen.dart & user_service.dart
export async function searchPlayers(query = '', { signal } = {}) {
  try {
    const res = await apiRequest('/users/search', {
      query: { q: query.trim() },
      signal,
    })
    const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
    return list.map((u) => ({
      id: u.id || u._id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Player',
      username: u.username || '',
      area: u.area || u.location || '',
      level: u.level || 1,
      image: u.avatarUrl || '',
    }))
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn('[searchPlayers] Search failed:', err)
    }
    return []
  }
}

/// Fetch a single player's public profile (/users/:id)
export async function getUserProfile(userId, { signal } = {}) {
  try {
    return await apiRequest(`/users/${userId}`, { signal })
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn('[getUserProfile] Failed to fetch profile:', err)
    }
    return null
  }
}
