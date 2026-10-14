import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Radar, ChevronRight, ChevronDown, RotateCw, AlertTriangle, Network } from 'lucide-react'
import { fetchCalls, fetchDiscoveries, retryDiscovery, reviewOf, IDENTITY_CONFLICTS } from '../../api/ztp'
import { useQueryParams } from '../../hooks/useQueryParams'
import { formatTime } from '../../components/jobs/jobs'
import JobStateBadge from '../../components/jobs/JobStateBadge'
import PageHeader from '../../components/ui/PageHeader'
import { DiscoveryReview, BulkReview } from '../../components/ztp/DiscoveryReview'

// Devices come and go quickly while they boot.
const REFRESH_MS = 5000
// A call-in nobody has picked up for this long probably has no worker to go to.
const STALE_MS = 5 * 60_000

// stage: a tab below. prefix: IPv4 prefix length to group call-ins by, or 'none' for a flat list.
// id: the discovery shown in the review panel.
const DEFAULTS = { stage: '', prefix: '24', id: '' }

const PREFIXES = ['none', '16', '20', '22', '24', '26', '28']

// The first tabs follow discovery, the rest review. A device whose latest attempt failed can still have an
// earlier report waiting, so it shows under both Failed and To review.
const STAGES = [
  { value: '',            label: 'All',                match: () => true },
  { value: 'waiting',     label: 'Waiting for worker', match: call => call.stage === 'waiting' },
  { value: 'discovering', label: 'Discovering',        match: call => call.stage === 'discovering' },
  { value: 'failed',      label: 'Failed',             match: call => call.stage === 'failed' },
  { value: 'to_review',   label: 'To review',          match: (_, review) => review.status === 'unreviewed' },
  { value: 'approved',    label: 'Approved',           match: (_, review) => review.status === 'approved' },
  { value: 'rejected',    label: 'Rejected',           match: (_, review) => review.status === 'rejected' },
]

const STAGE_STYLES = {
  waiting:     'bg-surface-hi text-subtle',
  discovering: 'bg-brand/10 text-brand',
  failed:      'bg-red-500/10 text-red-400',
  reported:    'bg-green-500/10 text-green-400',
  unreviewed:  'bg-amber-500/10 text-amber-400',
  approved:    'bg-green-500/10 text-green-400',
  rejected:    'bg-red-500/10 text-red-400',
}

// Grouping is only a way to see devices that called in from the same network
// together; it says nothing about which site they are at.
function subnetOf(ip, prefix) {
  const v4 = ip.split('.').map(Number)
  if (v4.length === 4 && v4.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const address = v4.reduce((acc, n) => acc * 256 + n, 0)
    const size = 2 ** (32 - prefix)
    const base = Math.floor(address / size) * size
    const octets = [24, 16, 8, 0].map(shift => Math.floor(base / 2 ** shift) % 256)
    return { key: base, label: `${octets.join('.')}/${prefix}` }
  }
  // IPv6 is always grouped by /64: the first four groups of the expanded address.
  const [head, tail = ''] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
  const net = `${groups.slice(0, 4).map(g => parseInt(g || '0', 16).toString(16)).join(':')}::`
    .replace(/^0(:0)*::$/, '::').replace(/(:0)+::$/, '::')
  return { key: 2 ** 32 + parseInt(groups.slice(0, 4).map(g => g.padStart(4, '0')).join(''), 16), label: `${net}/64` }
}

const toDate = value => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)

function ago(value) {
  const minutes = Math.round((Date.now() - toDate(value)) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`
}

// A report waiting for review is what needs doing, so it shows over how the latest attempt went.
function StageBadge({ call, review }) {
  const stale = call.stage === 'waiting' && Date.now() - toDate(call.last_seen) > STALE_MS
  const shown = review.status === 'unreviewed' || call.stage === 'reported' ? review.status ?? call.stage : call.stage
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${STAGE_STYLES[shown]}`}>
        {shown === 'unreviewed' ? 'to review' : shown}
      </span>
      {stale && (
        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 whitespace-nowrap" title="Is a worker running for acex.ztp?">
          <AlertTriangle size={11} /> no worker has picked it up
        </span>
      )}
    </span>
  )
}

