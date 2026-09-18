import React from 'react'
import { useUpdates } from '../desktop/UpdateContext.jsx'
import './UpdatePanel.css'

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function UpdatePanel() {
  const update = useUpdates()
  if (!update.panelVisible) return null

  const downloading = update.status === 'downloading'
  const ready = update.status === 'ready'

  return (
    <aside className="update-panel" role="status" aria-live="polite">
      <div className="update-panel-title">⬆ GAME UPDATE</div>
      <div className="update-panel-message">
        {downloading
          ? 'The game is updating...'
          : ready
            ? 'A new update is ready.'
            : `Version ${update.latestVersion} is available.`}
      </div>

      {downloading && (
        <div className="update-progress-wrap">
          <div className="update-progress-track">
            <div className="update-progress-fill" style={{ width: `${update.progress}%` }} />
          </div>
          <div className="update-progress-label">
            {update.progress}%{update.total ? ` · ${formatBytes(update.received)} / ${formatBytes(update.total)}` : ''}
          </div>
        </div>
      )}

      {!downloading && !ready && (
        <button className="update-button update-button-primary" type="button" onClick={update.downloadUpdate}>
          DOWNLOAD UPDATE
        </button>
      )}
      {ready && (
        <button className="update-button update-button-primary" type="button" onClick={update.installUpdate}>
          UPDATE NOW
        </button>
      )}
      {!downloading && (
        <button className="update-button update-button-secondary" type="button" onClick={update.dismissUpdate}>
          LATER
        </button>
      )}
    </aside>
  )
}