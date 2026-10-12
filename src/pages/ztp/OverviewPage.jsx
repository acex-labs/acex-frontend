import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, ChevronRight, Undo2 } from 'lucide-react'
import {
  fetchProvisionCounts, fetchPipelineNodes, fetchDiscoveringCount, NOT_STARTED_FILTER, canUnclaim, unclaimNode,
} from '../../api/ztp'
import { IN_FLIGHT_STATUSES } from '../../components/nodes/nodeStatus'
import { ProvisionStatusBadge } from '../../components/nodes/NodeStatusBadge'
import DataTable from '../../components/table/DataTable'

// Provisioning moves fast compared to the rest of the inventory.
const REFRESH_MS = 15_000

const PIPELINE = [
  { key: 'awaiting_device',   label: 'Awaiting device',   dot: 'bg-brand' },
  // Not a provision_status: devices that called in and are being discovered, before they match a node.
  { key: 'discovering',       label: 'Discovering',       dot: 'bg-brand', to: '/ztp/discovery' },
  { key: 'awaiting_approval', label: 'Awaiting approval', dot: 'bg-amber-400', attention: 'border-amber-500/40', to: '/ztp/approvals' },
  { key: 'provisioning',      label: 'Provisioning',      dot: 'bg-brand' },
  { key: 'provisioned',       label: 'Provisioned',       dot: 'bg-green-400' },
]

// What needs a human first (failed, awaiting approval), then furthest along the pipeline.
const ROW_ORDER = ['failed', 'awaiting_approval', 'provisioning', 'awaiting_device', 'not_started']

const COVERAGE = [
  { label: 'Provisioned',   keys: ['provisioned'],      bar: 'bg-green-500' },
  { label: 'Adopted',       keys: ['adopted'],          bar: 'bg-subtle' },
  { label: 'In progress',   keys: IN_FLIGHT_STATUSES,   bar: 'bg-brand' },
  { label: 'Failed',        keys: ['failed'],           bar: 'bg-red-500' },
  { label: 'Unprovisioned', keys: ['unprovisioned'],    bar: 'bg-edge' },
]

function UnclaimButton({ node }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const mutation = useMutation({
    mutationFn: () => unclaimNode(node),
    onSuccess: () => ['ztp', 'nodes', 'assets', 'logical-nodes'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] })),
  })

  if (!canUnclaim(node)) return null
  return (
    <button
      onClick={e => { e.stopPropagation(); confirming ? mutation.mutate() : setConfirming(true) }}
      onBlur={() => setConfirming(false)}
      disabled={mutation.isPending}
      title="Remove the claim: the asset returns to Unclaimed and the logical node to planned"
      className={[
        'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors disabled:opacity-50',
        confirming ? 'bg-red-500/10 text-red-400' : 'text-subtle hover:text-content hover:bg-surface-hi',
      ].join(' ')}
    >
      <Undo2 size={11} />
      {mutation.isPending ? 'Unclaiming…' : confirming ? 'Confirm unclaim' : 'Unclaim'}
    </button>
  )
}

const COLUMNS = [
  { key: 'hostname', label: 'Hostname' },
  { key: 'site',     label: 'Site' },
  { key: 'ned_id',   label: 'Driver' },
  { key: 'stage',    label: 'Stage', render: v => <ProvisionStatusBadge status={v} /> },
  { key: 'id',       label: '',      render: (_, row) => <UnclaimButton node={row} /> },
]

