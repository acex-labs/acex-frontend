import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, X, Plus, ArrowRight, Ban } from 'lucide-react'
import { fetchDiscovery, approveDiscovery, approveDiscoveries, rejectDiscoveries } from '../../api/ztp'
import { formatTime } from '../jobs/jobs'

const REFRESH_MS = 5000

const REVIEW_STYLES = {
  unreviewed: 'bg-amber-500/10 text-amber-400',
  approved:   'bg-green-500/10 text-green-400',
  rejected:   'bg-red-500/10 text-red-400',
}

// What approving does to the asset with the reported serial.
const ACTIONS = {
  create:    { label: 'Create asset', cls: 'bg-brand/10 text-brand' },
  update:    { label: 'Update asset', cls: 'bg-amber-500/10 text-amber-400' },
  unchanged: { label: 'Asset matches', cls: 'bg-surface-hi text-subtle' },
  blocked:   { label: 'Blocked',      cls: 'bg-red-500/10 text-red-400' },
}

const ASSET_FIELDS = [
  { key: 'serial_number',  label: 'Serial' },
  { key: 'vendor',         label: 'Vendor' },
  { key: 'hardware_model', label: 'Model' },
  { key: 'os',             label: 'OS' },
  { key: 'os_version',     label: 'OS version' },
  { key: 'ned_id',         label: 'NED' },
]

const errorText = error => (typeof error?.detail === 'string' ? error.detail : error?.message)

