import { useEffect, useRef } from 'react'

export default function ConfettiCanvas({ active, color = '#2563eb' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    const width = (canvas.width = window.innerWidth)
    const height = (canvas.height = window.innerHeight)

    const colors = [
      color,
      '#ef4444',
      '#f97316',
      '#f59e0b',
      '#22c55e',
      '#06b6d4',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#ffd700',
    ]

    const particleCount = 90
    const particles = []

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width * 0.5,
        y: height * 0.4,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        life: 0,
        maxLife: Math.random() * 60 + 90,
      })
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      let aliveCount = 0

      for (const p of particles) {
        p.life++
        if (p.life < p.maxLife) {
          aliveCount++
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.35 // Gravity
          p.vx *= 0.98 // Air drag
          p.rotation += p.rotationSpeed
          p.opacity = Math.max(0, 1 - p.life / p.maxLife)

          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.globalAlpha = p.opacity
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
          ctx.restore()
        }
      }

      if (aliveCount > 0) {
        animationFrameId = requestAnimationFrame(render)
      } else {
        ctx.clearRect(0, 0, width, height)
      }
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [active, color])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2000,
        width: '100%',
        height: '100%',
      }}
    />
  )
}
