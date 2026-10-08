import { apiFetch } from './client.js'

const query = params =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))

// Top-level jobs, newest first; pass parent_id for the jobs of a batch.
export const fetchJobs = (params = {}) => apiFetch(`/api/v1/workers/jobs?${query(params)}`)

export const fetchJob = id => apiFetch(`/api/v1/workers/jobs/${id}`)