function Badge({ cls, children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${cls}`}>
      {children}
    </span>
  )
}

const ReviewBadge = ({ status }) => <Badge cls={REVIEW_STYLES[status] ?? 'bg-surface-hi text-subtle'}>{status}</Badge>

const ActionBadge = ({ action }) => <Badge cls={ACTIONS[action]?.cls}>{ACTIONS[action]?.label ?? action}</Badge>

function Section({ title, children }) {
  return (
    <div className="px-4 py-3 border-b border-edge">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
      {children}
    </div>
  )
}

// The changes an update writes: current value, then what the device reported.
function Changes({ changes }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {changes.map(c => (
          <tr key={c.field} className="text-amber-400">
            <td className="py-0.5 pr-2 text-subtle whitespace-nowrap">{ASSET_FIELDS.find(f => f.key === c.field)?.label ?? c.field}</td>
            <td className="py-0.5 pr-1 font-mono break-all line-through decoration-amber-400/50">{c.current ?? '—'}</td>
            <td className="py-0.5 pr-1"><ArrowRight size={10} /></td>
            <td className="py-0.5 font-mono break-all">{c.reported ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AssetFields({ asset }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {ASSET_FIELDS.map(({ key, label }) => (
        <div key={key} className="contents">
          <dt className="text-subtle">{label}</dt>
          <dd className="font-mono text-content break-all">{asset[key] ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

const assetLink = id => <Link to={`/network/assets/${id}`} className="text-brand hover:underline">asset #{id}</Link>

// What approval does to the asset, exactly as the backend will do it.
function Proposal({ proposal }) {
  switch (proposal.action) {
    case 'create':
      return (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-brand">
            <Plus size={12} />No asset has this serial. Approving creates one:
          </p>
          <AssetFields asset={proposal.asset} />
        </div>
      )
    case 'update':
      return (
        <div className="space-y-2">
          <p className="text-xs text-amber-400">Approving writes what the device reported to {assetLink(proposal.asset_id)}:</p>
          <Changes changes={proposal.changes} />
        </div>
      )
    case 'unchanged':
      return <p className="text-xs text-subtle">{assetLink(proposal.asset_id)} already matches what the device reported.</p>
    default:
      return (
        <ul className="space-y-1">
          {proposal.blocked_by.map((reason, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-red-400">
              <Ban size={11} className="mt-0.5 shrink-0" />{reason}
            </li>
          ))}
        </ul>
      )
  }
}

function invalidate(queryClient) {
  ['ztp', 'assets', 'inventory'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }))
}

// Rejecting a report also rejects the older ones still waiting from the same device (olderIds), so they don't
// come back for review. Approving needs no such help: the backend rejects the serial's other reports itself.
function Actions({ discovery, olderIds }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const mutation = useMutation({
    mutationFn: async action => {
      if (action === 'approve') return approveDiscovery(discovery.id, discovery.proposal?.hash)
      const { results } = await rejectDiscoveries([discovery.id, ...olderIds])
      const own = results.find(r => r.discovery_id === discovery.id)
      if (own?.outcome === 'skipped') throw new Error(own.reason)
    },
    onSuccess: () => invalidate(queryClient),
    onError: () => invalidate(queryClient),
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
  const blocked = discovery.proposal?.action === 'blocked'
  // Conflicts don't block approval, but take a second, deliberate click.
  const approve = () => (conflicts && !confirming ? setConfirming(true) : mutation.mutate('approve'))

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-subtle">
        The worker logged in at <span className="font-mono text-content">{discovery.source_ip}</span> and the device
        there said it is <span className="font-mono text-content">{discovery.serial_number}</span>. Approving trusts
        that identity. No configuration is pushed: provisioning is a step of its own.
      </p>
      {olderIds.length > 0 && (
        <p className="text-[11px] text-subtle">
          {olderIds.length} older report{olderIds.length === 1 ? '' : 's'} from this device {olderIds.length === 1 ? 'is' : 'are'} rejected along with this one.
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={approve}
          disabled={blocked || mutation.isPending}
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
      {mutation.isError && <p className="text-[11px] text-red-400">{errorText(mutation.error)}</p>}
    </div>
  )
}

// One discovery: what approving it would do, its conflicts, and the approve and reject buttons.
export function DiscoveryReview({ id, olderIds = [], onSelect }) {
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

      {discovery.proposal ? (
        <Section title="On approval">
          <Proposal proposal={discovery.proposal} />
        </Section>
      ) : (
        <Section title="Reported">
          <AssetFields asset={discovery} />
          {discovery.asset_id != null && <p className="mt-2 text-xs text-subtle">Approved as {assetLink(discovery.asset_id)}.</p>}
        </Section>
      )}

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
                {c.node_id != null && (
                  <Link to={`/network/nodes/${c.node_id}`} className="shrink-0 text-[11px] text-brand hover:underline">Node</Link>
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
          <dt className="text-subtle">Node</dt>
          <dd>
            {discovery.node_id != null
              ? <Link to={`/network/nodes/${discovery.node_id}`} className="text-brand hover:underline">{discovery.node_hostname ?? `Node ${discovery.node_id}`}</Link>
              : <span className="text-subtle">Not bound to a node</span>}
          </dd>
        </dl>
      </Section>

      <div className="px-4 py-3">
        <Actions key={discovery.id} discovery={discovery} olderIds={olderIds} />
      </div>
    </div>
  )
}

const SUMMARY_ORDER = ['create', 'update', 'unchanged', 'skipped', 'approved', 'rejected']

function Summary({ summary }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SUMMARY_ORDER.filter(k => summary[k]).map(k => (
        <Badge key={k} cls={ACTIONS[k]?.cls ?? (k === 'skipped' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400')}>
          {summary[k]} {k}
        </Badge>
      ))}
    </div>
  )
}

function SkippedList({ results, byId }) {
  const skipped = results.filter(r => r.outcome === 'skipped')
  if (!skipped.length) return null
  return (
    <ul className="mt-2 space-y-1">
      {skipped.map(r => (
        <li key={r.discovery_id} className="text-[11px] text-red-400">
          <span className="font-mono">{byId[r.discovery_id]?.serial_number ?? `#${r.discovery_id}`}</span>: {r.reason}
        </li>
      ))}
    </ul>
  )
}

