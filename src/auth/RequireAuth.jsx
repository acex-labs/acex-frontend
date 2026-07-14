import { useAuth } from './AuthContext'

export default function RequireAuth({ children }) {
  const { isAuthenticated, loading, login } = useAuth()

  if (loading) return null

  if (!isAuthenticated) {
    login()
    return null
  }

  return children
}
