import { apiFetch } from './client.js'
import { API_URL } from '../config.js'

export const fetchDesiredConfig = (logicalNodeId) =>
  apiFetch(`/api/v1/inventory/logical_nodes/${logicalNodeId}/configuration`)

export const fetchDay0Config = async (nodeId) => {
  const res = await fetch(`${API_URL}/api/v1/inventory/node_instances/${nodeId}/configuration/desired`)
  if (!res.ok) {
    const err = new Error(`API error ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.text()
}

export const fetchObservedConfig = (nodeId, output = 'rendered') =>
  apiFetch(`/api/v1/inventory/node_instances/${nodeId}/configuration/observed/latest?output=${output}`)
    .then(data => {
      if (data && typeof data.content === 'string' && output === 'rendered')
        return { ...data, content: atob(data.content) }
      return data
    })

export const fetchObservedHistory = (nodeId) =>
  apiFetch(`/api/v1/inventory/node_instances/${nodeId}/configuration/observed/`)

export const fetchObservedByHash = (nodeId, hash, output = 'rendered') =>
  apiFetch(`/api/v1/inventory/node_instances/${nodeId}/configuration/observed/${hash}`)
    .then(data => {
      if (data && typeof data.content === 'string')
        return { ...data, content: atob(data.content) }
      return data
    })

export const fetchObservedDiff = (nodeId, hashA, hashB) =>
  apiFetch(`/api/v1/inventory/node_instances/${nodeId}/configuration/observed/diff?a=${hashA}&b=${hashB}`)

export async function streamConfigAnalysis({ task, diff, nodeHostname, snapAHash, snapBHash, snapATimestamp, snapBTimestamp, onToken, onDone, signal }) {
  const res = await fetch(`${API_URL}/api/v1/ai_ops/ai/config_analysis/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, diff, node_hostname: nodeHostname, snap_a_hash: snapAHash, snap_b_hash: snapBHash, snap_a_timestamp: snapATimestamp, snap_b_timestamp: snapBTimestamp }),
    signal,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { const d = JSON.parse(line.slice(6)); if (d.content) onToken(d.content) } catch {}
      }
    }
  }
  onDone?.()
}

export async function streamAsk({ prompt, messages, context, onToken, onDone, signal }) {
  const res = await fetch(`${API_URL}/api/v1/ai_ops/ai/ask/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, messages, ...(context ? { context } : {}) }),
    signal,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { const d = JSON.parse(line.slice(6)); if (d.content) onToken(d.content) } catch {}
      }
    }
  }
  onDone?.()
}

export const fetchIntentDiff = (nodeId) =>
  apiFetch(`/api/v1/inventory/node_instances/${nodeId}/configuration/intent_diff`)
