import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { fetchNode } from '../../api/inventory'
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
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Asset</h3>
        <button
          onClick={onChangeAsset}
          className="text-[11px] text-brand hover:text-brand/80 font-semibold transition-colors"
        >
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

function OverviewTab({ data, onChangeAsset }) {
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
              <OverviewTab data={data} onChangeAsset={() => setShowChangeAsset(true)} />
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
