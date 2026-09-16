/**
 * Settings.jsx — Game settings + JSON export/import
 * Prompt 7: export/import JSON, audio toggle, scanline toggle, anim speed, reset
 */
import React, { useRef, useState } from 'react'
import { useGame, A, pushToast, INITIAL_STATE } from '../game/state.jsx'
import { SFX } from '../game/audio.js'


export default function Settings() {
  const { state, dispatch }  = useGame()
  const { settings }         = state
  const fileInputRef         = useRef(null)
  const [confirmReset, setConfirmReset] = useState(false)

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function set(key, value) {
    dispatch({ type: A.SET_SETTINGS, patch: { [key]: value } })
  }

  // ─── Export JSON ─────────────────────────────────────────────────────────────
  function handleExport() {
    SFX.confirm()
    try {
      const json = JSON.stringify(state, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `bl_tycoon_save_wk${state.week}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      pushToast(dispatch, '📁 Save exported!', 'green')
    } catch (e) {
      pushToast(dispatch, 'Export failed.', 'red')
    }
  }

  // ─── Import JSON ─────────────────────────────────────────────────────────────
  function handleImportClick() {
    SFX.click()
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const save = JSON.parse(ev.target.result)
        if (!save || typeof save !== 'object' || !save.week) {
          pushToast(dispatch, 'Invalid save file.', 'red')
          return
        }
        dispatch({ type: A.LOAD_SAVE, saveData: save })
        pushToast(dispatch, `📂 Save imported! (Week ${save.week})`, 'green')
      } catch {
        pushToast(dispatch, 'Import failed — file corrupted.', 'red')
      }
    }
    reader.readAsText(file)
    // reset so re-selecting same file fires onChange again
    e.target.value = ''
  }

  // ─── Reset ───────────────────────────────────────────────────────────────────
  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return }
    SFX.fail()
    localStorage.removeItem('bl_tycoon_save')
    dispatch({ type: A.LOAD_SAVE, saveData: { ...INITIAL_STATE, started: false } })
    setConfirmReset(false)
    pushToast(dispatch, 'Game reset.', '')
  }

  // ─── Rename (in-panel text input, no window.prompt) ──────────────────────────
  const [renaming, setRenaming]   = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const renameRef                 = useRef(null)

  function openRename() {
    SFX.click()
    setRenameVal(state.companyName)
    setRenaming(true)
    setTimeout(() => renameRef.current?.select(), 30)
  }

  function commitRename() {
    const trimmed = renameVal.trim()
    if (trimmed && trimmed !== state.companyName) {
      dispatch({ type: A.SET_COMPANY_NAME, name: trimmed })
      pushToast(dispatch, `Studio renamed to "${trimmed}"`)
    }
    setRenaming(false)
  }

  function handleRenameKey(e) {
    if (e.key === 'Enter')  commitRename()
    if (e.key === 'Escape') setRenaming(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Audio ── */}
      <div className="panel">
        <div className="panel-title">🔊 AUDIO</div>

        <SettingRow label="SOUND EFFECTS">
          <div className="seg">
            <button
              type="button"
              className={settings.sfxOn !== false ? 'sel' : ''}
              onClick={() => { SFX.click(); set('sfxOn', true) }}
            >
              ON
            </button>
            <button
              type="button"
              className={settings.sfxOn === false ? 'sel' : ''}
              onClick={() => set('sfxOn', false)}
            >
              OFF
            </button>
          </div>
        </SettingRow>
      </div>

      {/* ── Display ── */}
      <div className="panel">
        <div className="panel-title">🖥️ DISPLAY</div>

        <SettingRow label="SCANLINE EFFECT">
          <div className="seg">
            <button
              type="button"
              className={settings.scanlines !== false ? 'sel' : ''}
              onClick={() => { SFX.click(); set('scanlines', true) }}
            >
              ON
            </button>
            <button
              type="button"
              className={settings.scanlines === false ? 'sel' : ''}
              onClick={() => { SFX.click(); set('scanlines', false) }}
            >
              OFF
            </button>
          </div>
        </SettingRow>

        <SettingRow label="ANIMATION SPEED">
          <div className="seg">
            {[
              { id: 'slow',   label: 'SLOW'   },
              { id: 'normal', label: 'NORMAL' },
              { id: 'fast',   label: 'FAST'   },
            ].map(s => (
              <button
                key={s.id}
                type="button"
                className={settings.animSpeed === s.id ? 'sel' : ''}
                onClick={() => { SFX.click(); set('animSpeed', s.id) }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </div>

      {/* ── Studio ── */}
      <div className="panel">
        <div className="panel-title">🏢 STUDIO</div>
        {renaming ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              ref={renameRef}
              value={renameVal}
              maxLength={28}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={handleRenameKey}
              placeholder="Studio name…"
              style={{ width: '100%', fontSize: 9 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-gold"
                onClick={commitRename}
                style={{ flex: 1, fontSize: 8, padding: '10px', textAlign: 'center' }}
              >
                ✓ SAVE
              </button>
              <button
                onClick={() => { SFX.click(); setRenaming(false) }}
                style={{ flex: 1, fontSize: 8, padding: '10px', textAlign: 'center' }}
              >
                ✕ CANCEL
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 8, color: 'var(--lav)', marginBottom: 10 }}>
              Current: <span style={{ color: 'var(--pink)' }}>{state.companyName}</span>
            </div>
            <button
              onClick={openRename}
              style={{ fontSize: 8, padding: '10px 14px', width: '100%', textAlign: 'center' }}
            >
              ✏️ RENAME STUDIO
            </button>
          </>
        )}
      </div>

      {/* ── Save data ── */}
      <div className="panel">
        <div className="panel-title">💾 SAVE DATA</div>
        <div style={{ fontSize: 7, color: 'var(--lav)', marginBottom: 10, lineHeight: 2 }}>
          Auto-saved every week · Week {state.week} · {state.history.length} productions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn-gold"
            onClick={handleExport}
            style={btnStyle}
          >
            📤 EXPORT SAVE (JSON)
          </button>

          <button
            onClick={handleImportClick}
            style={btnStyle}
          >
            📥 IMPORT SAVE (JSON)
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div className="panel" style={{ borderColor: 'var(--red)' }}>
        <div className="panel-title" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          ⚠️ DANGER ZONE
        </div>

        {confirmReset ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 8, color: 'var(--red)', lineHeight: 2, textAlign: 'center' }}>
              This will erase ALL progress.<br />Are you sure?
            </div>
            <button
              className="btn-danger"
              onClick={handleReset}
              style={btnStyle}
            >
              ✓ YES, RESET EVERYTHING
            </button>
            <button
              onClick={() => { SFX.click(); setConfirmReset(false) }}
              style={btnStyle}
            >
              ✕ CANCEL
            </button>
          </div>
        ) : (
          <button
            className="btn-danger"
            onClick={handleReset}
            style={btnStyle}
          >
            🗑️ RESET GAME
          </button>
        )}
      </div>

      {/* ── Game info ── */}
      <div className="panel">
        <div className="panel-title">ℹ️ GAME INFO</div>
        <div style={{ fontSize: 7, color: 'var(--lav)', lineHeight: 2.5 }}>
          <div>BL PRODUCTION TYCOON · v1.0</div>
          <div>Week: {state.week} · Awards: {state.awards ?? 0}</div>
          <div>Rank: #{state.numericRank ?? 50} of 50</div>
          <div>Company: {state.companyName}</div>
        </div>
      </div>

    </div>
  )
}

function SettingRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 7, color: 'var(--lav)' }}>{label}</span>
      {children}
    </div>
  )
}

const btnStyle = { textAlign: 'center', fontSize: 8, padding: '12px 14px', width: '100%' }
