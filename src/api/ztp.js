import { apiFetch } from './client.js'
import { fetchNodes, createNodeInstance, updateNodeInstance, deleteNodeInstance } from './inventory.js'

const total = (path, params) =>
  apiFetch(`/api/v1/inventory/${path}?${new URLSearchParams({ ...params, limit: 1 })}`).then(d => d.total)

// Counts for the whole ZTP flow: every node once by its ZTP stage, approved
// assets waiting for a node (the pool), and the planned backlog.
export const fetchProvisionCounts = async () => {
  const [summary, unclaimedAssets, unboundLogicalNodes] = await Promise.all([
    apiFetch('/api/v1/ztp_nodes/summary'),
    total('assets', { assigned: false }),
    total('logical_nodes', { assigned: false }),
  ])
  return { ...summary.stages, pool: summary.pool, stalled: summary.stalled, unclaimedAssets, unboundLogicalNodes }
}

// Nodes and their ZTP stage, what needs a human first. Without a stage, the
// nodes in the pipeline: awaiting device or approval, ready, provisioning, failed.
export const fetchZtpNodes = (params = {}) => apiFetch(`/api/v1/ztp_nodes?${query({ limit: 200, ...params })}`)

// One node: its stage, its asset's discoveries and its provisioning jobs.
export const fetchZtpNode = id => apiFetch(`/api/v1/ztp_nodes/${id}`)

// Take a node into ZTP, out of it, or step it back from provisioning to ready.
// Each answers the node as fetchZtpNode does, or 409 when the node can't.
export const enrollNode = id => apiFetch(`/api/v1/ztp_nodes/${id}/enroll`, { method: 'POST' })
export const provisionNode = id => apiFetch(`/api/v1/ztp_nodes/${id}/provision`, { method: 'POST' })
export const cancelZtp = id => apiFetch(`/api/v1/ztp_nodes/${id}/cancel`, { method: 'POST' })
export const resetZtp = id => apiFetch(`/api/v1/ztp_nodes/${id}/reset`, { method: 'POST' })

const IN_ZTP = ['enrolled', 'provisioning', 'failed']

// Bind a free asset to a logical node and enroll the node in ZTP. A planned
// logical node gets a new node instance; one already in service has its device
// replaced (RMA) and needs provisioning again. Its ZTP stage then follows the
// asset: awaiting the device, awaiting approval of its identity, then ready.
export const claimAsset = async ({ asset, logicalNode }) => {
  const binding = { asset_ref_id: asset.id, asset_ref_type: 'asset' }
  if (!logicalNode.assigned) {
    const node = await createNodeInstance({
      ...binding,
      logical_node_id: logicalNode.id,
      admin_status: 'planned',
      provision_status: 'unprovisioned',
    })
    return enrollNode(node.id)
  }
  const { items } = await fetchNodes({ logical_node_id: logicalNode.id, limit: 1 })
  if (!items.length) throw new Error(`No node instance found for ${logicalNode.hostname}`)
  const [node] = items
  await updateNodeInstance(node.id, binding)
  return IN_ZTP.includes(node.provision_status) ? fetchZtpNode(node.id) : enrollNode(node.id)
}

// A claim can be undone as long as the node has never been in service and full
// config hasn't gone out: the asset returns to Unclaimed, the logical node to planned.
// Takes a ZTP node (from fetchZtpNodes / fetchZtpNode).
const UNCLAIMABLE_STAGES = ['awaiting_device', 'awaiting_approval', 'ready', 'failed']
export const canUnclaim = node => node.admin_status === 'planned' && UNCLAIMABLE_STAGES.includes(node.stage)

export const unclaimNode = node => deleteNodeInstance(node.node_id)

// Discoveries: what a device says it is, held until an administrator approves it.
const query = params =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))

export const fetchDiscoveries = (params = {}) => apiFetch(`/api/v1/ztp_discoveries?${query(params)}`)

export const fetchDiscovery = id => apiFetch(`/api/v1/ztp_discoveries/${id}`)

