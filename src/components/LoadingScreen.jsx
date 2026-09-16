/**
 * LoadingScreen.jsx
 * Loading screen for BL Production Tycoon.
 * Background: one of 5 pixel-art BGs, chosen randomly once per session.
 * Progress bar: pink with a pixelated heart cursor.
 * Timer uses Date.now() + setInterval — reliable across all environments
 * including Capacitor Android WebView where requestAnimationFrame timing
 * can be unreliable during app startup.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import './LoadingScreen.css'

const BASE = import.meta.env.BASE_URL

// Backgrounds live in public/images/loading/ — static files bundled in APK
const BACKGROUNDS = [
  `${BASE}images/loading/bg-1.jpg`,
  `${BASE}images/loading/bg-2.jpg`,
  `${BASE}images/loading/bg-3.jpg`,
  `${BASE}images/loading/bg-4.jpg`,
  `${BASE}images/loading/bg-5.jpg`,
]

// Pick once per session — stable across re-renders
const SESSION_BG = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]

const MESSAGES = [
  '🎬 Building your dream studio...',
  '🎭 Auditioning talented actors...',
  '✍️ Writing unforgettable romances...',
  '💖 Finding the perfect on-screen chemistry...',
  '🎥 Preparing today\'s filming...',
  '🎞️ Editing emotional scenes...',
  '🎵 Recording beautiful OSTs...',
  '🌸 Designing stunning filming locations...',
  '⭐ Discovering future superstars...',
  '📺 Negotiating with streaming platforms...',
  '💰 Managing production budgets...',
  '🏆 Preparing award-winning productions...',
  '❤️ Creating unforgettable BL couples...',
  '🌎 Expanding your production company...',
  '✨ Almost ready, Producer...',
]

// Loading duration in ms — intentionally long for atmosphere
const LOAD_DURATION = 30000

// ── Ambient canvas: petals + sparkles ─────────────────────────────────────────
function useAmbientCanvas(canvasRef, reducedMotion) {
  useEffect(() => {
    if (reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let running = true

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const makePetal = () => ({
      x:        Math.random() * (canvas.width || window.innerWidth),
      y:        -20 - Math.random() * 200,
      size:     Math.floor(Math.random() * 5 + 4),
      vy:       Math.random() * 0.8 + 0.4,
      vx:       Math.random() * 0.4 - 0.2,
      rot:      Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      opacity:  Math.random() * 0.5 + 0.3,
      hue:      Math.random() * 20 + 330,
    })

    const makeSparkle = () => ({
      x:     Math.random() * (canvas.width || window.innerWidth),
      y:     Math.random() * (canvas.height || window.innerHeight) * 0.8,
      size:  Math.random() * 3 + 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.025 + 0.01,
    })

    const petals   = Array.from({ length: 22 }, makePetal)
    const sparkles = Array.from({ length: 18 }, makeSparkle)

    function drawPetal(p) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = `hsl(${p.hue}, 75%, 82%)`
      const s = p.size
      ctx.fillRect(-s * 0.5, -s * 0.25, s, s * 0.5)
      ctx.fillRect(-s * 0.25, -s * 0.5, s * 0.5, s)
      ctx.restore()
    }

    function drawSparkle(s, opacity) {
      if (opacity <= 0) return
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.globalAlpha = opacity * 0.85
      ctx.fillStyle = '#FFD700'
      const r = s.size
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const a  = (i / 4) * Math.PI * 2
        const ai = a + Math.PI / 4
        ctx.lineTo(Math.cos(a) * r,        Math.sin(a) * r)
        ctx.lineTo(Math.cos(ai) * r * 0.3, Math.sin(ai) * r * 0.3)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    let last = performance.now()
    function tick(now) {
      if (!running) return
      const dt = now - last
      last = now
      if (dt > 200) { raf = requestAnimationFrame(tick); return }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      petals.forEach(p => {
        p.y   += p.vy
        p.x   += p.vx + Math.sin(p.y * 0.018) * 0.25
        p.rot += p.rotSpeed
        if (p.y > canvas.height + 20) Object.assign(p, makePetal(), { y: -20 })
        drawPetal(p)
      })

      sparkles.forEach(s => {
        s.phase += s.speed
        drawSparkle(s, Math.max(0, Math.sin(s.phase) * 0.9))
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onVisibility = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf) }
      else                 { running = true;  raf = requestAnimationFrame(tick) }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [canvasRef, reducedMotion])
}

// ── Pixelated heart SVG (inline, pink) ────────────────────────────────────────
function PixelHeart({ size = 18 }) {
  const pixels = [
    [0,1,1,0,1,1,0],
    [1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1],
    [0,1,1,1,1,1,0],
    [0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0],
  ]
  return (
    <svg
      width={size}
      height={size * (6 / 7)}
      viewBox="0 0 7 6"
      style={{ imageRendering: 'pixelated', display: 'block', filter: 'drop-shadow(0 0 4px #FF6B9D)' }}
      aria-hidden="true"
    >
      {pixels.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#FF6B9D" /> : null
        )
      )}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LoadingScreen({ onComplete }) {
  const [progress,   setProgress]   = useState(0)
  const [msgIndex,   setMsgIndex]   = useState(0)
  const [msgVisible, setMsgVisible] = useState(true)
  const [phase,      setPhase]      = useState('loading')
  const canvasRef    = useRef(null)
  // Keep a ref to onComplete so the timer effect never re-runs when App re-renders
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useAmbientCanvas(canvasRef, reducedMotion)

  // ── Skip instantly for reduced-motion users ──
  useEffect(() => {
    if (!reducedMotion) return
    const t = setTimeout(() => onCompleteRef.current?.(), 300)
    return () => clearTimeout(t)
  }, [reducedMotion])

  // ── Progress timer — Date.now() + setInterval, reliable in Capacitor ─────────
  useEffect(() => {
    if (reducedMotion) return

    const startMs  = Date.now()
    // Tick every 250ms — smooth enough, low overhead
    const TICK_MS  = 250

    const id = setInterval(() => {
      const elapsed = Date.now() - startMs
      const t = Math.min(elapsed / LOAD_DURATION, 1)

      // Ease: crawls through first 70%, then finishes
      const eased = t < 0.7
        ? 0.5 * Math.pow(t / 0.7, 1.8)
        : 0.5 + 0.5 * Math.pow((t - 0.7) / 0.3, 0.65)

      const p = Math.min(Math.floor(eased * 100), 100)
      setProgress(p)

      if (t >= 1) {
        clearInterval(id)
        setProgress(100)
        setPhase('complete')
        setTimeout(() => {
          setPhase('exit')
          setTimeout(() => onCompleteRef.current?.(), 650)
        }, 800)
      }
    }, TICK_MS)

    return () => clearInterval(id)
  }, [reducedMotion]) // stable — no onComplete dependency

  // ── Rotating messages ──
  useEffect(() => {
    if (reducedMotion) return
    const id = setInterval(() => {
      setMsgVisible(false)
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % MESSAGES.length)
        setMsgVisible(true)
      }, 380)
    }, 3600)
    return () => clearInterval(id)
  }, [reducedMotion])

  return (
    <div
      className={`ls-root${phase === 'exit' ? ' ls-exit' : ''}`}
      aria-label="Loading BL Production Tycoon"
      aria-live="polite"
    >
      {/* Background image — random, chosen once per session */}
      <img
        className="ls-bg-img"
        src={SESSION_BG}
        alt=""
        aria-hidden="true"
        draggable="false"
      />

      {/* Dark overlay so HUD stays readable over any background */}
      <div className="ls-bg-overlay" aria-hidden="true" />

      {/* Ambient particles canvas */}
      <canvas ref={canvasRef} className="ls-canvas" aria-hidden="true" />

      {/* Bottom HUD: message + progress bar */}
      <div className="ls-hud">
        <div className={`ls-msg${msgVisible ? ' ls-msg-in' : ' ls-msg-out'}`}>
          {MESSAGES[msgIndex]}
        </div>

        <div className="ls-bar-wrap">
          {/* Heart cursor above the bar, positioned at fill edge */}
          <div className="ls-heart-row" aria-hidden="true">
            <div
              className="ls-heart-cursor"
              style={{ left: `calc(${progress}% - 9px)` }}
            >
              <PixelHeart size={18} />
            </div>
          </div>

          <div
            className="ls-bar-track"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div className="ls-bar-fill" style={{ width: `${progress}%` }}>
              <div className="ls-bar-glint" />
            </div>
          </div>
          <div className="ls-bar-label">
            {progress < 100 ? `Loading Assets...  ${progress}%` : '✨  Ready, Producer!'}
          </div>
        </div>
      </div>
    </div>
  )
}
