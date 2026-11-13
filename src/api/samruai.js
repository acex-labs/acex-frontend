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

// Triages, newest first, each with its number of steps. `q` finds text in a triage or any of its steps;
// `status` is ongoing or closed, `priority` 1 to 4.
export function fetchTriages({ q, status, priority } = {}) {
  const params = new URLSearchParams(Object.entries({ q, status, priority }).filter(([, v]) => v))
  return samruaiFetch(`/triages${params.size ? `?${params}` : ''}`)
}
export const fetchTriage = (id) => samruaiFetch(`/triages/${id}`)
export const createTriage = (body = {}) => samruaiFetch('/triages', { method: 'POST', body: JSON.stringify(body) })
export const updateTriage = (id, body) => samruaiFetch(`/triages/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteTriage = (id) => samruaiFetch(`/triages/${id}`, { method: 'DELETE' })

// The steps of a triage's hypotree, as a flat list; parent_id null hangs a step under the triage itself.
export const fetchSteps = (triageId) => samruaiFetch(`/triages/${triageId}/steps`)
export const createStep = (triageId, body) => samruaiFetch(`/triages/${triageId}/steps`, { method: 'POST', body: JSON.stringify(body) })
export const updateStep = (triageId, id, body) => samruaiFetch(`/triages/${triageId}/steps/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteStep = (triageId, id) => samruaiFetch(`/triages/${triageId}/steps/${id}`, { method: 'DELETE' })

// The impact and urgency levels, and matrix[impact - 1][urgency - 1]: the priority, 1 to 4, each pair gives.
export const fetchPriorityMatrix = () => samruaiFetch('/triages/priority-matrix')

// A triage's observations, newest first, each with `links`: the hypotheses (steps) it supports or contradicts.
export const fetchObservations = (triageId) => samruaiFetch(`/triages/${triageId}/observations`)
export const createObservation = (triageId, body = {}) => samruaiFetch(`/triages/${triageId}/observations`, { method: 'POST', body: JSON.stringify(body) })
export const updateObservation = (triageId, id, body) => samruaiFetch(`/triages/${triageId}/observations/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteObservation = (triageId, id) => samruaiFetch(`/triages/${triageId}/observations/${id}`, { method: 'DELETE' })
// effect: supports or contradicts. Both answer with the observation as it is now.
export const linkObservation = (triageId, id, stepId, effect) => samruaiFetch(`/triages/${triageId}/observations/${id}/links/${stepId}`, { method: 'PUT', body: JSON.stringify({ effect }) })
export const unlinkObservation = (triageId, id, stepId) => samruaiFetch(`/triages/${triageId}/observations/${id}/links/${stepId}`, { method: 'DELETE' })
