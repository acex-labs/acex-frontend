import { serviceUrl } from '../services.js'

// The SamruAI backend. Its URL comes from ACEX (GET /api/v1/services), and the
// fetch interceptor adds the user's token, as for ACEX itself.
async function samruaiFetch(path, options = {}) {
  const base = serviceUrl('samruai')
  if (!base) throw new Error('SamruAI is not configured for this environment')
  const res = await fetch(`${base}/api/v1${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = new Error(`SamruAI API error ${res.status}`)
    err.status = res.status
    err.detail = await res.json().then(b => b?.detail).catch(() => undefined)
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

export const fetchSamruaiAbout = () => samruaiFetch('/health/about')

// Who SamruAI takes the caller to be, from the token it was sent.
export const fetchSamruaiMe = () => samruaiFetch('/me')