// Selected discoveries: a dry run shows what approving them all would do, and only that is approved — each item
// carries the hash of the proposal shown. rows: the selected discoveries, each with olderIds to reject with it.
export function BulkReview({ rows, onDone, onClose }) {
  const queryClient = useQueryClient()
  const byId = Object.fromEntries(rows.map(r => [r.id, r]))
  const items = rows.map(r => ({ discovery_id: r.id, proposal_hash: r.proposal?.hash ?? null }))

  const preview = useQuery({
    queryKey: ['ztp-bulk-preview', items],
    queryFn: () => approveDiscoveries(items, { dryRun: true }),
    refetchOnWindowFocus: false,
  })
  const approve = useMutation({
    mutationFn: () => approveDiscoveries(
      preview.data.results.filter(r => r.outcome === 'would_approve')
        .map(r => ({ discovery_id: r.discovery_id, proposal_hash: r.proposal.hash })),
    ),
    onSettled: () => invalidate(queryClient),
  })
  const reject = useMutation({
    mutationFn: () => rejectDiscoveries(rows.flatMap(r => [r.id, ...r.olderIds])),
    onSettled: () => invalidate(queryClient),
  })

  const result = approve.data ?? reject.data
  const approvable = preview.data?.results.filter(r => r.outcome === 'would_approve').length ?? 0
  const busy = approve.isPending || reject.isPending

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-edge flex items-center gap-2">
        <span className="text-sm font-semibold text-heading">{rows.length} selected</span>
        <button onClick={onClose} className="ml-auto text-subtle hover:text-content" title="Close"><X size={13} /></button>
      </div>

      {result ? (
        <Section title="Done">
          <Summary summary={result.summary} />
          <SkippedList results={result.results} byId={byId} />
          <button onClick={onDone} className="mt-3 px-3 py-1.5 text-xs rounded bg-surface-hi text-content hover:bg-edge">
            Clear selection
          </button>
        </Section>
      ) : (
        <>
          <Section title="On approval">
            {preview.isLoading && <p className="text-xs text-subtle animate-pulse">Working out what would happen…</p>}
            {preview.isError && <p className="text-xs text-red-400">{errorText(preview.error)}</p>}
            {preview.data && (
              <div className="space-y-3">
                <Summary summary={preview.data.summary} />
                <ul className="space-y-2">
                  {preview.data.results.map(r => (
                    <li key={r.discovery_id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-content">{byId[r.discovery_id]?.serial_number ?? `#${r.discovery_id}`}</span>
                        <span className="font-mono text-subtle">{byId[r.discovery_id]?.source_ip}</span>
                        <span className="ml-auto">
                          {r.outcome === 'skipped' ? <Badge cls="bg-red-500/10 text-red-400">skipped</Badge> : <ActionBadge action={r.proposal.action} />}
                        </span>
                      </div>
                      {r.outcome === 'skipped' && <p className="mt-0.5 text-[11px] text-red-400">{r.reason}</p>}
                      {r.outcome !== 'skipped' && r.proposal.action === 'create' && (
                        <p className="mt-0.5 text-[11px] text-subtle">
                          {[r.proposal.asset.vendor, r.proposal.asset.hardware_model, r.proposal.asset.os_version].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {r.outcome !== 'skipped' && r.proposal.action === 'update' && (
                        <div className="mt-0.5"><Changes changes={r.proposal.changes} /></div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
          <div className="px-4 py-3 space-y-2">
            <p className="text-[11px] text-subtle">
              Discoveries with an identity conflict are skipped; approve them one at a time. No configuration is pushed.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => approve.mutate()}
                disabled={!approvable || busy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-40"
              >
                <Check size={12} />Approve {approvable}
              </button>
              <button
                onClick={() => reject.mutate()}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              >
                <X size={12} />Reject {rows.length}
              </button>
            </div>
            {(approve.isError || reject.isError) && (
              <p className="text-[11px] text-red-400">{errorText(approve.error ?? reject.error)}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
