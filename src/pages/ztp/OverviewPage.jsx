import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Zap, ChevronRight, X, AlertTriangle } from 'lucide-react'
import { fetchProvisionCounts, fetchZtpNodes, fetchDiscoveringCount, fetchDiscoveringCalls } from '../../api/ztp'
import { ProvisionStatusBadge } from '../../components/nodes/NodeStatusBadge'
import { formatTime } from '../../components/jobs/jobs'
import { useQueryParams } from '../../hooks/useQueryParams'
import DataTable from '../../components/table/DataTable'
import ZtpNodePanel from '../../components/ztp/ZtpNodePanel'

// Provisioning moves fast compared to the rest of the inventory.
const REFRESH_MS = 15_000

// stage: a ZTP stage, or 'stalled'. node: the node shown in the drawer.
const DEFAULTS = { stage: '', node: '' }

// The pipeline, left to right. Each segment filters the table below.
const PIPELINE = [
  { key: 'awaiting_device',   label: 'Awaiting device',   dot: 'bg-brand' },
  // Not a node stage: devices that called in and are being discovered, before anyone knows which node they
  // are. Its table lists those call-ins instead of nodes.
  { key: 'discovering',       label: 'Discovering',       dot: 'bg-brand' },
  { key: 'awaiting_approval', label: 'Awaiting approval', dot: 'bg-amber-400', attention: 'text-amber-400' },
  { key: 'ready',             label: 'Ready',             dot: 'bg-sky-400', attention: 'text-sky-400' },
  { key: 'provisioning',      label: 'Provisioning',      dot: 'bg-brand' },
  { key: 'provisioned',       label: 'Provisioned',       dot: 'bg-green-400' },
]

const ATTENTION = [
  { key: 'failed',  label: 'Failed',  tone: 'text-red-400' },
  { key: 'stalled', label: 'Stalled', tone: 'text-red-400', hint: 'Provisioning that is not getting anywhere' },
]

const STAGE_LABELS = Object.fromEntries([...PIPELINE, ...ATTENTION].map(s => [s.key, s.label]))

const COVERAGE = [
  { label: 'Provisioned',   keys: ['provisioned'],                                                   bar: 'bg-green-500' },
  { label: 'Adopted',       keys: ['adopted'],                                                       bar: 'bg-subtle' },
  { label: 'In progress',   keys: ['awaiting_device', 'awaiting_approval', 'ready', 'provisioning'], bar: 'bg-brand' },
  { label: 'Failed',        keys: ['failed'],                                                        bar: 'bg-red-500' },
  { label: 'Unprovisioned', keys: ['unprovisioned'],                                                 bar: 'bg-edge' },
]

const muted = v => (v ? <span className="whitespace-nowrap">{v}</span> : <span className="text-subtle">—</span>)

const COLUMNS = [
  { key: 'hostname',  label: 'Hostname',  render: (v, row) => <span className="font-medium whitespace-nowrap">{v ?? `Node ${row.node_id}`}</span> },
  { key: 'site',      label: 'Site',      render: muted },
  { key: 'asset',     label: 'Serial',    render: v => (v ? <span className="font-mono whitespace-nowrap">{v.serial_number}</span> : muted()) },
  { key: 'asset_hw',  label: 'Hardware',  render: (_, row) => muted([row.asset?.vendor, row.asset?.hardware_model].filter(Boolean).join(' ')) },
  { key: 'stage',     label: 'Stage',     render: (v, row) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <ProvisionStatusBadge status={v} />
      {row.stalled && <span title={row.stalled} className="text-red-400"><AlertTriangle size={12} /></span>}
    </span>
  ) },
  { key: 'last_seen', label: 'Last seen', render: v => muted(v && formatTime(v)) },
]

const CALL_STAGE_STYLES = {
  waiting:     'bg-surface-hi text-subtle',
  discovering: 'bg-brand/10 text-brand',
}

