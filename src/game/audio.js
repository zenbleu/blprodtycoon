/**
 * audio.js — Full Web Audio SFX synthesizer
 * Prompt 8: rich multi-oscillator sounds, ADSR envelopes, sfxOn guard
 */

let ctx = null
let masterGain = null
let _sfxEnabled = true

// ─── Init / resume ────────────────────────────────────────────────────────────

export function initAudio() {
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.55
    masterGain.connect(ctx.destination)
  } catch (e) {
    console.warn('Web Audio not available:', e)
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume()
}

export function setSfxEnabled(on) {
  _sfxEnabled = !!on
  if (masterGain) {
    masterGain.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.05)
  }
}

// ─── Low-level building blocks ────────────────────────────────────────────────

/** Play a single oscillator tone with linear-ramp gain envelope */
function tone(freq, type = 'square', startAt = 0, dur = 0.1, vol = 0.28, ramp = 0.01) {
  if (!ctx || !masterGain || !_sfxEnabled) return
  try {
    const now = ctx.currentTime + startAt
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(vol, now + ramp)
    g.gain.setValueAtTime(vol, now + dur - 0.03)
    g.gain.linearRampToValueAtTime(0, now + dur)

    osc.connect(g)
    g.connect(masterGain)
    osc.start(now)
    osc.stop(now + dur + 0.01)
  } catch (e) { /* silent fail */ }
}

/** Chord: play multiple frequencies simultaneously */
function chord(freqs, type = 'sine', startAt = 0, dur = 0.18, vol = 0.2) {
  freqs.forEach(f => tone(f, type, startAt, dur, vol / freqs.length + 0.05))
}

/** Frequency sweep — osc glides from f1 to f2 */
function sweep(f1, f2, type = 'sawtooth', startAt = 0, dur = 0.22, vol = 0.25) {
  if (!ctx || !masterGain || !_sfxEnabled) return
  try {
    const now = ctx.currentTime + startAt
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(f1, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), now + dur)
    g.gain.setValueAtTime(vol, now)
    g.gain.linearRampToValueAtTime(0, now + dur)

    osc.connect(g)
    g.connect(masterGain)
    osc.start(now)
    osc.stop(now + dur + 0.01)
  } catch (e) { /* silent fail */ }
}

/** Filtered noise burst — percussive hit feel */
function noiseBurst(startAt = 0, dur = 0.06, vol = 0.15, cutoff = 800) {
  if (!ctx || !masterGain || !_sfxEnabled) return
  try {
    const now    = ctx.currentTime + startAt
    const buf    = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
    const data   = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1)

    const src  = ctx.createBufferSource()
    src.buffer = buf

    const filter = ctx.createBiquadFilter()
    filter.type  = 'bandpass'
    filter.frequency.value = cutoff
    filter.Q.value = 0.8

    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, now)
    g.gain.linearRampToValueAtTime(0, now + dur)

    src.connect(filter)
    filter.connect(g)
    g.connect(masterGain)
    src.start(now)
    src.stop(now + dur + 0.01)
  } catch (e) { /* silent fail */ }
}

// ─── Named SFX ────────────────────────────────────────────────────────────────

// Musical note frequencies (Hz)
const NOTE = {
  C3:  130.8, D3: 146.8, E3: 164.8, G3: 196.0, A3: 220.0,
  C4:  261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392.0, A4: 440.0, B4: 493.9,
  C5:  523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784.0, A5: 880.0, B5: 987.8,
  C6: 1046.5, E6: 1318.5, G6: 1568.0,
}

export const SFX = {
  // Short percussive blip — UI tap
  click() {
    tone(NOTE.G5, 'square', 0, 0.05, 0.18, 0.005)
    noiseBurst(0, 0.03, 0.08, 1200)
  },

  // Confirm / select — two rising sine notes
  confirm() {
    tone(NOTE.C5, 'sine', 0,    0.10, 0.22)
    tone(NOTE.E5, 'sine', 0.09, 0.14, 0.22)
  },

  // Success — bright ascending three-note arp
  success() {
    tone(NOTE.C5, 'sine',   0,    0.12, 0.25)
    tone(NOTE.E5, 'sine',   0.10, 0.12, 0.25)
    tone(NOTE.G5, 'sine',   0.20, 0.18, 0.28)
    tone(NOTE.C6, 'sine',   0.32, 0.22, 0.22)
    // subtle harmonic layer
    tone(NOTE.G5, 'triangle', 0.20, 0.40, 0.10)
  },

  // Fail — descending sawtooth growl
  fail() {
    sweep(NOTE.A4, NOTE.C3, 'sawtooth', 0, 0.30, 0.30)
    tone(NOTE.C3, 'square', 0.15, 0.18, 0.12)
  },

  // Level up — triumphant 5-note fanfare
  levelUp() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.B4, NOTE.C6]
    seq.forEach((f, i) => {
      tone(f, 'sine', i * 0.09, 0.16, 0.24)
      if (i === seq.length - 1) {
        // Final chord: C major
        chord([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 'sine', i * 0.09 + 0.08, 0.40, 0.55)
      }
    })
    // Sparkle noise
    noiseBurst(0.44, 0.12, 0.12, 2400)
  },

  // Next turn — punchy double-blip
  nextTurn() {
    tone(NOTE.G4, 'square', 0,    0.07, 0.28, 0.006)
    tone(NOTE.C5, 'square', 0.07, 0.10, 0.24, 0.006)
    noiseBurst(0, 0.04, 0.10, 600)
  },

  // Modal open — soft sine ping
  modal() {
    tone(NOTE.A5, 'sine', 0, 0.14, 0.18, 0.015)
    tone(NOTE.E5, 'sine', 0, 0.22, 0.08, 0.015)
  },

  // Award / big win — full fanfare (before confetti)
  award() {
    // C major scale up
    const up = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6]
    up.forEach((f, i) => tone(f, 'sine', i * 0.07, 0.16, 0.22))
    // Big chord crash
    chord([NOTE.C4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5], 'sine', up.length * 0.07, 0.55, 0.70)
    noiseBurst(up.length * 0.07, 0.15, 0.18, 1800)
    // Resolve
    chord([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 'sine', up.length * 0.07 + 0.40, 0.45, 0.40)
  },
}
