import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const UpdateContext = createContext(null)
const browserVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'

const initialState = {
  isDesktop: false,
  platform: 'web',
  installedVersion: browserVersion,
  repository: '',
  status: 'idle',
  latestVersion: null,
  releaseNotes: '',
  size: 0,
  progress: 0,
  received: 0,
  total: 0,
  error: '',
  dismissed: false,
}

function getApi() {
  return typeof window !== 'undefined' ? window.desktopUpdater : null
}

export function UpdateProvider({ children }) {
  const [state, setState] = useState(initialState)
  const api = getApi()

  const checkForUpdates = useCallback(async () => {
    if (!api) {
      setState(previous => ({ ...previous, status: 'current', error: '' }))
      return { status: 'current', installedVersion: browserVersion }
    }
    setState(previous => ({ ...previous, status: 'checking', error: '' }))
    const result = await api.checkForUpdates()
    setState(previous => ({
      ...previous,
      ...result,
      dismissed: result.status === 'available' ? false : previous.dismissed,
    }))
    return result
  }, [api])

  useEffect(() => {
    let active = true
    if (!api) return undefined
    api.getInfo().then(info => {
      if (!active) return
      setState(previous => ({ ...previous, ...info }))
    })
    const removeProgressListener = api.onProgress(progress => {
      if (!active) return
      setState(previous => ({
        ...previous,
        status: 'downloading',
        received: progress.received || 0,
        total: progress.total || 0,
        progress: Number.isFinite(progress.percent) ? progress.percent : 0,
      }))
    })
    checkForUpdates()
    return () => {
      active = false
      removeProgressListener?.()
    }
  }, [api, checkForUpdates])

  const downloadUpdate = useCallback(async () => {
    if (!api) return { status: 'current' }
    setState(previous => ({ ...previous, status: 'downloading', error: '', progress: 0 }))
    try {
      const result = await api.downloadUpdate()
      setState(previous => ({ ...previous, ...result, status: 'ready', progress: 100, error: '' }))
      return result
    } catch (error) {
      const message = error?.message || 'The update could not be downloaded.'
      setState(previous => ({ ...previous, status: 'error', error: message }))
      return { status: 'error', error: message }
    }
  }, [api])

  const installUpdate = useCallback(async () => {
    if (!api) return { status: 'current' }
    const result = await api.installUpdate()
    if (result?.status === 'error' || result?.status === 'unsupported') {
      setState(previous => ({ ...previous, status: 'error', error: result.error }))
    } else {
      setState(previous => ({ ...previous, status: 'installing' }))
    }
    return result
  }, [api])

  const dismissUpdate = useCallback(() => {
    setState(previous => ({ ...previous, dismissed: true }))
  }, [])

  const value = useMemo(() => ({
    ...state,
    hasUpdate: state.status === 'available' || state.status === 'downloading' || state.status === 'ready',
    panelVisible: !state.dismissed && (state.status === 'available' || state.status === 'downloading' || state.status === 'ready'),
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
  }), [state, checkForUpdates, downloadUpdate, installUpdate, dismissUpdate])

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
}

export function useUpdates() {
  const context = useContext(UpdateContext)
  if (!context) throw new Error('useUpdates must be used within UpdateProvider')
  return context
}