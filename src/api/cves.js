import { apiFetch } from './client.js'

export const fetchCves = () => apiFetch('/api/v1/cves')

export const discoverCves = payload => apiFetch('/api/v1/cves/discover', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const updateNvdApiKey = apiKey => apiFetch('/api/v1/cves/api_key', {
  method: 'PUT',
  body: JSON.stringify({ api_key: apiKey }),
})
