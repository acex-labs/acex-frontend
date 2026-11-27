import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getUserManager, loginReturnPath } from './oidc'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // The token ran out while this page was open and no renewal replaced it.
  const [sessionExpired, setSessionExpired] = useState(false)
  // The session was valid when this page loaded or last renewed it. A user who
  // is already expired at load is sent to login by RequireAuth instead.
  const live = useRef(false)

  useEffect(() => {
    const um = getUserManager()
    if (!um) {
      setLoading(false)
      return
    }

    um.getUser().then(u => {
      live.current = !!u && !u.expired
      setUser(u)
      setLoading(false)
    })

    const onLoaded = u => {
      live.current = true
      setUser(u)
      setSessionExpired(false)
    }
    const onUnloaded = () => {
      live.current = false
      setUser(null)
      setSessionExpired(false)
    }
    // Raised shortly after the token's expiry, and only if silent renewal did
    // not replace it (a renewal fires userLoaded and re-arms the timers).
    const onExpired = () => {
      if (live.current) setSessionExpired(true)
    }

    um.events.addUserLoaded(onLoaded)
    um.events.addUserUnloaded(onUnloaded)
    um.events.addAccessTokenExpired(onExpired)

    return () => {
      um.events.removeUserLoaded(onLoaded)
      um.events.removeUserUnloaded(onUnloaded)
      um.events.removeAccessTokenExpired(onExpired)
    }
  }, [])

  const um = getUserManager()
  // Remember the current page so the callback can send the user back to it.
  const login = um
    ? () => um.signinRedirect({ url_state: loginReturnPath() })
    : () => {}
  const logout = um ? () => um.signoutRedirect() : () => {}
  // `um` is only ever set (in main.jsx's bootstrap) when the backend's own
  // GET /api/v1/auth/config reports `enabled: true` — so `!um` isn't a
  // client-side guess, it's mirroring a server-asserted flag. When the
  // backend says auth is off (local/dev backends with no OIDC configured),
  // we must not gate the UI behind a login that can never succeed.
  // An expired token keeps the app mounted while SessionExpiredDialog asks the
  // user to sign in; without sessionExpired here RequireAuth would redirect at once.
  const isAuthenticated = !um || (!!user && (!user.expired || sessionExpired))

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, sessionExpired, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
