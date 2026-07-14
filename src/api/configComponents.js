import { apiFetch } from './client'

export const fetchComponentCatalog = () =>
  apiFetch('/api/v1/config_components/')

export const generateConfigMap = (body) =>
  apiFetch('/api/v1/config_components/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const reconcileConfigMap = (nodeInstanceId, body) =>
  apiFetch(`/api/v1/config_components/reconcile/${nodeInstanceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const searchNodeInstances = (hostname) =>
  apiFetch(`/api/v1/inventory/node_instances/?hostname=${encodeURIComponent(hostname)}&limit=15`)

export const fetchDrivers = () =>
  apiFetch('/api/v1/neds/')

export const translateConfig = (body) =>
  apiFetch('/api/v1/config_components/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
