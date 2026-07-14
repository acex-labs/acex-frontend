import { apiFetch } from './client.js'

export const fetchLldpNeighbors = (nodeInstanceId) =>
  apiFetch(`/api/v1/operations/lldp_neighbors/${nodeInstanceId}`)

export const fetchLldpNeighborsBySite = (siteName) =>
  apiFetch(`/api/v1/operations/lldp_neighbors/by-site/${encodeURIComponent(siteName)}`)