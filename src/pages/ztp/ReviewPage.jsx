import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { ShieldCheck, AlertTriangle, Check, X } from 'lucide-react'
import { fetchDiscoveries, fetchDiscovery, reviewDiscovery } from '../../api/ztp'
import { useQueryParams } from '../../hooks/useQueryParams'
import { formatTime } from '../../components/jobs/jobs'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'

const REFRESH_MS = 15_000

const DEFAULTS = { review_status: 'unreviewed', id: '', limit: 50, offset: 0 }

const TABS = [
  { value: 'unreviewed', label: 'To review' },
  { value: 'approved',   label: 'Approved' },
  { value: 'rejected',   label: 'Rejected' },
  { value: 'all',        label: 'All' },
]

const REVIEW_STYLES = {
  unreviewed: 'bg-amber-500/10 text-amber-400',
  approved:   'bg-green-500/10 text-green-400',
  rejected:   'bg-red-500/10 text-red-400',
}

// Reported facts set against the claimed asset, in the order a reviewer reads them.
const FACTS = [
  { key: 'serial_number',  label: 'Serial' },
  { key: 'vendor',         label: 'Vendor' },
  { key: 'hardware_model', label: 'Model' },
  { key: 'os',             label: 'OS' },
  { key: 'os_version',     label: 'OS version' },
]

const differs = (a, b) => a && b && a.toLowerCase() !== b.toLowerCase()

function ReviewBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${REVIEW_STYLES[status] ?? 'bg-surface-hi text-subtle'}`}>
      {status}
    </span>
  )
}

const nowrap = (content, cls = '') => <span className={`whitespace-nowrap ${cls}`}>{content}</span>

const COLUMNS = [
  { key: 'serial_number',  label: 'Serial',    render: v => nowrap(v, 'font-mono') },
  { key: 'source_ip',      label: 'Source IP', render: v => nowrap(v, 'font-mono') },
  { key: 'node_hostname',  label: 'Node',      render: v => (v ? nowrap(v) : nowrap('no match', 'text-subtle')) },
  { key: 'hardware_model', label: 'Hardware',  render: (v, row) => nowrap([row.vendor, v].filter(Boolean).join(' ') || '—') },
  { key: 'conflicts',      label: 'Conflicts', render: v => v.length
    ? <span className="inline-flex items-center gap-1 text-amber-400"><AlertTriangle size={11} />{v.length}</span>
    : <span className="text-subtle">—</span> },
  { key: 'review_status',  label: 'Review',    render: v => <ReviewBadge status={v} /> },
  { key: 'created_at',     label: 'Reported',  render: v => nowrap(formatTime(v)) },
]

function Section({ title, children }) {
  return (
    <div className="px-4 py-3 border-b border-edge">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
      {children}
    </div>
  )
}

function Comparison({ discovery }) {
  const expected = discovery.expected
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-subtle">
          <th className="pb-1 text-left font-medium" />
          <th className="pb-1 text-left font-medium">Reported</th>
          {expected && <th className="pb-1 text-left font-medium">Asset</th>}
        </tr>
      </thead>
      <tbody>
        {FACTS.map(({ key, label }) => {
          const mismatch = differs(discovery[key], expected?.[key])
          return (
            <tr key={key} className={mismatch ? 'text-amber-400' : 'text-content'}>
              <td className="py-0.5 pr-2 text-subtle">{label}</td>
              <td className="py-0.5 pr-2 font-mono break-all">{discovery[key] ?? '—'}</td>
              {expected && <td className="py-0.5 font-mono break-all">{expected[key] ?? '—'}</td>}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Actions({ discovery }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const mutation = useMutation({
    mutationFn: action => reviewDiscovery(discovery.id, action),
    onSuccess: () => ['ztp', 'nodes'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] })),
    onSettled: () => setConfirming(false),
  })

  if (discovery.review_status !== 'unreviewed') {
    return (
      <p className="text-xs text-subtle">
        {discovery.review_status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
        <span className="text-content">{discovery.reviewed_by ?? '—'}</span> · {formatTime(discovery.reviewed_at)}
      </p>
    )
  }

  const conflicts = discovery.conflicts.length
  const canApprove = discovery.node_id != null
  // Conflicts don't block approval, but take a second, deliberate click.
  const approve = () => (conflicts && !confirming ? setConfirming(true) : mutation.mutate('approve'))

  return (
    <div className="space-y-2">
      {!canApprove && (
        <p className="text-[11px] text-subtle">
          No node awaits this serial. <Link to="/ztp/unclaimed" className="text-brand hover:underline">Claim its asset</Link> and
          wait for the device to be discovered again, or reject this report.
        </p>
      )}
      {canApprove && (
        <p className="text-[11px] text-subtle">
          Approving trusts that <span className="font-mono text-content">{discovery.source_ip}</span> is{' '}
          <span className="text-content">{discovery.node_hostname ?? `node ${discovery.node_id}`}</span>: full
          configuration will be pushed to it.
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={approve}
          disabled={!canApprove || mutation.isPending}
          className={[
            'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded text-white transition-colors disabled:opacity-40',
            confirming ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand hover:bg-brand/90',
          ].join(' ')}
        >
          <Check size={12} />
          {confirming ? `Approve despite ${conflicts} conflict${conflicts === 1 ? '' : 's'}` : 'Approve'}
        </button>
        <button
          onClick={() => mutation.mutate('reject')}
          disabled={mutation.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
        >
          <X size={12} />
          Reject
        </button>
      </div>
      {mutation.isError && (
        <p className="text-[11px] text-red-400">
          {typeof mutation.error.detail === 'string' ? mutation.error.detail : mutation.error.message}
        </p>
      )}
    </div>
  )
}

function Detail({ id, onSelect }) {
  const { data: discovery, isLoading, isError } = useQuery({
    queryKey: ['ztp', 'discovery', id],
    queryFn: () => fetchDiscovery(id),
    refetchInterval: REFRESH_MS,
  })

  if (isLoading) return <p className="px-4 py-3 text-xs text-subtle animate-pulse">Loading…</p>
  if (isError || !discovery) return <p className="px-4 py-3 text-xs text-red-400">Discovery {id} could not be loaded.</p>

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-edge">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-heading font-mono">{discovery.serial_number}</span>
          <ReviewBadge status={discovery.review_status} />
          <button onClick={() => onSelect('')} className="ml-auto text-subtle hover:text-content" title="Close">
            <X size={13} />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-subtle">
          The device at <span className="font-mono text-content">{discovery.source_ip}</span> says it is this serial.
        </p>
      </div>

      <Section title="Node">
        {discovery.node_id != null ? (
          <Link to={`/network/nodes/${discovery.node_id}`} className="text-xs text-brand hover:underline">
            {discovery.node_hostname ?? `Node ${discovery.node_id}`}
          </Link>
        ) : (
          <p className="text-xs text-subtle">No claimed node matches this serial.</p>
        )}
      </Section>

      <Section title="Reported vs. asset">
        <Comparison discovery={discovery} />
      </Section>

      {discovery.conflicts.length > 0 && (
        <Section title={`Conflicts (${discovery.conflicts.length})`}>
          <ul className="space-y-1.5">
            {discovery.conflicts.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                <span className="flex-1">{c.message}</span>
                {c.discovery_id != null && (
                  <button onClick={() => onSelect(c.discovery_id)} className="shrink-0 text-[11px] text-brand hover:underline">
                    View
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Discovery">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-subtle">Reported</dt>
          <dd className="text-content">{formatTime(discovery.created_at)}</dd>
          <dt className="text-subtle">Job</dt>
          <dd>
            {discovery.job_id != null
              ? <Link to={`/activity/jobs/${discovery.job_id}`} className="text-brand hover:underline">#{discovery.job_id}</Link>
              : <span className="text-subtle">—</span>}
          </dd>
        </dl>
      </Section>

      <div className="px-4 py-3">
        <Actions key={discovery.id} discovery={discovery} />
      </div>
    </div>
  )
}

function EmptyState({ status }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShieldCheck size={28} className="text-subtle mb-3" />
      <h2 className="text-sm font-medium text-content">{status === 'unreviewed' ? 'Nothing to review' : 'No discoveries'}</h2>
      <p className="mt-1 text-xs text-subtle max-w-sm">
        When a device fetches its bootstrap, a worker logs in and reports what it is. Each report shows up here
        for an administrator to approve before the device gets its full configuration.
      </p>
    </div>
  )
}

export default function ReviewPage() {
  const [params, setParams] = useQueryParams(DEFAULTS)
  const selectedId = params.id ? Number(params.id) : null

  const { data, isLoading } = useQuery({
    queryKey: ['ztp', 'discoveries', params.review_status, params.limit, params.offset],
    queryFn: () => fetchDiscoveries({
      review_status: params.review_status === 'all' ? undefined : params.review_status,
      limit: params.limit,
      offset: params.offset,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  })
  const rows = data?.items ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Approvals"
        description="What discovered devices say they are. Nothing is configured until an administrator approves it."
      />

      <div className="flex items-center gap-1 px-6 py-2 border-b border-edge shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setParams({ review_status: tab.value, offset: 0, id: '' })}
            className={[
              'px-2.5 py-1 text-xs rounded transition-colors',
              params.review_status === tab.value ? 'bg-surface-hi text-content font-medium' : 'text-subtle hover:text-content',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-subtle">{isLoading ? '—' : `${data?.total ?? 0} discoveries`}</span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {!isLoading && rows.length === 0 ? (
            <EmptyState status={params.review_status} />
          ) : (
            <DataTable
              columns={COLUMNS}
              data={rows}
              isLoading={isLoading}
              onRowClick={row => setParams({ id: row.id })}
            />
          )}
          <Pagination
            offset={params.offset}
            limit={params.limit}
            total={data?.total ?? 0}
            onChange={offset => setParams({ offset })}
          />
        </div>

        {selectedId != null && (
          <div className="w-96 shrink-0 border-l border-edge bg-surface overflow-auto">
            <Detail key={selectedId} id={selectedId} onSelect={id => setParams({ id })} />
          </div>
        )}
      </div>
    </div>
  )
}
