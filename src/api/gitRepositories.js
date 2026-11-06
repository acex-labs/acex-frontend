import { apiFetch } from './client'

// Git repositories the backend reads ConfigMaps from. Admin only (naas-admin role).

const BASE = '/api/v1/git_repositories'

export const fetchGitRepositories = () => apiFetch(BASE)

export const createGitRepository = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) })

export const updateGitRepository = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteGitRepository = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' })

/** Fetch and load the branch's latest commit now. */
export const syncGitRepository = (id) =>
  apiFetch(`${BASE}/${id}/sync`, { method: 'POST' })
