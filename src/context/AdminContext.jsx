import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchCustomer, updateCustomerSettings } from '../api/naas'

const AdminContext = createContext(null)

function getRoles(user) {
  if (!user) return []
  return user.profile?.realm_access?.roles ?? []
}

function getTenant() {
  const parts = window.location.hostname.split('.')
  // e.g. berget.naas.acebit.cloud → "berget"; localhost → null
  return parts.length > 1 ? parts[0] : null
}

export function AdminProvider({ children }) {
  const { user } = useAuth()
  const roles = getRoles(user)
  const isAdmin = roles.includes('naas-admin')

  const [isAdminMode, setAdminMode] = useState(false)

  const tenant = getTenant()

  // Load persisted setting from the Customer CRD on mount (once user is available)
  useEffect(() => {
    if (!isAdmin || !tenant) return
    fetchCustomer(tenant)
      .then(cust => {
        if (cust?.settings?.naasAdminEnabled) setAdminMode(true)
      })
      .catch(() => {}) // non-critical — fall back to local state
  }, [isAdmin, tenant])

  const toggleAdminMode = useCallback(() => {
    if (!isAdmin) return
    setAdminMode(prev => {
      const next = !prev
      if (tenant) {
        updateCustomerSettings(tenant, { naasAdminEnabled: next }).catch(() => {})
      }
      return next
    })
  }, [isAdmin, tenant])

  const value = useMemo(
    () => ({ isAdmin, isAdminMode: isAdmin && isAdminMode, toggleAdminMode }),
    [isAdmin, isAdminMode, toggleAdminMode],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  return useContext(AdminContext)
}
