import { API_URL } from '../config.js'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = new Error(`API error ${res.status}`)
    err.status = res.status
    // Validation errors carry the reason in the body; keep it for the caller.
    err.detail = await res.json().then(b => b?.detail).catch(() => undefined)
    throw err
  }
  return res.json()
}
