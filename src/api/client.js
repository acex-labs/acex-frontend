import { API_URL } from '../config.js'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = new Error(`API error ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}
