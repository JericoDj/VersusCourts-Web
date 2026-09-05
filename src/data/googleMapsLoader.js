export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDE-r3GWJPGiDeAKl08aF6FZGytxJ9d2Do'

let googleMapsPromise = null

/**
 * Lazily loads the Google Maps JavaScript API with Places and Marker libraries.
 */
export function loadGoogleMaps(apiKey = GOOGLE_MAPS_API_KEY) {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__versusGoogleMapsReady'
    const script = document.createElement('script')
    window[callbackName] = () => {
      delete window[callbackName]
      resolve(window.google.maps)
    }
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places,marker,geometry&loading=async&v=weekly&callback=${callbackName}`
    script.async = true
    script.onerror = () => {
      delete window[callbackName]
      googleMapsPromise = null
      reject(new Error('Google Maps could not load'))
    }
    document.head.append(script)
  })

  return googleMapsPromise
}

/**
 * Searches places via Google Places Autocomplete Service.
 */
export async function getPlacePredictions(query, sessionToken) {
  if (!query?.trim()) return []
  const maps = await loadGoogleMaps()
  if (!maps?.places?.AutocompleteService) return []

  const service = new maps.places.AutocompleteService()
  return new Promise((resolve) => {
    const request = {
      input: query,
      sessionToken,
      componentRestrictions: { country: 'ph' },
    }

    service.getPlacePredictions(request, (predictions, status) => {
      if (status === maps.places.PlacesServiceStatus.OK && Array.isArray(predictions)) {
        resolve(
          predictions.map((p) => ({
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
            description: p.description,
          }))
        )
      } else {
        // Fallback without country restriction
        service.getPlacePredictions({ input: query, sessionToken }, (fallbackPreds, fallbackStatus) => {
          if (fallbackStatus === maps.places.PlacesServiceStatus.OK && Array.isArray(fallbackPreds)) {
            resolve(
              fallbackPreds.map((p) => ({
                placeId: p.place_id,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
                description: p.description,
              }))
            )
          } else {
            resolve([])
          }
        })
      }
    })
  })
}

/**
 * Resolves a placeId to coordinates and structured address components.
 */
export async function geocodePlaceId(placeId) {
  const maps = await loadGoogleMaps()
  const geocoder = new maps.Geocoder()

  return new Promise((resolve) => {
    geocoder.geocode({ placeId }, (results, status) => {
      if (status === maps.GeocoderStatus.OK && results?.[0]) {
        resolve(parseGeocodeResult(results[0]))
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * Reverse geocodes a latitude and longitude to human-readable address and area.
 */
export async function reverseGeocodeLatLng(lat, lng) {
  const maps = await loadGoogleMaps()
  const geocoder = new maps.Geocoder()

  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === maps.GeocoderStatus.OK && results?.[0]) {
        resolve(parseGeocodeResult(results[0]))
      } else {
        resolve(null)
      }
    })
  })
}

function parseGeocodeResult(result) {
  const loc = result.geometry.location
  const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat)
  const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng)

  const components = result.address_components || []
  let locality = ''
  let adminArea = ''
  let sublocality = ''

  for (const c of components) {
    const types = c.types || []
    if (types.includes('locality')) {
      locality = c.long_name
    } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      sublocality = c.long_name
    } else if (types.includes('administrative_area_level_2')) {
      adminArea = c.long_name
    } else if (!adminArea && types.includes('administrative_area_level_1')) {
      adminArea = c.long_name
    }
  }

  const city = locality || sublocality
  const area = city && adminArea && city !== adminArea
    ? `${city}, ${adminArea}`
    : city || adminArea || (result.formatted_address ? result.formatted_address.split(',')[0] : '')

  return {
    lat,
    lng,
    formattedAddress: result.formatted_address || '',
    area,
    components,
  }
}
