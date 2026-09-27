import { apiList, apiRequest } from './apiClient'

/// Saved venues — unlisted places people added via "Can't find your court?"
/// (backend `venues.module.ts`), so the next host can pick them from search.

/// A saved venue as a court-picker option. It is still a custom venue, so
/// creating a queue/training sends it as customCourtName/customArea/lat/lng.
export const venueToOption = (v) => ({
  id: '',
  venueId: v.id,
  name: v.name || '',
  area: v.area || '',
  organizationName: '',
  sports: [],
  isCustom: true,
  lat: v.lat ?? null,
  lng: v.lng ?? null,
})

/// Saved venues matching `q` (most-used first). Best-effort: an older
/// server without `/venues` just yields none.
export const searchVenues = (q) =>
  apiList('/venues', { query: { q: q?.trim() || undefined } }).then((list) => list.map(venueToOption)).catch(() => [])

/// Saves a venue, or returns the listed court / saved venue that is already
/// this place (same Google place, or same name within ~150 m).
/// Resolves to `{ option, existing }` — `option.isCustom` is false for a
/// listed court.
export async function addVenue({ name, area, lat, lng, placeId }) {
  const res = await apiRequest('/venues', {
    method: 'POST',
    body: {
      name: name.trim(),
      ...(area?.trim() ? { area: area.trim() } : {}),
      ...(lat != null ? { lat } : {}),
      ...(lng != null ? { lng } : {}),
      ...(placeId ? { placeId } : {}),
    },
  })
  if (res?.type === 'court') {
    const c = res.court
    return {
      existing: true,
      option: {
        id: c.id,
        name: c.name || '',
        area: c.branch?.area || c.address || '',
        organizationName: c.branch?.organization?.name || '',
        sports: c.sports || [],
        isCustom: false,
      },
    }
  }
  return { existing: res?.created !== true, option: venueToOption(res.venue) }
}
