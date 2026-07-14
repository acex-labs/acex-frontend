import { createContext, useContext, useEffect, useState } from 'react'
import { getUserManager } from './oidc'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const um = getUserManager()
    if (!um) {
      setLoading(false)
      return
    }

    um.getUser().then(u => {
      setUser(u)
      setLoading(false)
    })

    const onLoaded = u => setUser(u)
    const onUnloaded = () => setUser(null)

    um.events.addUserLoaded(onLoaded)
    um.events.addUserUnloaded(onUnloaded)

    return () => {
      um.events.removeUserLoaded(onLoaded)
      um.events.removeUserUnloaded(onUnloaded)
    }
  }, [])

  const um = getUserManager()
  const login = um ? () => um.signinRedirect() : () => {}
  const logout = um
    ? () => um.removeUser().then(() => um.signoutRedirect())
    : () => {}
  const isAuthenticated = !um || (!!user && !user.expired)

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
