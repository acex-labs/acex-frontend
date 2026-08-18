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

export const fetchObservedById = (nodeId, configId, output = 'rendered') =>
  apiFetch(`/api/v1/inventory/node_instances/${nodeId}/configuration/observed/${configId}`)
    .then(data => {
      if (data && typeof data.content === 'string')
        return { ...data, content: atob(data.content) }
      return data
    })

export const fetchObservedDiff = (nodeId, idA, idB) =>
  apiFetch(`/api/v1/inventory/node_instances/${nodeId}/configuration/observed/diff?a=${idA}&b=${idB}`)

export const AI_UNAVAILABLE_MESSAGE = 'AI features aren\'t enabled for this environment. Ask an administrator to turn on the AI Ops service.'

async function streamAiResponse(url, body, { onToken, onUsage, onDone, signal }) {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new Error(AI_UNAVAILABLE_MESSAGE)
  }
  // 404/502/503 typically mean the ai_ops service isn't deployed or running behind the gateway.
  if ([404, 502, 503].includes(res.status)) throw new Error(AI_UNAVAILABLE_MESSAGE)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const processLine = (line) => {
    if (!line.startsWith('data: ')) return
    try {
      const d = JSON.parse(line.slice(6))
      if (d.content) onToken(d.content)
      else if (d.usage) {
        console.debug('[AI] usage event received:', d.usage)
        onUsage?.(d.usage)
      }
    } catch {}
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) processLine(line)
  }
  // Flush any trailing event that arrived without a final newline
  buffer += decoder.decode()
  if (buffer.trim()) processLine(buffer.trim())
  onDone?.()
}

export async function streamConfigAnalysis({ task, diff, nodeHostname, snapAHash, snapBHash, snapATimestamp, snapBTimestamp, model, onToken, onUsage, onDone, signal }) {
  return streamAiResponse(
    `${API_URL}/api/v1/ai_ops/ai/config_analysis/`,
    {
      task, diff,
      node_hostname: nodeHostname,
      snap_a_hash: snapAHash, snap_b_hash: snapBHash,
      snap_a_timestamp: snapATimestamp, snap_b_timestamp: snapBTimestamp,
      ...(model ? { model } : {}),
    },
    { onToken, onUsage, onDone, signal },
  )
}

export async function streamAsk({ prompt, messages, context, model, onToken, onUsage, onDone, signal }) {
  return streamAiResponse(
    `${API_URL}/api/v1/ai_ops/ai/ask/`,
    { prompt, messages, ...(context ? { context } : {}), ...(model ? { model } : {}) },
    { onToken, onUsage, onDone, signal },
  )
}

export const fetchIntentDiff = (nodeId) =>
  apiFetch(`/api/v1/inventory/node_instances/${nodeId}/configuration/intent_diff`)
