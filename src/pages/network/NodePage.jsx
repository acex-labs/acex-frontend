import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ArrowLeftRight, Plus, X } from 'lucide-react'
import {
  fetchNode,
  fetchCredentials,
  fetchNodeCredentials,
  assignNodeCredential,
  removeNodeCredential,
  fetchManagementConnections,
  createManagementConnection,
  updateManagementConnection,
  deleteManagementConnection,
} from '../../api/inventory'
import { usePageAiContext } from '../../context/AiContext'
import ChangeAssetModal from '../../components/nodes/ChangeAssetModal'
import VendorIcon from '../../components/ui/VendorIcon'
import ConfigurationTab from './ConfigurationTab'
import ConfigHistory from '../../components/config/ConfigHistory'
import HardwareTab from '../../components/hardware/HardwareTab'
import LldpTab from './LldpTab'

const NODE_OVERVIEW_STARTER_LABELS = [
  { key: 'summarize', label: 'Summarize this node' },
  { key: 'issues',    label: 'Check for issues' },
  { key: 'suggest',   label: 'Suggest improvements' },
]

const NODE_CONFIG_STARTER_LABELS = [
  { key: 'review',   label: 'Review configuration' },
  { key: 'security', label: 'Security assessment' },
  { key: 'explain',  label: 'Explain configuration' },
]

function section(title, fields) {
  const rows = fields.filter(([, v]) => v != null && v !== '')
  if (!rows.length) return null
  return `${title}:\n${rows.map(([k, v]) => `  ${k}: ${v}`).join('\n')}`
}

function buildOverviewContext(data) {
  if (!data) return ''
  const ln = data.logical_node ?? {}
  const asset = data.asset ?? {}
  const isCluster = asset.type === 'asset_cluster'
  const units = isCluster ? (asset.assets ?? []) : []

  const parts = [
    section('Node Instance', [
      ['Status',  data.status],
      ['Regions', data.regions?.join(', ')],
      ['Created', data.created_at ? new Date(data.created_at).toLocaleDateString('sv-SE') : null],
      ['Updated', data.updated_at ? new Date(data.updated_at).toLocaleDateString('sv-SE') : null],
    ]),
    section('Logical Node', [
      ['Hostname', ln.hostname],
      ['Site',     ln.site],
      ['Role',     ln.role],
      ['Sequence', ln.sequence],
    ]),
    isCluster
      ? `Asset (cluster):\n${units.map((u, i) =>
          `  Unit ${u.cluster_index ?? i + 1}: ${[u.vendor, u.hardware_model].filter(Boolean).join(' ')}` +
          (u.serial_number ? ` SN:${u.serial_number}` : '') +
          ([u.os, u.os_version].filter(Boolean).length ? ` ${[u.os, u.os_version].filter(Boolean).join(' ')}` : '')
        ).join('\n')}`
      : section('Asset', [
          ['Vendor', asset.vendor],
          ['Model',  asset.hardware_model],
          ['Driver', asset.ned_id],
          ['Serial', asset.serial_number],
          ['OS',     [asset.os, asset.os_version].filter(Boolean).join(' ') || null],
        ]),
  ]
  return parts.filter(Boolean).join('\n\n')
}

const TABS = [
  { key: 'overview',      label: 'Overview' },
  { key: 'configuration', label: 'Configuration' },
  { key: 'hardware',      label: 'Hardware' },
  { key: 'lldp',          label: 'LLDP' },
  { key: 'history',       label: 'History' },
]

