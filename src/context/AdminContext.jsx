import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'

const AdminContext = createContext(null)
const STORAGE_KEY = 'naas-admin-mode'

function getRoles(user) {
  if (!user) return []
  return user.profile?.realm_access?.roles ?? []
}

function readStorage() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
}

function writeStorage(val) {
  try { localStorage.setItem(STORAGE_KEY, String(val)) } catch {}
}

export function AdminProvider({ children }) {
  const { user } = useAuth()
  const isAdmin = getRoles(user).includes('naas-admin')

  const [isAdminMode, setAdminMode] = useState(readStorage)

  const toggleAdminMode = useCallback(() => {
    if (!isAdmin) return
    setAdminMode(prev => {
      const next = !prev
      writeStorage(next)
      return next
    })
  }, [isAdmin])

  const value = useMemo(
    () => ({ isAdmin, isAdminMode: isAdmin && isAdminMode, toggleAdminMode }),
    [isAdmin, isAdminMode, toggleAdminMode],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  return useContext(AdminContext)
}