const CALL_COLUMNS = [
  { key: 'source_ip', label: 'Source IP', render: v => <span className="font-mono whitespace-nowrap">{v}</span> },
  { key: 'method',    label: 'Method',    render: v => muted(v?.replaceAll('_', ' ')) },
  { key: 'stage',     label: 'Stage',     render: v => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${CALL_STAGE_STYLES[v] ?? ''}`}>
      {v === 'waiting' ? 'waiting for worker' : v}
    </span>
  ) },
  { key: 'attempts',  label: 'Attempts',  render: v => <span className="tabular-nums">{v.length}</span> },
  { key: 'last_seen', label: 'Last seen', render: v => muted(formatTime(v)) },
]

function Card({ title, className = '', aside, children }) {
  return (
    <section className={`bg-surface border border-edge rounded-md overflow-hidden ${className}`}>
      <div className="px-4 py-2.5 border-b border-edge flex items-center gap-2 min-h-[37px]">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

const Count = ({ value, className = 'text-content' }) => (
  <span className={`font-semibold tabular-nums ${className}`}>{value ?? <span className="animate-pulse text-subtle">—</span>}</span>
)

// One card, equal segments, never wrapping: on a narrow screen it scrolls sideways and keeps its shape.
function PipelineStrip({ counts, active, onSelect }) {
  return (
    <section className="bg-surface border border-edge rounded-md overflow-x-auto">
      <div className="flex min-w-[720px]">
        {PIPELINE.map((stage, i) => {
          const value = counts?.[stage.key]
          const selected = active === stage.key
          return (
            <div key={stage.key} className="relative flex-1 min-w-[110px] flex">
              <button
                onClick={() => onSelect(stage)}
                className={[
                  'flex-1 px-4 py-3.5 text-left transition-colors',
                  selected ? 'bg-brand/10' : 'hover:bg-surface-hi',
                  i > 0 ? 'border-l border-edge' : '',
                ].join(' ')}
              >
                <div className="text-2xl leading-tight">
                  <Count value={value} className={stage.attention && value ? stage.attention : 'text-content'} />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stage.dot}`} />
                  <span className={`text-[10px] uppercase tracking-widest truncate ${selected ? 'text-brand' : 'text-subtle'}`}>
                    {stage.label}
                  </span>
                </div>
              </button>
              {i < PIPELINE.length - 1 && (
                <ChevronRight
                  size={14}
                  className="absolute -right-[7px] top-1/2 -translate-y-1/2 z-10 text-subtle bg-surface rounded-full"
                />
              )}
              {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AttentionCard({ counts, active, onSelect }) {
  const total = (counts?.failed ?? 0) + (counts?.stalled ?? 0)
  return (
    <Card title="Needs attention" className={total ? 'border-red-500/40' : ''}>
      <div className="grid grid-cols-2">
        {ATTENTION.map((item, i) => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            title={item.hint}
            className={[
              'px-4 py-3 text-left transition-colors',
              active === item.key ? 'bg-brand/10' : 'hover:bg-surface-hi',
              i > 0 ? 'border-l border-edge' : '',
            ].join(' ')}
          >
            <div className="text-xl leading-tight">
              <Count value={counts?.[item.key]} className={counts?.[item.key] ? item.tone : 'text-content'} />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-subtle mt-0.5">{item.label}</div>
          </button>
        ))}
      </div>
    </Card>
  )
}

// The backlog before the pipeline: what an operator still has to claim.
function BacklogCard({ counts }) {
  const rows = [
    { label: 'Unclaimed assets',      value: counts?.unclaimedAssets },
    { label: 'of which approved',     value: counts?.pool, hint: 'Discovered and approved, waiting for a node', indent: true },
    { label: 'Unbound logical nodes', value: counts?.unboundLogicalNodes },
  ]
  return (
    <Card
      title="Backlog"
      aside={<Link to="/ztp/unclaimed" className="ml-auto text-[11px] text-brand hover:underline">Claim →</Link>}
    >
      <dl className="px-4 py-3 space-y-1.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-baseline gap-2 text-xs" title={r.hint}>
            <dt className={`flex-1 text-subtle ${r.indent ? 'pl-3' : ''}`}>{r.label}</dt>
            <dd className="text-sm"><Count value={r.value} /></dd>
          </div>
        ))}
      </dl>
    </Card>
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

