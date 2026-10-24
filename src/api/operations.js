import { apiFetch } from './client.js'
import { API_URL } from '../config.js'

const query = params =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))

// Raw commands, run in order on each node; answers the run.
export const executeCommands = (nodeIds, commands) =>
  apiFetch('/api/v1/operations/execute', {
    method: 'POST',
    body: JSON.stringify({ node_ids: nodeIds, commands }),
  })

// An abstract action (e.g. "ping") with its params on each node; answers the run.
export const runAction = (action, nodeIds, params) =>
  apiFetch(`/api/v1/operations/actions/${action}`, {
    method: 'POST',
    body: JSON.stringify({ node_ids: nodeIds, params }),
  })

// Runs, newest first; kind is "execute" or "actions".
export const fetchRuns = (params = {}) => apiFetch(`/api/v1/operations/runs?${query(params)}`)

// One run with every node's response, sorted by hostname.
export const fetchRun = id => apiFetch(`/api/v1/operations/runs/${id}`)

// Saves the run's report as a file in the browser.
export async function downloadReport(id, format) {
  const res = await fetch(`${API_URL}/api/v1/operations/runs/${id}/report?format=${format}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(await res.blob())
  link.download = `run-${id}.${format}`
  link.click()
  URL.revokeObjectURL(link.href)
}

// The NEDs with what each supports, to know which nodes an operation can run on.
export const fetchNeds = () => apiFetch('/api/v1/neds')
