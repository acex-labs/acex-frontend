import { apiFetch } from './client.js'

const BASE = '/api/v1/operations/workflows'

const query = params =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))

const send = (method, path, body) =>
  apiFetch(`${BASE}${path}`, { method, ...(body !== undefined && { body: JSON.stringify(body) }) })

// Saved workflows, by name; each with its check: what keeps it from running.
export const fetchWorkflows = () => apiFetch(BASE)
export const fetchWorkflow = id => apiFetch(`${BASE}/${id}`)
export const createWorkflow = workflow => send('POST', '', workflow)
export const updateWorkflow = (id, patch) => send('PATCH', `/${id}`, patch)
export const deleteWorkflow = id => send('DELETE', `/${id}`)

// A graph's problems, warnings and what each step can read, without saving it.
export const checkGraph = graph => send('POST', '/check', graph)

// Starts a run of the workflow as saved; mode is "run", "evaluate" or "dry_run". Answers the run.
export const startRun = (workflowId, mode) => send('POST', `/${workflowId}/runs`, { mode })

// Runs, newest first: of one workflow, or of all.
export const fetchRuns = (params = {}) => apiFetch(`${BASE}/runs?${query(params)}`)

// A run with what it runs and every round of every step so far.
export const fetchRun = id => apiFetch(`${BASE}/runs/${id}`)

// What each node answered in one round of a step on nodes.
export const fetchStepResponses = (runId, jobId) => apiFetch(`${BASE}/runs/${runId}/steps/${jobId}`)

// A paused run goes on: one more step, or with toEnd to the end.
export const continueRun = (id, toEnd = false) => send('POST', `/runs/${id}/continue?to_end=${toEnd}`)
export const stopRun = id => send('POST', `/runs/${id}/stop`)
export const deleteRun = id => send('DELETE', `/runs/${id}`)
