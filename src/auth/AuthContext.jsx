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
  const logout = um ? () => um.signoutRedirect() : () => {}
  // `um` is only ever set (in main.jsx's bootstrap) when the backend's own
  // GET /api/v1/auth/config reports `enabled: true` — so `!um` isn't a
  // client-side guess, it's mirroring a server-asserted flag. When the
  // backend says auth is off (local/dev backends with no OIDC configured),
  // we must not gate the UI behind a login that can never succeed.
  const isAuthenticated = !um || (!!user && !user.expired)

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
