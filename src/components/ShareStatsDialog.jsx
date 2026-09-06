import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  SlidersHorizontal,
  X,
  Camera,
  Download,
  Tag,
  Share2,
  Trophy,
  Percent,
  Clock,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react'
import circularLogo from '../assets/logos/versus_courts_circular.webp'

// Inline Tennis Racket SVG matching Flutter Icons.sports_tennis_rounded
function TennisRacketIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <circle cx="15" cy="9" r="6" />
      <path d="m10.8 13.2-6.6 6.6a1.5 1.5 0 0 0 2.1 2.1l6.6-6.6" />
      <path d="m12 9 6 6" />
      <path d="m9 12 6-6" />
    </svg>
  )
}

const SECTIONS = [
  {
    id: 'games',
    label: 'Games played',
    tileLabel: 'GAMES PLAYED',
    icon: TennisRacketIcon,
    getValue: (stats) => String(stats.gamesPlayed ?? 0),
  },
  {
    id: 'wins',
    label: 'Wins',
    tileLabel: 'WINS',
    icon: Trophy,
    getValue: (stats) => String(stats.wins ?? 0),
  },
  {
    id: 'winRate',
    label: 'Win rate',
    tileLabel: 'WIN RATE',
    icon: Percent,
    getValue: (stats) => {
      const g = Number(stats.gamesPlayed || 0)
      const w = Number(stats.wins || 0)
      return `${g > 0 ? Math.round((w / g) * 100) : 0}%`
    },
  },
  {
    id: 'hoursPlayed',
    label: 'Hours played',
    tileLabel: 'HOURS PLAYED',
    icon: Clock,
    getValue: (stats) => String(stats.hoursPlayed ?? 0),
  },
]

function drawRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export default function ShareStatsDialog({ user = {}, stats = {}, onClose }) {
  // Mobile default visible sections: games and hoursPlayed
  const [visible, setVisible] = useState(['games', 'hoursPlayed'])
  const [selfieUrl, setSelfieUrl] = useState(null)
  const [isFrontCamera, setIsFrontCamera] = useState(true)

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCameraInitializing, setIsCameraInitializing] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  // Modals & sheets
  const [showCustomize, setShowCustomize] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Cleanup camera stream when dialog unmounts
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
    setIsCameraInitializing(false)
    setCameraError(null)
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const startCamera = async (front = isFrontCamera) => {
    stopCamera()
    setIsCameraActive(true)
    setIsCameraInitializing(true)
    setCameraError(null)
    setShowPhotoOptions(false)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: front ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setIsCameraInitializing(false)
    } catch (err) {
      console.warn('Camera start error:', err)
      setCameraError(err.message || 'Could not start camera.')
      setIsCameraInitializing(false)
    }
  }

  const switchCamera = () => {
    const nextFront = !isFrontCamera
    setIsFrontCamera(nextFront)
    startCamera(nextFront)
  }

  const snapSelfie = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const snapCanvas = document.createElement('canvas')
    const vw = video.videoWidth || 720
    const vh = video.videoHeight || 1280
    snapCanvas.width = vw
    snapCanvas.height = vh
    const ctx = snapCanvas.getContext('2d')

    if (isFrontCamera) {
      ctx.translate(vw, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, vw, vh)

    const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.9)
    setSelfieUrl(dataUrl)
    stopCamera()
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setSelfieUrl(event.target?.result)
      setShowPhotoOptions(false)
      if (isCameraActive) stopCamera()
    }
    reader.readAsDataURL(file)
  }

  const removeSelfie = () => {
    setSelfieUrl(null)
    setShowPhotoOptions(false)
    if (isCameraActive) stopCamera()
  }

  // Generate 1080x1920 high-res card for export (standard 9:16 story)
  const generateCanvas = async ({ sticker = false } = {}) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 1080, 1920)

    // 1. Backdrop
    if (!sticker) {
      if (selfieUrl) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = selfieUrl
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        }).catch(() => {})

        if (img.naturalWidth) {
          const scale = Math.max(1080 / img.naturalWidth, 1920 / img.naturalHeight)
          const w = img.naturalWidth * scale
          const h = img.naturalHeight * scale
          const x = (1080 - w) / 2
          const y = (1920 - h) / 2

          ctx.save()
          if (isFrontCamera) {
            ctx.translate(1080, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(img, (1080 - w) / 2, y, w, h)
          } else {
            ctx.drawImage(img, x, y, w, h)
          }
          ctx.restore()

          // Scrim gradient
          const scrim = ctx.createLinearGradient(0, 0, 0, 1920)
          scrim.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
          scrim.addColorStop(0.45, 'rgba(0, 0, 0, 0.0)')
          scrim.addColorStop(1, 'rgba(0, 0, 0, 0.75)')
          ctx.fillStyle = scrim
          ctx.fillRect(0, 0, 1080, 1920)
        }
      } else {
        // Deep electric blue & navy gradient
        const grad = ctx.createLinearGradient(0, 0, 1080, 1920)
        grad.addColorStop(0, '#0F172A')
        grad.addColorStop(0.35, '#1E1B4B')
        grad.addColorStop(0.70, '#0284C7')
        grad.addColorStop(1, '#0F172A')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 1080, 1920)
      }
    }

    // 2. Brand mark & logo
    try {
      const logoImg = new Image()
      logoImg.crossOrigin = 'anonymous'
      logoImg.src = circularLogo
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })

      ctx.save()
      ctx.beginPath()
      ctx.arc(105, 115, 34, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetY = 4
      ctx.fill()
      ctx.clip()
      ctx.drawImage(logoImg, 71, 81, 68, 68)
      ctx.restore()
    } catch {
      ctx.beginPath()
      ctx.arc(105, 115, 34, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    }

    // 3. Brand Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'left'
    ctx.letterSpacing = '1.5px'
    ctx.fillText('PLAYER ANALYTICS', 156, 123)

    // 4. Player Name
    const playerName = user.full_name || user.name || 'Player'
    const activeSections = SECTIONS.filter((s) => visible.includes(s.id))
    const isMultiRow = activeSections.length > 3 || activeSections.length === 4
    const boxHeight = isMultiRow ? 340 : 200
    const boxY = 1920 - boxHeight - 80
    const boxX = 70
    const boxW = 940

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(playerName, boxX + 10, boxY - 95, boxW - 20)

    // 5. LVL badge
    const levelVal = user.level || 1
    const levelText = `LVL ${levelVal}`
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const tw = ctx.measureText(levelText).width
    const pillW = Math.max(110, tw + 32)
    const pillH = 40
    const pillX = boxX + 10
    const pillY = boxY - 65

    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 20)
    ctx.fillStyle = '#F59E0B'
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(levelText, pillX + pillW / 2, pillY + pillH / 2)

    // 6. Frosted Glass Box
    if (activeSections.length > 0) {
      drawRoundRect(ctx, boxX, boxY, boxW, boxHeight, 36)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.lineWidth = 2.5
      ctx.stroke()

      const drawTile = (section, cx, cy) => {
        // Value
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(section.getValue(stats), cx, cy - 6)

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
        ctx.font = '800 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.letterSpacing = '1px'
        ctx.fillText(section.tileLabel, cx, cy + 42)
      }

      if (activeSections.length === 1) {
        drawTile(activeSections[0], boxX + boxW / 2, boxY + boxHeight / 2)
      } else if (activeSections.length === 2) {
        drawTile(activeSections[0], boxX + boxW * 0.28, boxY + boxHeight / 2)
        drawTile(activeSections[1], boxX + boxW * 0.72, boxY + boxHeight / 2)
      } else if (activeSections.length === 3) {
        drawTile(activeSections[0], boxX + boxW * 0.18, boxY + boxHeight / 2)
        drawTile(activeSections[1], boxX + boxW * 0.50, boxY + boxHeight / 2)
        drawTile(activeSections[2], boxX + boxW * 0.82, boxY + boxHeight / 2)
      } else if (activeSections.length === 4) {
        const row1Y = boxY + boxHeight * 0.28
        const row2Y = boxY + boxHeight * 0.72
        drawTile(activeSections[0], boxX + boxW * 0.28, row1Y)
        drawTile(activeSections[1], boxX + boxW * 0.72, row1Y)
        drawTile(activeSections[2], boxX + boxW * 0.28, row2Y)
        drawTile(activeSections[3], boxX + boxW * 0.72, row2Y)
      }
    }

    return canvas
  }

  const handleSaveImage = async (sticker = false) => {
    if (exporting) return
    setExporting(true)
    try {
      const canvas = await generateCanvas({ sticker })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not render image')

      const filename = sticker ? 'versus-player-stats-sticker.png' : 'versus-player-stats.png'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      showToast(sticker ? 'Saved transparent sticker!' : 'Saved stat card image!')
    } catch (err) {
      console.error(err)
      showToast('Failed to save image')
    } finally {
      setExporting(false)
    }
  }

  const handleShare = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const canvas = await generateCanvas({ sticker: false })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not render image')

      const file = new File([blob], 'versus-player-stats.png', { type: 'image/png' })
      const shareData = {
        files: [file],
        title: 'My Versus Courts Stats',
        text: '🎾 My stats on Versus Courts! #VersusCourts #PlayWinCompete',
      }

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData)
        showToast('Shared successfully!')
      } else {
        // Fallback for desktop / browsers that don't support file sharing:
        // Download the card image and copy the share caption to clipboard!
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'versus-player-stats.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)

        if (navigator.clipboard) {
          await navigator.clipboard.writeText('🎾 My stats on Versus Courts! #VersusCourts #PlayWinCompete')
          showToast('Image downloaded & caption copied to clipboard!')
        } else {
          showToast('Saved stat card image!')
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err)
        showToast('Could not share image')
      }
    } finally {
      setExporting(false)
    }
  }

  const toggleSection = (id) => {
    setVisible((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const activeSections = SECTIONS.filter((s) => visible.includes(s.id))
  const levelVal = user.level || 1
  const playerName = user.full_name || user.name || 'Player'

  return createPortal(
    <div
      className="pf-share-overlay"
      onClick={() => {
        if (!exporting) {
          stopCamera()
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="pf-share-container" onClick={(e) => e.stopPropagation()}>
        {/* TOP NAVBAR */}
        <div className="pf-share-navbar">
          <span className="pf-share-nav-title">MY STATS</span>
          <div className="pf-share-nav-actions">
            <button
              type="button"
              className="pf-share-icon-btn"
              title="Customize stats"
              onClick={() => setShowCustomize(true)}
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              type="button"
              className="pf-share-icon-btn"
              title="Close"
              onClick={() => {
                stopCamera()
                onClose()
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 9:16 STORY CARD PREVIEW */}
        <div className="pf-share-card-wrapper">
          <div className="pf-share-card-916">
            {/* Backdrop Layer */}
            {isCameraActive ? (
              <div className="pf-share-camera-box">
                {isCameraInitializing ? (
                  <div className="pf-share-camera-loading">
                    <Loader2 className="pf-spin" size={28} />
                    <span>Starting Camera…</span>
                  </div>
                ) : cameraError ? (
                  <div className="pf-share-camera-error">
                    <Camera size={32} />
                    <span>{cameraError}</span>
                  </div>
                ) : null}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`pf-share-video ${isFrontCamera ? 'is-flipped' : ''}`}
                />
                <div className="pf-share-scrim" />
              </div>
            ) : selfieUrl ? (
              <div className="pf-share-selfie-box">
                <img
                  src={selfieUrl}
                  alt="Player Selfie"
                  className={`pf-share-selfie-img ${isFrontCamera ? 'is-flipped' : ''}`}
                />
                <div className="pf-share-scrim" />
              </div>
            ) : (
              <div className="pf-share-gradient-backdrop" />
            )}

            {/* Top Brand Mark */}
            <div className="pf-share-brand-row">
              <div className="pf-share-brand-mark">
                <img src={circularLogo} alt="Versus Courts" />
              </div>
              <span className="pf-share-brand-text">PLAYER ANALYTICS</span>
            </div>

            {/* Bottom Card Content */}
            <div className="pf-share-bottom-content">
              <div className="pf-share-player-name">{playerName}</div>
              <div className="pf-share-level-pill">
                <span>LVL {levelVal}</span>
              </div>

              {activeSections.length > 0 && (
                <div
                  className={`pf-share-glass-box ${
                    activeSections.length === 3
                      ? 'is-three'
                      : activeSections.length === 4
                      ? 'is-four'
                      : 'is-two'
                  }`}
                >
                  {activeSections.map((section) => {
                    const IconComponent = section.icon
                    return (
                      <div key={section.id} className="pf-share-stat-tile">
                        <IconComponent size={16} className="pf-share-stat-icon" />
                        <span className="pf-share-stat-val">{section.getValue(stats)}</span>
                        <span className="pf-share-stat-lbl">{section.tileLabel}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION SUITE */}
        <div className="pf-share-action-suite">
          {isCameraActive ? (
            <>
              <div className="pf-share-pills-row">
                <button
                  type="button"
                  className="pf-share-pill-btn pf-share-pill-btn--snap"
                  onClick={snapSelfie}
                >
                  <Camera size={15} />
                  <span>Snap Photo</span>
                </button>
                <button
                  type="button"
                  className="pf-share-pill-btn"
                  onClick={switchCamera}
                  title="Flip camera"
                >
                  <RefreshCw size={15} />
                  <span>Flip</span>
                </button>
                <button
                  type="button"
                  className="pf-share-pill-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={15} />
                  <span>Gallery</span>
                </button>
              </div>
              <button
                type="button"
                className="pf-share-main-btn pf-share-main-btn--cancel"
                onClick={stopCamera}
              >
                <X size={18} />
                <span>Cancel Camera</span>
              </button>
            </>
          ) : (
            <>
              <div className="pf-share-pills-row">
                <button
                  type="button"
                  className="pf-share-pill-btn"
                  onClick={() => setShowPhotoOptions(true)}
                  disabled={exporting}
                >
                  <Camera size={15} />
                  <span>{selfieUrl ? 'Change' : 'Live Selfie'}</span>
                </button>
                <button
                  type="button"
                  className="pf-share-pill-btn"
                  onClick={() => handleSaveImage(false)}
                  disabled={exporting}
                >
                  <Download size={15} />
                  <span>Save Image</span>
                </button>
                <button
                  type="button"
                  className="pf-share-pill-btn"
                  onClick={() => handleSaveImage(true)}
                  disabled={exporting}
                >
                  <Tag size={15} />
                  <span>Save Sticker</span>
                </button>
              </div>

              <button
                type="button"
                className="pf-share-main-btn"
                onClick={handleShare}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="pf-spin" size={18} />
                ) : (
                  <Share2 size={18} />
                )}
                <span>Share to Instagram / Social Media</span>
              </button>
            </>
          )}
        </div>

        {/* Hidden file input for photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {/* CUSTOMIZE SHEET MODAL */}
        {showCustomize && (
          <div className="pf-share-sheet-backdrop" onClick={() => setShowCustomize(false)}>
            <div className="pf-share-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="pf-share-sheet-handle" />
              <div className="pf-share-sheet-header">
                <h3>Customize what to show</h3>
                <button
                  type="button"
                  className="pf-share-sheet-close"
                  onClick={() => setShowCustomize(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="pf-share-sheet-options">
                {SECTIONS.map((sec) => {
                  const isChecked = visible.includes(sec.id)
                  const Icon = sec.icon
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      className={`pf-share-option-row ${isChecked ? 'is-active' : ''}`}
                      onClick={() => toggleSection(sec.id)}
                    >
                      <div className="pf-share-option-left">
                        <span className={`pf-share-checkbox ${isChecked ? 'is-checked' : ''}`}>
                          {isChecked && <Check size={14} strokeWidth={3} />}
                        </span>
                        <Icon size={18} className="pf-share-sec-icon" />
                        <span className="pf-share-sec-label">{sec.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* PHOTO OPTIONS SHEET */}
        {showPhotoOptions && (
          <div className="pf-share-sheet-backdrop" onClick={() => setShowPhotoOptions(false)}>
            <div className="pf-share-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="pf-share-sheet-handle" />
              <div className="pf-share-sheet-header">
                <h3>Card Backdrop</h3>
                <button
                  type="button"
                  className="pf-share-sheet-close"
                  onClick={() => setShowPhotoOptions(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="pf-share-sheet-actions">
                <button
                  type="button"
                  className="pf-share-action-item"
                  onClick={() => startCamera()}
                >
                  <Camera size={20} />
                  <span>Take Live Selfie 🤳</span>
                </button>
                <button
                  type="button"
                  className="pf-share-action-item"
                  onClick={() => {
                    fileInputRef.current?.click()
                    setShowPhotoOptions(false)
                  }}
                >
                  <ImageIcon size={20} />
                  <span>Choose Photo from Gallery 🖼️</span>
                </button>
                {selfieUrl && (
                  <button
                    type="button"
                    className="pf-share-action-item pf-share-action-item--danger"
                    onClick={removeSelfie}
                  >
                    <Trash2 size={20} />
                    <span>Remove Selfie</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TOAST FEEDBACK */}
        {toastMessage && (
          <div className="pf-share-toast">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

