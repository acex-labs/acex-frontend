import { createContext, useContext, useState, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'

const AdminContext = createContext(null)

function getRoles(user) {
  if (!user) return []
  // Keycloak puts realm roles under realm_access.roles in the access token
  return user.profile?.realm_access?.roles ?? []
}

export function AdminProvider({ children }) {
  const { user } = useAuth()
  const roles = getRoles(user)
  const isAdmin = roles.includes('naas-admin')

  const [isAdminMode, setAdminMode] = useState(false)

  const toggleAdminMode = () => {
    if (!isAdmin) return
    setAdminMode(v => !v)
  }

  const value = useMemo(
    () => ({ isAdmin, isAdminMode: isAdmin && isAdminMode, toggleAdminMode }),
    [isAdmin, isAdminMode],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  return useContext(AdminContext)
}
