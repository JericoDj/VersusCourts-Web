import { useEffect, useId, useRef } from 'react'
import { Camera, Plus, X } from 'lucide-react'
import { uploadImage } from '../data/imageUploadService'
import '../styles/modals.css'

/// Up to [max] photos, the first being the cover — the same picker as
/// Create Queue, reusable. Items: `{ id, previewUrl, file? }` (no `file` =
/// already uploaded). Use `uploadPendingImages` on save.
export default function MultiImagePicker({ value, onChange, max = 5, label = 'Cover images (optional)' }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const latest = useRef(value)
  useEffect(() => { latest.current = value }, [value])

  // Free the local previews when the form goes away.
  useEffect(() => () => {
    for (const item of latest.current) if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
  }, [])

  const add = (files) => {
    const room = max - value.length
    if (!files?.length || room <= 0) return
    const items = Array.from(files).slice(0, room).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      previewUrl: URL.createObjectURL(file),
      file,
    }))
    onChange([...value, ...items])
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (id) => {
    const item = value.find((x) => x.id === id)
    if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
    onChange(value.filter((x) => x.id !== id))
  }

  return (
    <div className="tr-field">
      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
        <label htmlFor={inputId} style={{ cursor: 'pointer' }}>{label}</label>
        <small>{value.length}/{max}</small>
      </span>
      <div className="queue-images-row">
        {value.length < max && (
          <label htmlFor={inputId} className="queue-image-add" aria-label="Add photos">
            <Camera size={22} />
            <Plus size={14} style={{ marginTop: -4 }} />
          </label>
        )}
        <input id={inputId} ref={inputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => add(e.target.files)} />
        {value.map((img, i) => (
          <div key={img.id} className="queue-image-tile">
            <img src={img.previewUrl} alt="" />
            {i === 0 && <span className="queue-image-badge">Cover</span>}
            <button type="button" className="queue-image-remove" onClick={() => remove(img.id)} aria-label="Remove image"><X size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

/// Existing image URLs → picker items.
export const imageItems = (urls = []) => urls.filter(Boolean).map((url, i) => ({ id: `existing-${i}-${url}`, previewUrl: url }))

/// Uploads the new photos; returns every URL in order (failed uploads skipped).
export async function uploadPendingImages(items, folder) {
  const urls = []
  for (const item of items) {
    if (!item.file) { urls.push(item.previewUrl); continue }
    try {
      urls.push(await uploadImage(item.file, { folder }))
    } catch (err) {
      console.warn('Image upload failed, continuing without this photo:', err)
    }
  }
  return urls
}