function EmptyActive({ stage }) {
  if (stage) {
    return <p className="py-12 text-center text-xs text-subtle">No nodes are {STAGE_LABELS[stage]?.toLowerCase() ?? stage}.</p>
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Zap size={28} className="text-subtle mb-3" />
      <h2 className="text-sm font-medium text-content">Nothing in the pipeline</h2>
      <p className="mt-1 text-xs text-subtle max-w-sm">
        <Link to="/ztp/unclaimed" className="text-brand hover:underline">Claim unclaimed assets</Link> to
        bind hardware to planned logical nodes. The device then fetches its bootstrap config over DHCP, a worker
        discovers what it is, and once its identity is approved it is ready to be provisioned.
      </p>
    </div>
  )
}

// Slides in over the page, so nothing underneath moves when a row is opened.
function Drawer({ onClose, children }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div className="absolute inset-0 z-20 bg-black/20" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 z-30 w-full max-w-md bg-surface border-l border-edge shadow-2xl overflow-auto">
        {children}
      </aside>
    </>
  )
}

export default function OverviewPage() {
  const navigate = useNavigate()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const selectedNode = params.node ? Number(params.node) : null

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

  const showingCalls = params.stage === 'discovering'

  const { data, isLoading: nodesLoading } = useQuery({
    queryKey: ['ztp', 'pipeline', params.stage],
    queryFn: () => fetchZtpNodes(
      params.stage === 'stalled' ? { stalled: true } : { stage: params.stage || undefined },
    ),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
    enabled: !showingCalls,
  })

  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['ztp', 'calls', 'discovering'],
    queryFn: fetchDiscoveringCalls,
    refetchInterval: REFRESH_MS,
    enabled: showingCalls,
  })

  const rows = showingCalls ? calls : data?.items ?? []
  const isLoading = showingCalls ? callsLoading : nodesLoading
  const total = showingCalls ? calls.length : data?.total ?? 0

  const filterStage = key => setParams({ stage: params.stage === key ? '' : key })
  const closeDrawer = () => setParams({ node: '' })

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <h1 className="text-sm font-semibold text-content">Zero Touch Provisioning — Overview</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <PipelineStrip
          counts={stageCounts}
          active={params.stage}
          onSelect={stage => filterStage(stage.key)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-4 items-start">
          <Card
            title={params.stage ? STAGE_LABELS[params.stage] ?? params.stage : 'Pipeline'}
            className="min-w-0"
            aside={
              <>
                {params.stage && (
                  <button
                    onClick={() => setParams({ stage: '' })}
                    className="inline-flex items-center gap-0.5 text-[11px] text-subtle hover:text-content"
                    title="Show the whole pipeline"
                  >
                    <X size={11} />clear
                  </button>
                )}
                <span className="ml-auto text-[11px] text-subtle">
                  {isLoading ? '' : `${total} ${showingCalls ? 'devices' : 'nodes'}`}
                </span>
                {showingCalls && (
                  <Link to="/ztp/discovery" className="text-[11px] text-brand hover:underline">Open Discovery →</Link>
                )}
              </>
            }
          >
            {!isLoading && rows.length === 0 ? (
              showingCalls
                ? <p className="py-12 text-center text-xs text-subtle">No device is being discovered right now.</p>
                : <EmptyActive stage={params.stage} />
            ) : showingCalls ? (
              <DataTable
                columns={CALL_COLUMNS}
                data={rows}
                isLoading={isLoading}
                rowKey="source_ip"
                onRowClick={row => navigate(`/ztp/discovery?stage=${row.stage}`)}
              />
            ) : (
              <DataTable
                columns={COLUMNS}
                data={rows}
                isLoading={isLoading}
                rowKey="node_id"
                onRowClick={row => setParams({ node: row.node_id })}
              />
            )}
          </Card>

          <div className="space-y-4">
            <AttentionCard counts={counts} active={params.stage} onSelect={filterStage} />
            <BacklogCard counts={counts} />
            <Card title="Fleet coverage">
              <Coverage counts={counts} />
            </Card>
          </div>
        </div>
      </div>

      {selectedNode != null && (
        <Drawer onClose={closeDrawer}>
          <ZtpNodePanel key={selectedNode} nodeId={selectedNode} onClose={closeDrawer} />
        </Drawer>
      )}
    </div>
  )
}
