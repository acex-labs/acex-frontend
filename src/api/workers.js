import { apiFetch } from './client.js'

const query = params =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))

// Top-level jobs, newest first; pass parent_id for the jobs of a batch.
export const fetchJobs = (params = {}) => apiFetch(`/api/v1/workers/jobs?${query(params)}`)

export const fetchJob = id => apiFetch(`/api/v1/workers/jobs/${id}`)

// Same id, another message on the queue: failed, cancelled and queued jobs only.
export const requeueJob = id => apiFetch(`/api/v1/workers/jobs/${id}/requeue`, { method: 'POST' })

// Stops a queued or running job, or a batch's unfinished jobs; the job is kept.
export const cancelJob = id => apiFetch(`/api/v1/workers/jobs/${id}/cancel`, { method: 'POST' })

// Every job, or every job in `state`; answers { deleted }.
export const purgeJobs = state => apiFetch(`/api/v1/workers/jobs?${query({ state })}`, { method: 'DELETE' })

// Any state, to clean up; a batch goes with its jobs.
export const deleteJob = id => apiFetch(`/api/v1/workers/jobs/${id}`, { method: 'DELETE' })
