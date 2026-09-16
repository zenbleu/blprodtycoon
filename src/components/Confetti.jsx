/**
 * Confetti.jsx — Canvas-based confetti burst
 * Prompt 8: imperative triggerConfetti() exported from module.
 * Mount <Confetti /> once in App.jsx; call triggerConfetti() anywhere.
 */
import { useEffect, useRef, useCallback } from 'react'

// ─── Module-level trigger registration ───────────────────────────────────────
let _trigger = null
export function triggerConfetti(intensity = 1) {
  _trigger?.(intensity)
}

// ─── Particle factory ─────────────────────────────────────────────────────────
const COLORS = [
  '#FF6B9D', '#FFD700', '#6BC5FF', '#5CE1A0',
  '#FF5470', '#C94F7C', '#FFFFFF', '#FF9EBC',
  '#FFE566', '#9B86C4',
]

function makeParticle(canvasW, canvasH, intensity) {
  const spread = canvasW * 0.9
  return {
    x:       canvasW / 2 + (Math.random() - 0.5) * spread,
    y:       -10 - Math.random() * 40,
    vx:      (Math.random() - 0.5) * 8 * intensity,
    vy:      Math.random() * 5 + 3,
    color:   COLORS[Math.floor(Math.random() * COLORS.length)],
    size:    Math.random() * 7 + 4,
    rot:     Math.random() * Math.PI * 2,
    rotV:    (Math.random() - 0.5) * 0.25,
    shape:   Math.random() < 0.5 ? 'rect' : 'diamond',
    alpha:   1,
    gravity: 0.18 + Math.random() * 0.12,
    drag:    0.99,
    life:    1,
    decay:   0.006 + Math.random() * 0.008,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Confetti() {
  const canvasRef  = useRef(null)
  const particles  = useRef([])
  const rafRef     = useRef(null)
  const activeRef  = useRef(false)

  const loop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let alive = false
    particles.current = particles.current.filter(p => {
      p.x   += p.vx
      p.y   += p.vy
      p.vy  += p.gravity
      p.vx  *= p.drag
      p.rot += p.rotV
      p.life -= p.decay
      p.alpha = Math.max(0, p.life)

      if (p.life <= 0 || p.y > canvas.height + 20) return false
      alive = true

      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      } else {
        ctx.beginPath()
        ctx.moveTo(0, -p.size / 2)
        ctx.lineTo(p.size / 2, 0)
        ctx.lineTo(0, p.size / 2)
        ctx.lineTo(-p.size / 2, 0)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      return true
    })

    if (alive) {
      rafRef.current = requestAnimationFrame(loop)
    } else {
      activeRef.current = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  const fire = useCallback((intensity = 1) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const count = Math.round(80 * intensity)
    const w = canvas.width
    const h = canvas.height
    for (let i = 0; i < count; i++) {
      particles.current.push(makeParticle(w, h, intensity))
    }

    // Second wave for bigger bursts
    if (intensity >= 1) {
      setTimeout(() => {
        for (let i = 0; i < Math.round(50 * intensity); i++) {
          particles.current.push(makeParticle(w, h, intensity))
        }
      }, 400)
    }

    if (!activeRef.current) {
      activeRef.current = true
      rafRef.current = requestAnimationFrame(loop)
    }
  }, [loop])

  // Register global trigger
  useEffect(() => {
    _trigger = fire
    return () => { _trigger = null }
  }, [fire])

  // Resize canvas to window
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        zIndex:        99998,   // just below modal backdrop (99999)
      }}
    />
  )
}