function Outcome({ call, review }) {
  const latest = call.attempts[0]
  if (call.stage === 'failed') {
    return <span className="text-red-400 line-clamp-1" title={latest.error ?? ''}>{latest.error ?? 'Failed'}</span>
  }
  if (review.target) return <span className="font-mono text-content">{review.target.serial_number}</span>
  return <span className="text-subtle">—</span>
}

function RetryButton({ call }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => retryDiscovery(call.source_ip),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ztp'] }),
  })
  if (call.stage !== 'failed') return null
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={e => { e.stopPropagation(); mutation.mutate() }}
        disabled={mutation.isPending}
        title="Queue discovery of this device again"
        className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-subtle hover:text-content hover:bg-surface-hi transition-colors disabled:opacity-50"
      >
        <RotateCw size={11} className={mutation.isPending ? 'animate-spin' : ''} />
        Retry
      </button>
      {mutation.isError && (
        <span className="w-56 text-right text-[11px] text-red-400">
          {typeof mutation.error.detail === 'string' ? mutation.error.detail : mutation.error.message}
        </span>
      )}
    </span>
  )
}

function Attempts({ call, onSelect }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-subtle">
          {['Job', 'State', 'Called in', 'Finished', 'Result', 'Review'].map(h => (
            <th key={h} className="pb-1 pr-4 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {call.attempts.map(a => (
          <tr key={a.job_id}>
            <td className="py-0.5 pr-4">
              <Link to={`/activity/jobs/${a.job_id}`} className="text-brand hover:underline">#{a.job_id}</Link>
            </td>
            <td className="py-0.5 pr-4"><JobStateBadge state={a.state} /></td>
            <td className="py-0.5 pr-4 text-content whitespace-nowrap">{formatTime(a.created_at)}</td>
            <td className="py-0.5 pr-4 text-subtle whitespace-nowrap">{formatTime(a.finished_at)}</td>
            <td className="py-0.5 pr-4">
              {a.serial_number
                ? <span className="font-mono text-content">{a.serial_number}</span>
                : a.error ? <span className="text-red-400">{a.error}</span> : <span className="text-subtle">—</span>}
            </td>
            <td className="py-0.5 pr-4">
              {a.discovery_id != null
                ? <button onClick={() => onSelect(a.discovery_id)} className="text-brand hover:underline">
                    {a.review_status === 'unreviewed' ? 'Review' : a.review_status}
                  </button>
                : <span className="text-subtle">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// label is the subnet, or null for an ungrouped list. selection: the checkboxes, only while reviewing.
function Group({ label, calls, columns, expanded, onToggle, selectedId, onSelect, selection }) {
  return (
    <>
      {label && (
        <tr className="bg-canvas">
          <td colSpan={columns} className="px-4 pt-4 pb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-subtle">
              <Network size={11} />
              <span className="font-mono">{label}</span>
              <span className="font-normal">· {calls.length} device{calls.length === 1 ? '' : 's'}</span>
            </span>
          </td>
        </tr>
      )}
      {calls.map(({ call, review }) => {
        const open = expanded.has(call.source_ip)
        const target = review.target?.discovery_id
        const active = target != null && target === selectedId
        return (
          <Fragment key={call.source_ip}>
            <tr
              onClick={() => (target != null ? onSelect(target) : onToggle(call.source_ip))}
              className={`border-b border-edge cursor-pointer transition-colors ${active ? 'bg-brand/10' : 'hover:bg-surface-hi'}`}
            >
              {selection && (
                <td className="pl-4 py-2.5 w-6" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selection.ids.has(target)} onChange={() => selection.onToggle(target)} />
                </td>
              )}
              <td
                className="pl-4 py-2.5 w-6 text-subtle hover:text-content"
                onClick={e => { e.stopPropagation(); onToggle(call.source_ip) }}
                title="Show every call-in"
              >
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </td>
              <td className="pr-4 py-2.5 text-xs font-mono text-content whitespace-nowrap">{call.source_ip}</td>
              <td className="px-4 py-2.5 text-xs"><StageBadge call={call} review={review} /></td>
              <td className="px-4 py-2.5 text-xs text-subtle whitespace-nowrap" title={formatTime(call.last_seen)}>{ago(call.last_seen)}</td>
              <td className="px-4 py-2.5 text-xs text-subtle whitespace-nowrap">
                {call.attempts.length} call{call.attempts.length === 1 ? '' : 's'}
              </td>
              <td className="px-4 py-2.5 text-xs max-w-xs"><Outcome call={call} review={review} /></td>
              <td className="px-4 py-2.5 text-right"><RetryButton call={call} /></td>
            </tr>
            {open && (
              <tr className="border-b border-edge bg-surface/50">
                <td colSpan={selection ? 2 : 1} />
                <td colSpan={6} className="pr-4 py-3">
                  <div className="mb-2 text-[11px] text-subtle">
                    Method <span className="text-content">{call.method}</span>
                  </div>
                  <Attempts call={call} onSelect={onSelect} />
                </td>
              </tr>
            )}
          </Fragment>
        )
      })}
    </>
  )
}

function EmptyState({ stage }) {
  if (stage) {
    const label = STAGES.find(s => s.value === stage)?.label.toLowerCase() ?? stage
    return <p className="py-24 text-center text-xs text-subtle">No devices in {label}.</p>
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Radar size={28} className="text-subtle mb-3" />
      <h2 className="text-sm font-medium text-content">No devices have called in</h2>
      <p className="mt-1 text-xs text-subtle max-w-sm">
        A factory-default device that gets ACE-X as its boot server over DHCP fetches its bootstrap and shows up
        here. A worker then logs in to find out what it is, and an administrator approves what it says it is.
      </p>
    </div>
  )
}

export default function DiscoveryPage() {
  const [params, setParams] = useQueryParams(DEFAULTS)
  const selectedId = params.id ? Number(params.id) : null
  const [expanded, setExpanded] = useState(new Set())
  const [selected, setSelected] = useState(() => new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const reviewing = params.stage === 'to_review'

  const { data, isLoading } = useQuery({
    queryKey: ['ztp', 'calls', 'all'],
    queryFn: () => fetchCalls({ limit: 1000 }),
    // Not while a bulk preview is open: the selection was built from these rows.
    refetchInterval: bulkOpen ? false : REFRESH_MS,
  })

  // The proposals and conflicts of reports waiting for review, for selecting what can be approved in bulk.
  const { data: waiting } = useQuery({
    queryKey: ['ztp', 'discoveries', 'unreviewed'],
    queryFn: () => fetchDiscoveries({ review_status: 'unreviewed', limit: 1000 }),
    refetchInterval: bulkOpen ? false : REFRESH_MS,
    enabled: reviewing,
  })
  const discoveries = useMemo(() => Object.fromEntries((waiting?.items ?? []).map(d => [d.id, d])), [waiting])

  const all = useMemo(() => (data?.items ?? []).map(call => ({ call, review: reviewOf(call) })), [data])
  const rows = useMemo(() => {
    const match = STAGES.find(s => s.value === params.stage)?.match ?? (() => true)
    return all.filter(r => match(r.call, r.review))
  }, [all, params.stage])

  // Subnets in address order, each keeping the most recently seen device first.
  const groups = useMemo(() => {
    if (params.prefix === 'none') return rows.length ? [{ label: null, calls: rows }] : []
    const bySubnet = new Map()
    for (const row of rows) {
      const { key, label } = subnetOf(row.call.source_ip, Number(params.prefix))
      const group = bySubnet.get(label) ?? { key, label, calls: [] }
      group.calls.push(row)
      bySubnet.set(label, group)
    }
    return [...bySubnet.values()].sort((a, b) => a.key - b.key)
  }, [rows, params.prefix])

  // Each discovery under review, with the older reports from its device that go with it on reject.
  const reviewed = useMemo(() => Object.fromEntries(all
    .filter(r => r.review.target)
    .map(r => [r.review.target.discovery_id, { call: r.call, olderIds: r.review.olderIds }])), [all])

  const toggle = ip => setExpanded(prev => {
    const next = new Set(prev)
    next.has(ip) ? next.delete(ip) : next.add(ip)
    return next
  })

  const clearSelection = () => { setSelected(new Set()); setBulkOpen(false) }
  const toggleSelected = id => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const reviewIds = rows.filter(r => r.review.target).map(r => r.review.target.discovery_id)
  const allSelected = reviewIds.length > 0 && reviewIds.every(id => selected.has(id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(reviewIds))

  // Approvable at a glance: no blocked proposal, no identity conflict.
  const selectClean = () => setSelected(new Set(reviewIds.filter(id => {
    const d = discoveries[id]
    return d?.proposal && d.proposal.action !== 'blocked' && !d.conflicts.some(c => IDENTITY_CONFLICTS.includes(c.kind))
  })))

  const bulkRows = [...selected].filter(id => reviewed[id]).map(id => ({
    id,
    serial_number: discoveries[id]?.serial_number,
    source_ip: reviewed[id].call.source_ip,
    proposal: discoveries[id]?.proposal,
    olderIds: reviewed[id].olderIds,
  }))

  const selection = reviewing ? { ids: selected, onToggle: toggleSelected } : null
  const headers = ['Source IP', 'Stage', 'Last seen', 'Calls', 'Result', '']
  const columns = headers.length + (selection ? 2 : 1)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Discovery"
        description="Devices that fetched a bootstrap, by IP. A worker logs in to each to find out what it is; approving what it says trusts that identity and records the asset."
      />

      <div className="flex items-center gap-1 px-6 py-2 border-b border-edge shrink-0">
        {STAGES.map(s => (
          <button
            key={s.value}
            onClick={() => { clearSelection(); setParams({ stage: s.value }) }}
            className={[
              'px-2.5 py-1 text-xs rounded transition-colors',
              params.stage === s.value ? 'bg-surface-hi text-content font-medium' : 'text-subtle hover:text-content',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
        {reviewing && rows.length > 0 && (
          <div className="ml-4 flex items-center gap-2">
            <button onClick={selectClean} className="px-2.5 py-1 text-xs rounded text-subtle hover:text-content">
              Select approvable
            </button>
            {bulkRows.length > 0 && (
              <button
                onClick={() => { setBulkOpen(true); setParams({ id: '' }) }}
                className="px-2.5 py-1 text-xs font-medium rounded text-white bg-brand hover:bg-brand/90"
              >
                Review {bulkRows.length} selected
              </button>
            )}
          </div>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-[11px] text-subtle">
          Group by subnet
          <select
            value={params.prefix}
            onChange={e => setParams({ prefix: e.target.value })}
            className="h-6 px-1.5 text-xs rounded border border-edge bg-surface-hi text-content focus:outline-none focus:border-brand/50"
          >
            {PREFIXES.map(p => <option key={p} value={p}>{p === 'none' ? 'None' : `/${p}`}</option>)}
          </select>
        </label>
        <span className="ml-3 text-[11px] text-subtle">{isLoading ? '—' : `${rows.length} devices`}</span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-auto min-w-0">
          {isLoading ? (
            <p className="px-6 py-4 text-xs text-subtle animate-pulse">Loading…</p>
          ) : groups.length === 0 ? (
            <EmptyState stage={params.stage} />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="sticky top-0 bg-canvas border-b border-edge z-10">
                  {selection && (
                    <th className="pl-4 w-6 text-left">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                  )}
                  <th className="w-6" />
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className={`${i === 0 ? 'pr-4' : 'px-4'} py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <Group
                    key={group.label ?? 'all'}
                    label={group.label}
                    calls={group.calls}
                    columns={columns}
                    expanded={expanded}
                    onToggle={toggle}
                    selectedId={selectedId}
                    onSelect={id => { setBulkOpen(false); setParams({ id }) }}
                    selection={selection}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {bulkOpen && bulkRows.length > 0 ? (
          <div className="w-[28rem] shrink-0 border-l border-edge bg-surface overflow-auto">
            <BulkReview
              key={bulkRows.map(r => r.id).join(',')}
              rows={bulkRows}
              onDone={clearSelection}
              onClose={() => setBulkOpen(false)}
            />
          </div>
        ) : selectedId != null && (
          <div className="w-96 shrink-0 border-l border-edge bg-surface overflow-auto">
            <DiscoveryReview
              key={selectedId}
              id={selectedId}
              olderIds={reviewed[selectedId]?.olderIds ?? []}
              onSelect={id => setParams({ id })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
