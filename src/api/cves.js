import { apiFetch } from './client.js'
import { fetchAllCvePages } from './cvePagination.js'

export const fetchCves = ({ signal } = {}) => fetchAllCvePages(
  ({ limit, offset, signal: pageSignal }) => apiFetch(
    `/api/v1/cves?${new URLSearchParams({ limit, offset })}`,
    { signal: pageSignal },
  ),
  signal,
)

export const discoverCves = payload => apiFetch('/api/v1/cves/discover', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const updateNvdApiKey = apiKey => apiFetch('/api/v1/cves/api_key', {
  method: 'PUT',
  body: JSON.stringify({ api_key: apiKey }),
})
