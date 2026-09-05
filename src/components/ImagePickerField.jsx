import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Link as LinkIcon, Loader2, UploadCloud, X } from 'lucide-react'
import { uploadImage } from '../data/imageUploadService'

/**
 * ImagePickerField component matching Flutter's ImagePickerField.
 * Provides tap-to-upload from disk, drag-and-drop, loading spinner, preview,
 * remove button, and an optional toggle to paste a direct image URL.
 */
export default function ImagePickerField({
  label,
  value,
  onChange,
  folder = 'clubs',
  aspectRatio = null,
  isCircular = false,
  helperText,
  deferUpload = true,
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP).')
      return
    }
    if (file.size && file.size > 10 * 1024 * 1024) {
      setUploadError('Image size cannot exceed 10MB.')
      return
    }

    setUploadError('')

    // Defer upload to submit time: show local preview immediately without network request or CORS
    if (deferUpload) {
      const previewUrl = URL.createObjectURL(file)
      onChange(previewUrl, file)
      setShowUrlInput(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setUploading(true)

    try {
      const publicUrl = await uploadImage(file, { folder })
      onChange(publicUrl, file)
      setShowUrlInput(false)
    } catch (err) {
      setUploadError(err?.message || 'Could not upload image. Try pasting a URL below.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileChange(file)
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    if (value && value.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(value)
      } catch {
        /* ignore */
      }
    }
    onChange('', null)
    setUploadError('')
  }

  const hasImage = Boolean(value?.trim())

  return (
    <div className={`image-picker-field ${isCircular ? 'is-circular' : ''}`}>
      <div className="image-picker-field__header">
        <label className="image-picker-field__label">{label}</label>
        {!hasImage && !uploading && (
          <button
            type="button"
            className="image-picker-field__toggle-mode"
            onClick={() => setShowUrlInput((prev) => !prev)}
          >
            {showUrlInput ? (
              <>
                <UploadCloud size={13} />
                <span>Upload file</span>
              </>
            ) : (
              <>
                <LinkIcon size={13} />
                <span>Paste URL</span>
              </>
            )}
          </button>
        )}
      </div>

      {showUrlInput && !hasImage ? (
        <div style={{ marginTop: 4 }}>
          <input
            type="url"
            className="queue-modal-input"
            placeholder="https://images.unsplash.com/..."
            value={value || ''}
            onChange={(e) => onChange(e.target.value, null)}
            style={{ fontSize: 13 }}
            autoFocus
          />
        </div>
      ) : (
        <div
          className={`image-picker-tile ${isCircular ? 'is-circular' : ''} ${
            hasImage ? 'has-image' : ''
          } ${isDragOver ? 'is-dragover' : ''} ${uploading ? 'is-uploading' : ''}`}
          style={{
            ...(aspectRatio && !isCircular ? { aspectRatio: String(aspectRatio) } : {}),
          }}
          onClick={() => {
            if (!uploading && fileInputRef.current) {
              fileInputRef.current.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click()
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            disabled={uploading}
          />

          {uploading ? (
            <div className="image-picker-tile__loading">
              <Loader2 size={24} className="animate-spin" />
              <span>Uploading...</span>
            </div>
          ) : hasImage ? (
            <div className="image-picker-tile__preview">
              <img src={value} alt="" />
              <button
                type="button"
                className="image-picker-tile__remove"
                onClick={handleRemove}
                title="Remove image"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
              <div className="image-picker-tile__hover-overlay">
                <Camera size={18} />
                <span>Change photo</span>
              </div>
            </div>
          ) : (
            <div className="image-picker-tile__placeholder">
              <div className="image-picker-tile__icon-box">
                {isCircular ? <Camera size={24} /> : <ImageIcon size={22} />}
              </div>
              <span className="image-picker-tile__action">
                {isCircular ? 'Upload Logo' : 'Upload Cover Photo'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Upload info & limit placed underneath so it is never hidden or clipped */}
      <div className="image-picker-field__footer">
        <span className="image-picker-field__limit">PNG, JPG or WebP up to 10MB</span>
        {helperText && (
          <span className="image-picker-field__helper"> · {helperText}</span>
        )}
      </div>

      {uploadError && (
        <p className="image-picker-field__error">{uploadError}</p>
      )}
    </div>
  )
}
