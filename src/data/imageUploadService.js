import { apiRequest } from './apiClient'

/**
 * Uploads an image file to Firebase Storage via the backend's signed-URL endpoint
 * (`POST /storage/signed-url`), then returns the persistent public URL.
 *
 * @param {File|Blob} file - The image file to upload
 * @param {Object} [options]
 * @param {string} [options.folder='clubs'] - Destination folder in storage (e.g. 'clubs', 'courts')
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export async function uploadImage(file, { folder = 'clubs' } = {}) {
  if (!file) throw new Error('No file provided for upload.')

  // Check file size (max 10MB)
  if (file.size && file.size > 10 * 1024 * 1024) {
    throw new Error('Image size cannot exceed 10MB.')
  }

  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const contentType = file.type || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg')
  const path = `${folder}/${Date.now()}.${ext}`

  const signed = await apiRequest('/storage/signed-url', {
    method: 'POST',
    body: { path, contentType },
  })

  const uploadUrl = signed?.uploadUrl
  const publicUrl = signed?.publicUrl

  if (!uploadUrl || !publicUrl) {
    throw new Error('Server did not return a valid upload URL.')
  }

  let response
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    })
  } catch (err) {
    console.warn('[uploadImage] Storage PUT failed (likely bucket CORS policy):', err)
    throw new Error('Image storage upload blocked by CORS or network.')
  }

  if (!response.ok) {
    throw new Error(`Storage upload failed with status ${response.status}.`)
  }

  return publicUrl
}
