import { apiFetch } from './client.js'

function buildQs(params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v)
  }
  return qs.toString()
}

export const fetchTelemetryAgents = ({ name, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/observability/agents?${buildQs({ name, limit, offset })}`)
    .then(data => {
      if (Array.isArray(data)) return { items: data, total: data.length }
      return { items: data.items ?? [], total: data.total ?? 0 }
    })

export const createTelemetryAgent = (payload) =>
  apiFetch('/api/v1/observability/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateTelemetryAgent = (id, payload) =>
  apiFetch(`/api/v1/observability/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteTelemetryAgent = (id) =>
  apiFetch(`/api/v1/observability/agents/${id}`, { method: 'DELETE' })

export const addAgentNode = (agentId, nodeId) =>
  apiFetch(`/api/v1/observability/agents/${agentId}/nodes/${nodeId}`, { method: 'POST' })

export const removeAgentNode = (agentId, nodeId) =>
  apiFetch(`/api/v1/observability/agents/${agentId}/nodes/${nodeId}`, { method: 'DELETE' })

export const addAgentRule = (agentId, rule) =>
  apiFetch(`/api/v1/observability/agents/${agentId}/rules`, {
    method: 'POST',
    body: JSON.stringify(rule),
  })

export const removeAgentRule = (agentId, ruleId) =>
  apiFetch(`/api/v1/observability/agents/${agentId}/rules/${ruleId}`, { method: 'DELETE' })

export const fetchObservabilityOutputs = () =>
  apiFetch('/api/v1/observability/outputs')

export const fetchGrafanaDashboards = () =>
  apiFetch('/api/v1/observability/grafana/dashboards')

export const fetchAgentConfig = async (id) => {
  const { API_URL } = await import('../config.js')
  const res = await fetch(`${API_URL}/api/v1/observability/agents/${id}/config`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.text()
}