function Card({ title, className = '', children }) {
  return (
    <div className={`bg-surface border border-edge rounded-md overflow-hidden ${className}`}>
      <div className="px-4 py-2.5 border-b border-edge">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StageCard({ label, value, dot, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[120px] bg-surface border border-edge rounded-md px-5 py-4 text-left hover:border-brand/40 transition-colors ${className}`}
    >
      <div className="text-2xl font-semibold text-content tabular-nums">
        {value ?? <span className="animate-pulse text-subtle">—</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
        <span className="text-[10px] uppercase tracking-widest text-subtle">{label}</span>
      </div>
    </button>
  )
}

// The backlog before the pipeline: what an operator still has to claim or start.
function PlannedCard({ counts, onNavigate }) {
  const rows = [
    { label: 'Unclaimed assets',      value: counts?.unclaimedAssets,     to: '/ztp/unclaimed' },
    { label: 'Unbound logical nodes', value: counts?.unboundLogicalNodes, to: '/ztp/unclaimed' },
    { label: 'Bound, not started',    value: counts?.notStarted,          to: `/network/nodes?${new URLSearchParams(NOT_STARTED_FILTER)}` },
  ]
  return (
    <div className="flex-1 min-w-[190px] bg-surface border border-dashed border-edge rounded-md px-2 py-2">
      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-subtle">Planned</div>
      {rows.map(r => (
        <button
          key={r.label}
          onClick={() => onNavigate(r.to)}
          className="w-full flex items-baseline gap-2 px-2 py-0.5 rounded text-left hover:bg-surface-hi transition-colors"
        >
          <span className="text-sm font-semibold text-content tabular-nums w-8">
            {r.value ?? <span className="animate-pulse text-subtle">—</span>}
          </span>
          <span className="text-[11px] text-subtle">{r.label}</span>
        </button>
      ))}
    </div>
  )
}

function Coverage({ counts }) {
  const groups = COVERAGE.map(g => ({ ...g, value: g.keys.reduce((sum, k) => sum + (counts?.[k] ?? 0), 0) }))
  const total = groups.reduce((sum, g) => sum + g.value, 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex h-2 rounded-full overflow-hidden bg-surface-hi">
        {total > 0 && groups.filter(g => g.value > 0).map(g => (
          <div key={g.label} className={g.bar} style={{ width: `${(g.value / total) * 100}%` }} title={`${g.label}: ${g.value}`} />
        ))}
      </div>
      <dl className="space-y-1.5">
        {groups.map(g => (
          <div key={g.label} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-sm shrink-0 ${g.bar}`} />
            <dt className="text-subtle flex-1">{g.label}</dt>
            <dd className="text-content tabular-nums">{counts ? g.value : '—'}</dd>
            <dd className="text-subtle tabular-nums w-10 text-right">
              {total > 0 ? `${Math.round((g.value / total) * 100)}%` : ''}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function EmptyActive() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Zap size={28} className="text-subtle mb-3" />
      <h2 className="text-sm font-medium text-content">Nothing in the pipeline</h2>
      <p className="mt-1 text-xs text-subtle max-w-sm">
        <Link to="/ztp/unclaimed" className="text-brand hover:underline">Claim unclaimed assets</Link> to
        bind hardware to planned logical nodes. The device then fetches its bootstrap config over DHCP,
        becomes reachable over SSH, and gets its full configuration pushed and verified.
      </p>
    </div>
  )
}

export default function OverviewPage() {
  const navigate = useNavigate()
  const toNodes = filter => navigate(`/network/nodes?${new URLSearchParams(filter)}`)

  const { data: counts } = useQuery({
    queryKey: ['ztp', 'provision-counts'],
    queryFn: fetchProvisionCounts,
    refetchInterval: REFRESH_MS,
  })

  const { data: discovering } = useQuery({
    queryKey: ['ztp', 'discovering-count'],
    queryFn: fetchDiscoveringCount,
    refetchInterval: REFRESH_MS,
  })
  const stageCounts = counts && { ...counts, discovering }

  const { data: active = [], isLoading } = useQuery({
    queryKey: ['ztp', 'pipeline'],
    queryFn: fetchPipelineNodes,
    refetchInterval: REFRESH_MS,
  })

  const rows = useMemo(
    () => [...active].sort((a, b) => ROW_ORDER.indexOf(a.stage) - ROW_ORDER.indexOf(b.stage)),
    [active],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <h1 className="text-sm font-semibold text-content">Zero Touch Provisioning — Overview</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Pipeline */}
        <div className="flex flex-wrap items-center gap-2">
          <PlannedCard counts={counts} onNavigate={navigate} />
          {PIPELINE.map(stage => (
            <div key={stage.key} className="contents">
              <ChevronRight size={14} className="text-subtle shrink-0 hidden sm:block" />
              <StageCard
                label={stage.label}
                value={stageCounts?.[stage.key]}
                dot={stage.dot}
                onClick={() => (stage.to ? navigate(stage.to) : toNodes({ provision_status: stage.key }))}
                className={stage.attention && stageCounts?.[stage.key] ? stage.attention : ''}
              />
            </div>
          ))}
          <StageCard
            label="Failed"
            value={counts?.failed}
            dot="bg-red-400"
            onClick={() => toNodes({ provision_status: 'failed' })}
            className={`sm:ml-4 ${counts?.failed ? 'border-red-500/40' : ''}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <Card title="Pipeline" className="lg:col-span-2">
            {!isLoading && rows.length === 0 ? (
              <EmptyActive />
            ) : (
              <DataTable
                columns={COLUMNS}
                data={rows}
                isLoading={isLoading}
                onRowClick={row => navigate(`/network/nodes/${row.id}`)}
              />
            )}
          </Card>

          <Card title="Fleet coverage">
            <Coverage counts={counts} />
          </Card>
        </div>
      </div>
    </div>
  )
}