// Approving trusts the device's identity: the asset with its serial is created or
// updated as the discovery's proposal says. proposalHash is the hash of the
// proposal shown; the backend answers 409 if approval would now do something else.
export const approveDiscovery = (id, proposalHash) =>
  apiFetch(`/api/v1/ztp_discoveries/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ proposal_hash: proposalHash ?? null }),
  })

// Approved assets no node has claimed yet (the pool), each by the discovery that approved it, newest first.
export const fetchAwaitingClaim = () =>
  fetchDiscoveries({ review_status: 'approved', limit: 1000 }).then(({ items }) => {
    const seen = new Set()
    return items.filter(d => d.asset_id != null && d.node_id == null && !seen.has(d.asset_id) && seen.add(d.asset_id))
  })

// Conflicts a bulk approval skips; such a discovery is approved on its own.
export const IDENTITY_CONFLICTS = ['serial_on_other_ip', 'ip_with_other_serial']

export const rejectDiscovery = id => apiFetch(`/api/v1/ztp_discoveries/${id}/reject`, { method: 'POST' })

// items: [{ discovery_id, proposal_hash }]. A dry run writes nothing and says what
// would happen; discoveries that can't be approved are skipped with a reason.
export const approveDiscoveries = (items, { dryRun = false } = {}) =>
  apiFetch('/api/v1/ztp_discoveries/approve', {
    method: 'POST',
    body: JSON.stringify({ items, dry_run: dryRun }),
  })

export const rejectDiscoveries = ids =>
  apiFetch('/api/v1/ztp_discoveries/reject', { method: 'POST', body: JSON.stringify({ discovery_ids: ids }) })

// Call-ins: devices that fetched a bootstrap, one per IP, and how far discovery got.
export const fetchCalls = (params = {}) => apiFetch(`/api/v1/ztp_calls?${query(params)}`)

// Where a call-in stands in review, from the discoveries its attempts reported, newest first. target: the
// report to review (the newest unreviewed one, else the newest); olderIds: the other unreviewed reports, which
// go when target is rejected; status: unreviewed while any report waits, else the newest report's status.
export const reviewOf = call => {
  const reports = call.attempts.filter(a => a.discovery_id != null)
  const waiting = reports.filter(a => a.review_status === 'unreviewed')
  return {
    target: waiting[0] ?? reports[0] ?? null,
    olderIds: waiting.slice(1).map(a => a.discovery_id),
    status: waiting.length ? 'unreviewed' : reports[0]?.review_status ?? null,
  }
}

// Devices with a report waiting for review, most recently seen first.
export const fetchAwaitingReview = () =>
  fetchCalls({ limit: 1000 }).then(({ items }) => items.filter(call => reviewOf(call).status === 'unreviewed'))

export const retryDiscovery = ip => apiFetch(`/api/v1/ztp_calls/${encodeURIComponent(ip)}/retry`, { method: 'POST' })

// ZTP methods: what an administrator has chosen for each way a device bootstraps.
export const fetchMethods = () => apiFetch('/api/v1/ztp_methods')

// changes: any of { ned, bootstrap_username, bootstrap_password }; only the fields sent change, null clears one.
export const updateMethod = (method, changes) =>
  apiFetch(`/api/v1/ztp_methods/${method}`, { method: 'PUT', body: JSON.stringify(changes) })

// DHCP vendor classes, each mapped to one ZTP method or none (method null) until configured.
export const fetchVendorClasses = () => apiFetch('/api/v1/ztp_vendor_classes')

// 409 when the vendor class already exists.
export const createVendorClass = ({ vendor_class, method }) =>
  apiFetch('/api/v1/ztp_vendor_classes', { method: 'POST', body: JSON.stringify({ vendor_class, method }) })

// changes: any of { vendor_class, method }; only the fields sent change, method null unmaps it.
export const updateVendorClass = (id, changes) =>
  apiFetch(`/api/v1/ztp_vendor_classes/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })

export const deleteVendorClass = id => apiFetch(`/api/v1/ztp_vendor_classes/${id}`, { method: 'DELETE' })

// IPv4 networks the ZTP DHCP server hands out addresses in. 422 with a reason when a scope
// doesn't hold together (pool or gateway outside the network, gateway in the pool) or overlaps another.
export const fetchDhcpScopes = () => apiFetch('/api/v1/ztp_dhcp_scopes')

export const createDhcpScope = scope =>
  apiFetch('/api/v1/ztp_dhcp_scopes', { method: 'POST', body: JSON.stringify(scope) })

export const updateDhcpScope = (id, changes) =>
  apiFetch(`/api/v1/ztp_dhcp_scopes/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })

export const deleteDhcpScope = id => apiFetch(`/api/v1/ztp_dhcp_scopes/${id}`, { method: 'DELETE' })

// The full Kea DHCPv4 config for ZTP. Bootstrap URLs use the address the API was reached on.
export const fetchKeaConfig = () => apiFetch('/api/v1/ztp_dhcp/kea')

// Devices still being discovered (called in, not yet reported), most recently seen first.
export const fetchDiscoveringCalls = () =>
  Promise.all(['waiting', 'discovering'].map(stage => fetchCalls({ stage, limit: 200 }).then(d => d.items)))
    .then(lists => lists.flat().sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen)))

// Devices still being discovered: called in, not yet reported.
export const fetchDiscoveringCount = () =>
  Promise.all(['waiting', 'discovering'].map(stage => fetchCalls({ stage, limit: 1 }).then(d => d.total)))
    .then(([waiting, discovering]) => waiting + discovering)
