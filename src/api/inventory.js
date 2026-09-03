import { apiFetch } from './client.js'

function buildQs(params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v)
  }
  return qs.toString()
}

const normalizeNode = (n) => ({
  id:             n.id ?? n.logical_node_id,
  hostname:       n.hostname ?? n.logical_node?.hostname,
  site:           n.site ?? n.logical_node?.site,
  role:           n.logical_node?.role ?? n.role,
  status:         n.status,
  ned_id:         n.ned_id ?? n.asset?.ned_id,
  regions:        n.regions ?? [],
  asset_ref_id:   n.asset_ref_id,
  asset_ref_type: n.asset_ref_type,
})

export const fetchNodes = ({ hostname, site, region, role, id, limit = 50, offset = 0 } = {}) => {
  if (id) {
    return apiFetch(`/api/v1/inventory/node_instances/${id}`)
      .then(data => ({ items: [normalizeNode(data)], total: 1 }))
  }
  return apiFetch(`/api/v1/inventory/node_instances?${buildQs({ hostname, site, region, role, limit, offset })}`)
    .then(data => ({ ...data, items: data.items.map(normalizeNode) }))
}

export const fetchNode = (id) =>
  apiFetch(`/api/v1/inventory/node_instances/${id}`)

export const fetchSites = ({ name, city, country, region, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/inventory/sites?${buildQs({ name, city, country, region, limit, offset })}`)

export const fetchSite = (id) =>
  apiFetch(`/api/v1/inventory/sites/${id}`)

export const fetchRegions = ({ name, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/inventory/regions?${buildQs({ name, limit, offset })}`)

export const fetchLogicalNodes = ({ hostname, site, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/inventory/logical_nodes?${buildQs({ hostname, site, limit, offset })}`)

export const fetchAssets = ({ vendor, os, hardware_model, assigned, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/inventory/assets?${buildQs({ vendor, os, hardware_model, assigned, limit, offset })}`)

export const fetchAssetClusters = ({ assigned, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/inventory/asset_clusters?${buildQs({ assigned, limit, offset })}`)
    .then(data => Array.isArray(data) ? { items: data, total: data.length } : data)

export const updateNodeInstance = (id, patch) =>
  apiFetch(`/api/v1/inventory/node_instances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

export const fetchStats = () =>
  Promise.all([
    apiFetch('/api/v1/inventory/node_instances?limit=1'),
    apiFetch('/api/v1/inventory/assets?limit=1'),
    apiFetch('/api/v1/inventory/sites?limit=1'),
    apiFetch('/api/v1/inventory/regions?limit=1'),
  ]).then(([nodes, assets, sites, regions]) => ({
    nodes:   nodes.total,
    assets:  assets.total,
    sites:   sites.total,
    regions: regions.total,
  }))

export const fetchAllSites = () =>
  apiFetch('/api/v1/inventory/sites?limit=10000')
    .then(d => d.items ?? [])

export const fetchContacts = ({ name, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/inventory/contacts?${buildQs({ name, limit, offset })}`)

export const fetchContact = (id) =>
  apiFetch(`/api/v1/inventory/contacts/${id}`)

export const updateContact = (id, data) =>
  apiFetch(`/api/v1/inventory/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

// ── Collection Agents ────────────────────────────────────────────────────────

export const fetchCollectionAgents = ({ name, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/inventory/collection_agents?${buildQs({ name, limit, offset })}`)
    .then(data => {
      if (Array.isArray(data)) return { items: data, total: data.length }
      return { items: data.items ?? [], total: data.total ?? 0 }
    })

export const createCollectionAgent = (payload) =>
  apiFetch('/api/v1/inventory/collection_agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateCollectionAgent = (id, patch) =>
  apiFetch(`/api/v1/inventory/collection_agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

export const deleteCollectionAgent = (id) =>
  apiFetch(`/api/v1/inventory/collection_agents/${id}`, { method: 'DELETE' })

export const addCollectionAgentNode = (agentId, nodeId) =>
  apiFetch(`/api/v1/inventory/collection_agents/${agentId}/nodes/${nodeId}`, { method: 'POST' })

export const removeCollectionAgentNode = (agentId, nodeId) =>
  apiFetch(`/api/v1/inventory/collection_agents/${agentId}/nodes/${nodeId}`, { method: 'DELETE' })

export const addCollectionAgentRule = (agentId, rule) =>
  apiFetch(`/api/v1/inventory/collection_agents/${agentId}/rules`, {
    method: 'POST',
    body: JSON.stringify(rule),
  })

export const removeCollectionAgentRule = (agentId, ruleId) =>
  apiFetch(`/api/v1/inventory/collection_agents/${agentId}/rules/${ruleId}`, { method: 'DELETE' })

export const fetchContactAssignments = ({ site_name, contact_name } = {}) =>
  apiFetch(`/api/v1/inventory/contact_assignments?${buildQs({ site_name, contact_name })}`)

export const createContactAssignment = ({ contact_name, site_name }) =>
  apiFetch('/api/v1/inventory/contact_assignments', {
    method: 'POST',
    body: JSON.stringify({ contact_name, site_name }),
  })

export const deleteContactAssignment = (id) =>
  apiFetch(`/api/v1/inventory/contact_assignments/${id}`, { method: 'DELETE' })

export const fetchCredentials = ({ name, limit = 50, offset = 0 } = {}) =>
  apiFetch(`/api/v1/inventory/credentials?${buildQs({ name, limit, offset })}`)

export const fetchCredentialSecret = (id) =>
  apiFetch(`/api/v1/inventory/credentials/${id}/secret`)

export const createCredential = (data) =>
  apiFetch('/api/v1/inventory/credentials', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateCredential = (id, data) =>
  apiFetch(`/api/v1/inventory/credentials/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteCredential = (id) =>
  apiFetch(`/api/v1/inventory/credentials/${id}`, { method: 'DELETE' })