const STATUS_STYLES = {
  active:          'bg-green-500/10 text-green-400',
  planned:         'bg-surface-hi text-subtle',
  init:            'bg-brand/10 text-brand',
  decommissioned:  'bg-red-500/10 text-red-400',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[status] ?? 'bg-surface-hi text-subtle'}`}>
      {status}
    </span>
  )
}

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-4 py-2 border-b border-edge last:border-0">
      <dt className="w-36 shrink-0 text-[11px] text-subtle">{label}</dt>
      <dd className="text-xs text-content">{value}</dd>
    </div>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-surface border border-edge rounded-md overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-2.5 border-b border-edge shrink-0">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
        </div>
      )}
      <dl className="px-4 py-1 overflow-y-auto flex-1">{children}</dl>
    </div>
  )
}

function AssetCard({ asset, onChangeAsset }) {
  const isCluster = asset?.type === 'asset_cluster'
  const units = isCluster ? (asset.assets ?? []) : []

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Asset</h3>
          {asset && (
            <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Active
            </span>
          )}
        </div>
        <button
          onClick={onChangeAsset}
          className="flex items-center gap-1 text-[11px] text-brand hover:text-brand/80 font-semibold transition-colors"
        >
          <ArrowLeftRight size={11} />
          Change
        </button>
      </div>

      {!asset ? (
        <div className="flex items-center justify-center flex-1 text-xs text-subtle">No asset assigned.</div>
      ) : (
        <>
          {isCluster ? (
            <>
              {/* Cluster summary row */}
              <div className="px-4 py-2.5 border-b border-edge shrink-0 flex items-center gap-2">
                <span className="text-xs font-medium text-content truncate">{asset.name || 'Cluster'}</span>
                {asset.ned_id && (
                  <span className="ml-auto text-[11px] text-subtle shrink-0">{asset.ned_id}</span>
                )}
              </div>
              {/* Scrollable units */}
              <div className="flex-1 overflow-y-auto">
                {units.map((u, i) => (
                  <div key={i} className="px-4 py-2.5 border-b border-edge/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <VendorIcon vendor={u.vendor} size={13} />
                      <span className="text-xs font-medium text-content truncate">
                        {[u.vendor, u.hardware_model].filter(Boolean).join(' ')}
                      </span>
                      <span className="ml-auto text-[10px] text-subtle shrink-0">
                        Unit {u.cluster_index ?? i + 1}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 pl-5 text-[11px] text-subtle">
                      {u.serial_number && <span className="font-mono">SN: {u.serial_number}</span>}
                      {(u.os || u.os_version) && <span>{[u.os, u.os_version].filter(Boolean).join(' ')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Single asset — alla fält direkt */
            <dl className="px-4 py-1 overflow-y-auto flex-1">
              <div className="flex gap-4 py-2 border-b border-edge">
                <dt className="w-36 shrink-0 text-[11px] text-subtle">Vendor</dt>
                <dd className="flex items-center gap-1.5 text-xs text-content">
                  <VendorIcon vendor={asset.vendor} size={13} />
                  {asset.vendor}
                </dd>
              </div>
              <Field label="Model"  value={asset.hardware_model} />
              <Field label="Driver" value={asset.ned_id} />
              <Field label="Serial" value={asset.serial_number} />
              <Field label="OS"     value={[asset.os, asset.os_version].filter(Boolean).join(' ')} />
            </dl>
          )}
        </>
      )}
    </div>
  )
}

const CONNECTION_TYPES = ['ssh', 'telnet']

function TypeBadge({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-hi text-subtle shrink-0">
      {children}
    </span>
  )
}

function DeleteConfirm({ onConfirm, onCancel, pending }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onConfirm}
        disabled={pending}
        className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
      >
        Confirm
      </button>
      <button
        onClick={onCancel}
        className="px-1.5 py-0.5 rounded text-[10px] border border-edge text-subtle hover:text-content transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

function ManagementConnectionsCard({ nodeId }) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ connection_type: 'ssh', target_ip: '', primary: false })
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['management_connections', nodeId],
    queryFn: () => fetchManagementConnections(nodeId),
  })
  const connections = Array.isArray(data) ? data : (data?.items ?? [])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['management_connections', nodeId] })

  const createMutation = useMutation({
    mutationFn: (payload) => createManagementConnection(payload),
    onSuccess: () => {
      invalidate()
      setAdding(false)
    },
  })

  const setPrimaryMutation = useMutation({
    mutationFn: (id) => updateManagementConnection(id, { primary: true }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteManagementConnection(id),
    onSuccess: () => {
      invalidate()
      setConfirmDeleteId(null)
    },
  })

  const openAdd = () => {
    setForm({ connection_type: 'ssh', target_ip: '', primary: connections.length === 0 })
    setAdding(true)
  }

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between shrink-0">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Management Connections</h3>
        {!adding && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1 text-[11px] text-brand hover:text-brand/80 font-semibold transition-colors"
          >
            <Plus size={11} />
            Add
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="px-4 py-3 text-xs text-subtle animate-pulse">Loading…</div>
      ) : connections.length === 0 && !adding ? (
        <div className="px-4 py-3 text-xs text-subtle">No management connections configured.</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {connections.map(conn => (
            <div key={conn.id} className="px-4 py-2.5 border-b border-edge/50 last:border-0 flex items-center gap-2">
              <TypeBadge>{conn.connection_type}</TypeBadge>
              <span className="text-xs text-content font-mono truncate">{conn.target_ip || '—'}</span>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {conn.primary ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-green-500/10 text-green-400">
                    Primary
                  </span>
                ) : (
                  <button
                    onClick={() => setPrimaryMutation.mutate(conn.id)}
                    disabled={setPrimaryMutation.isPending}
                    className="text-[10px] text-brand hover:text-brand/80 font-semibold transition-colors disabled:opacity-40"
                  >
                    Set primary
                  </button>
                )}
                {confirmDeleteId === conn.id ? (
                  <DeleteConfirm
                    pending={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(conn.id)}
                    onCancel={() => setConfirmDeleteId(null)}
                  />
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(conn.id)}
                    className="text-subtle hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {adding && (
            <div className="px-4 py-3 border-b border-edge/50 last:border-0 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.connection_type}
                  onChange={e => setForm(f => ({ ...f, connection_type: e.target.value }))}
                  className="bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content outline-none focus:border-brand/50 transition-colors"
                >
                  {CONNECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="IP or hostname"
                  value={form.target_ip}
                  onChange={e => setForm(f => ({ ...f, target_ip: e.target.value }))}
                  autoFocus
                  className="bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors"
                />
              </div>
              <label className="flex items-center gap-2 text-[11px] text-subtle">
                <input
                  type="checkbox"
                  checked={form.primary}
                  onChange={e => setForm(f => ({ ...f, primary: e.target.checked }))}
                  className="accent-brand"
                />
                Set as primary
              </label>
              {createMutation.isError && (
                <div className="text-[11px] text-red-400">Failed to add connection.</div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => createMutation.mutate({ node_id: Number(nodeId), ...form })}
                  disabled={!form.target_ip || createMutation.isPending}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-brand text-white rounded disabled:opacity-40 transition-opacity"
                >
                  {createMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="px-2.5 py-1 text-[11px] text-subtle hover:text-content border border-edge rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NodeCredentialsCard({ nodeId }) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [selectedCredentialId, setSelectedCredentialId] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['node_credentials', nodeId],
    queryFn: () => fetchNodeCredentials(nodeId),
  })
  const mapped = Array.isArray(data) ? data : (data?.items ?? [])

  const { data: credData } = useQuery({
    queryKey: ['credentials-picker'],
    queryFn: () => fetchCredentials({ limit: 1000 }),
    enabled: adding,
  })
  const allCredentials = credData?.items ?? (Array.isArray(credData) ? credData : [])
  const mappedIds = new Set(mapped.map(m => m.credential_id))
  const available = allCredentials.filter(c => !mappedIds.has(c.id))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['node_credentials', nodeId] })

  const assignMutation = useMutation({
    mutationFn: (credentialId) => assignNodeCredential(nodeId, credentialId),
    onSuccess: () => {
      invalidate()
      setAdding(false)
      setSelectedCredentialId('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (credentialId) => removeNodeCredential(nodeId, credentialId),
    onSuccess: () => {
      invalidate()
      setConfirmDeleteId(null)
    },
  })

  const openAdd = () => {
    setSelectedCredentialId('')
    setAdding(true)
  }

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between shrink-0">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Credentials</h3>
        {!adding && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1 text-[11px] text-brand hover:text-brand/80 font-semibold transition-colors"
          >
            <Plus size={11} />
            Add
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="px-4 py-3 text-xs text-subtle animate-pulse">Loading…</div>
      ) : mapped.length === 0 && !adding ? (
        <div className="px-4 py-3 text-xs text-subtle">No credentials mapped to this node.</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {mapped.map(nc => (
            <div key={nc.id} className="px-4 py-2.5 border-b border-edge/50 last:border-0 flex items-center gap-2">
              <TypeBadge>{nc.credential_type ?? '—'}</TypeBadge>
              <span className="text-xs text-content truncate">{nc.credential_name ?? `#${nc.credential_id}`}</span>
              <div className="ml-auto shrink-0">
                {confirmDeleteId === nc.credential_id ? (
                  <DeleteConfirm
                    pending={removeMutation.isPending}
                    onConfirm={() => removeMutation.mutate(nc.credential_id)}
                    onCancel={() => setConfirmDeleteId(null)}
                  />
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(nc.credential_id)}
                    className="text-subtle hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {adding && (
            <div className="px-4 py-3 border-b border-edge/50 last:border-0 space-y-2">
              <select
                value={selectedCredentialId}
                onChange={e => setSelectedCredentialId(e.target.value)}
                autoFocus
                className="w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content outline-none focus:border-brand/50 transition-colors"
              >
                <option value="">Select a credential…</option>
                {available.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.credential_type})</option>
                ))}
              </select>
              {assignMutation.isError && (
                <div className="text-[11px] text-red-400">Failed to map credential.</div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => assignMutation.mutate(Number(selectedCredentialId))}
                  disabled={!selectedCredentialId || assignMutation.isPending}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-brand text-white rounded disabled:opacity-40 transition-opacity"
                >
                  {assignMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="px-2.5 py-1 text-[11px] text-subtle hover:text-content border border-edge rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OverviewTab({ data, nodeId, onChangeAsset }) {
  const ln = data.logical_node ?? {}
  return (
    <div className="overflow-auto flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Node Instance" className="flex flex-col lg:col-span-2">
        <Field label="Status"  value={data.status} />
        <Field label="Regions" value={data.regions?.join(', ') || null} />
        <Field label="Created" value={data.created_at ? new Date(data.created_at).toLocaleDateString('sv-SE') : null} />
        <Field label="Updated" value={data.updated_at ? new Date(data.updated_at).toLocaleDateString('sv-SE') : null} />
      </Card>
      <Card title="Logical Node" className="flex flex-col">
        <Field label="Hostname" value={ln.hostname} />
        <Field label="Site"     value={ln.site} />
        <Field label="Role"     value={ln.role} />
        <Field label="Sequence" value={ln.sequence} />
      </Card>
      <AssetCard asset={data.asset} onChangeAsset={onChangeAsset} />
      <ManagementConnectionsCard nodeId={nodeId} />
      <NodeCredentialsCard nodeId={nodeId} />
    </div>
  )
}

export default function NodePage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'overview'
  const [showChangeAsset, setShowChangeAsset] = useState(false)
  const [tabContext, setTabContext] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['node', id],
    queryFn: () => fetchNode(id),
  })

  const setTab = (tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    }, { replace: true })
  }

  const hostname = data?.logical_node?.hostname ?? `Node ${id}`

  const aiContext = data
    ? activeTab === 'overview'
      ? buildOverviewContext(data)
      : tabContext
    : ''

  usePageAiContext({
    pageName: `Node: ${hostname}`,
    tabName: TABS.find(t => t.key === activeTab)?.label,
    context: aiContext,
    starters: activeTab === 'overview' ? NODE_OVERVIEW_STARTER_LABELS : NODE_CONFIG_STARTER_LABELS,
    placeholder: activeTab === 'overview' ? 'Ask about this node…' : 'Ask about the configuration…',
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <Link
          to="/network/nodes"
          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-content mb-2 transition-colors"
        >
          <ChevronLeft size={11} />
          Nodes
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-content">
            {isLoading ? '—' : hostname}
          </h1>
          {data?.status && <StatusBadge status={data.status} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-edge px-4 shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
              activeTab === key
                ? 'border-brand text-content'
                : 'border-transparent text-subtle hover:text-content',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
        ) : !data ? (
          <div className="p-6 text-xs text-subtle">Node not found.</div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab data={data} nodeId={id} onChangeAsset={() => setShowChangeAsset(true)} />
            )}
            {activeTab === 'configuration' && (
              <ConfigurationTab nodeId={id} logicalNodeId={data?.logical_node_id} onContextChange={setTabContext} />
            )}
            {activeTab === 'hardware' && <HardwareTab nodeId={id} data={data} />}
            {activeTab === 'lldp'     && <LldpTab nodeId={id} hostname={data?.logical_node?.hostname} siteName={data?.logical_node?.site} />}
            {activeTab === 'history'  && <ConfigHistory nodeId={id} />}
          </>
        )}
      </div>
      {showChangeAsset && (
        <ChangeAssetModal
          nodeId={id}
          currentAssetId={data?.asset_ref_id}
          currentAssetType={data?.asset_ref_type}
          onClose={() => setShowChangeAsset(false)}
        />
      )}
    </div>
  )
}
