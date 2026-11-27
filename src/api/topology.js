import { apiFetch } from './client.js'

export const fetchTopologyLayers = () =>
  apiFetch('/api/v1/topology/layers')

// Every layer when none is named. Regions and site are whole names; several regions are all their sites.
export const fetchTopology = ({ layers = [], regions = [], site } = {}) => {
  const qs = new URLSearchParams()
  for (const layer of layers) qs.append('layers', layer)
  for (const region of regions) qs.append('region', region)
  if (site) qs.set('site', site)
  return apiFetch(`/api/v1/topology?${qs}`)
}

// The shared layout of the topology page: every saved position, or those of the named containers.
export const fetchTopologyPositions = (containers = []) => {
  const qs = new URLSearchParams()
  for (const container of containers) qs.append('container', container)
  return apiFetch(`/api/v1/topology/positions?${qs}`)
}

export const saveTopologyPositions = (positions) =>
  apiFetch('/api/v1/topology/positions', { method: 'PUT', body: JSON.stringify(positions) })

// Forgets the positions in the containers, or only those of the named items in them.
export const resetTopologyPositions = ({ containers, items = [] }) => {
  const qs = new URLSearchParams()
  for (const container of containers) qs.append('container', container)
  for (const item of items) qs.append('item', item)
  return apiFetch(`/api/v1/topology/positions?${qs}`, { method: 'DELETE' })
}
