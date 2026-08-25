import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'acex-theme'
const ThemeContext = createContext(null)

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(resolved) {
  document.documentElement.classList.toggle('light', resolved === 'light')
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function ThemeProvider({ children }) {
  // mode: 'dark' | 'light' | 'system'
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system')
  const [resolved, setResolved] = useState(() =>
    mode === 'system' ? getSystemTheme() : mode
  )

  useEffect(() => {
    const next = mode === 'system' ? getSystemTheme() : mode
    setResolved(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, mode)

    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      const r = getSystemTheme()
      setResolved(r)
      applyTheme(r)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const toggle = () => setMode(resolved === 'dark' ? 'light' : 'dark')
  const cycleMode = () =>
    setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system')

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved, toggle, cycleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
