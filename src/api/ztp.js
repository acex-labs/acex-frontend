import { apiFetch } from './client.js'
import { fetchNodes, createNodeInstance, updateNodeInstance, deleteNodeInstance } from './inventory.js'
import { PROVISION_STATUSES, IN_FLIGHT_STATUSES } from '../components/nodes/nodeStatus.js'

// Bound but not started: hardware is claimed, nobody has kicked off provisioning yet.
export const NOT_STARTED_FILTER = { admin_status: 'planned', provision_status: 'unprovisioned' }

const total = (path, params) =>
  apiFetch(`/api/v1/inventory/${path}?${new URLSearchParams({ ...params, limit: 1 })}`).then(d => d.total)

// Counts for the whole ZTP flow: the planned backlog (unclaimed assets, unbound
// logical nodes, bound but not started) and one entry per provision_status.
export const fetchProvisionCounts = async () => {
  const [statusCounts, notStarted, unclaimedAssets, unboundLogicalNodes] = await Promise.all([
    Promise.all(PROVISION_STATUSES.map(s => total('node_instances', { provision_status: s }).then(n => [s, n]))),
    total('node_instances', NOT_STARTED_FILTER),
    total('assets', { assigned: false }),
    total('logical_nodes', { assigned: false }),
  ])
  return { ...Object.fromEntries(statusCounts), notStarted, unclaimedAssets, unboundLogicalNodes }
}

// Nodes in the pipeline — not started, mid-provisioning or failed. `stage` is the
// provision_status, except bound-but-not-started nodes which are 'not_started'.
export const fetchPipelineNodes = () =>
  Promise.all([
    fetchNodes({ ...NOT_STARTED_FILTER, limit: 100 }).then(r => r.items.map(n => ({ ...n, stage: 'not_started' }))),
    ...[...IN_FLIGHT_STATUSES, 'failed'].map(provision_status =>
      fetchNodes({ provision_status, limit: 100 }).then(r => r.items.map(n => ({ ...n, stage: provision_status }))),
    ),
  ]).then(results => results.flat())

// Bind a free asset to a logical node. A planned logical node gets a new node
// instance; one already in service has its device replaced (RMA) and needs
// provisioning again.
export const claimAsset = async ({ asset, logicalNode }) => {
  const binding = { asset_ref_id: asset.id, asset_ref_type: 'asset' }
  if (!logicalNode.assigned) {
    return createNodeInstance({
      ...binding,
      logical_node_id: logicalNode.id,
      admin_status: 'planned',
      provision_status: 'unprovisioned',
    })
  }
  const { items } = await fetchNodes({ logical_node_id: logicalNode.id, limit: 1 })
  if (!items.length) throw new Error(`No node instance found for ${logicalNode.hostname}`)
  return updateNodeInstance(items[0].id, { ...binding, provision_status: 'unprovisioned' })
}

// A claim can be undone as long as the node has never been in service and full
// config hasn't gone out: the asset returns to Unclaimed, the logical node to planned.
const UNCLAIMABLE_STAGES = ['not_started', 'awaiting_device', 'awaiting_approval', 'failed']
export const canUnclaim = node => node.admin_status === 'planned' && UNCLAIMABLE_STAGES.includes(node.stage)

export const unclaimNode = node => deleteNodeInstance(node.id)

// Discoveries: what a device says it is, held until an administrator approves it.
const query = params =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))

export const fetchDiscoveries = (params = {}) => apiFetch(`/api/v1/ztp_discoveries?${query(params)}`)

export const fetchDiscovery = id => apiFetch(`/api/v1/ztp_discoveries/${id}`)

// action: 'approve' or 'reject'
export const reviewDiscovery = (id, action) => apiFetch(`/api/v1/ztp_discoveries/${id}/${action}`, { method: 'POST' })

// Call-ins: devices that fetched a bootstrap, one per IP, and how far discovery got.
export const fetchCalls = (params = {}) => apiFetch(`/api/v1/ztp_calls?${query(params)}`)

export const retryDiscovery = ip => apiFetch(`/api/v1/ztp_calls/${encodeURIComponent(ip)}/retry`, { method: 'POST' })

// Devices still being discovered: called in, not yet reported.
export const fetchDiscoveringCount = () =>
  Promise.all(['waiting', 'discovering'].map(stage => fetchCalls({ stage, limit: 1 }).then(d => d.total)))
    .then(([waiting, discovering]) => waiting + discovering)
