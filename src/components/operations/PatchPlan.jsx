import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, X } from 'lucide-react'
import { applyPatch, fetchRun } from '../../api/operations'
import JobStateBadge from '../jobs/JobStateBadge'
import { ApplyConfirmModal } from './ConfirmModals'
import { ChangeCounts, PatchChanges, PatchText } from './PatchParts'
import { FINISHED, orderError, planGroups, runProgress } from './runs'

// Nodes that would get the same patch: a row with how many and what changes, opening to the patch and the nodes,
// each of which can be left out.
function PatchGroup({ group, excluded, onExclude }) {
  const [open, setOpen] = useState(false)
  const ids = group.nodes.map(n => n.node_id)
  const chosen = ids.filter(id => !excluded.has(id)).length
  const toggleAll = () => onExclude(ids, chosen > 0)
  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <input
          type="checkbox"
          checked={chosen === ids.length}
          ref={el => el && (el.indeterminate = chosen > 0 && chosen < ids.length)}
          onChange={toggleAll}
        />
        <button onClick={() => setOpen(o => !o)} className="flex-1 flex items-center gap-2 text-left">
          <ChevronRight size={12} className={`shrink-0 text-subtle transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="text-xs font-semibold text-content tabular-nums">
            {chosen === ids.length ? ids.length : `${chosen} of ${ids.length}`} node{ids.length === 1 ? '' : 's'}
          </span>
          <ChangeCounts changes={group.changes} />
          <span className="ml-auto text-[11px] font-mono text-subtle truncate max-w-md">{group.patch.split('\n')[0]}</span>
        </button>
      </div>
      {open && (
        <div className="border-t border-edge">
          <PatchChanges changes={group.changes} />
          <PatchText patch={group.patch} />
          <div className="px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-edge">
            {group.nodes.map(n => (
              <label key={n.node_id} className="flex items-center gap-1.5 text-[11px] text-content">
                <input type="checkbox" checked={!excluded.has(n.node_id)} onChange={() => onExclude([n.node_id], !excluded.has(n.node_id))} />
                {n.hostname ?? `Node ${n.node_id}`}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// A rendered plan: progress while the nodes are read, then the nodes grouped by the patch each would get, so
// thousands of nodes read as a handful of patches. The nodes chosen from it are sent their patch on apply.
export default function PatchPlan({ planId, onApplied, onClose }) {
  const { data: run } = useQuery({
    queryKey: ['run', planId],
    queryFn: () => fetchRun(planId),
    refetchInterval: query => (FINISHED.includes(query.state.data?.state) ? false : 2000),
  })
  const [excluded, setExcluded] = useState(new Set())
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  if (!run) return null

  const groups = planGroups(run.responses)
  const progress = runProgress(run)
  const chosen = groups.patches.flatMap(g => g.nodes).filter(n => !excluded.has(n.node_id))
  const request = run.request ?? {}

  const exclude = (ids, leaveOut) => setExcluded(prev => {
    const next = new Set(prev)
    ids.forEach(id => (leaveOut ? next.add(id) : next.delete(id)))
    return next
  })

  const apply = async () => {
    setConfirming(false)
    setError(null)
    try {
      const ordered = await applyPatch(planId, chosen.map(n => n.node_id))
      onApplied(ordered.id)
    } catch (err) {
      setError(orderError(err))
    }
  }

  return (
    <section className="border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2 border-b border-edge flex items-center gap-2">
        <span className="text-[11px] font-semibold text-subtle uppercase tracking-wider">Plan {planId}</span>
        <span className="text-[11px] font-mono text-content">{request.path || 'whole tree'}</span>
        {request.prune && <span className="text-[10px] font-semibold uppercase text-red-400">prune</span>}
        <JobStateBadge state={run.state} />
        <button onClick={onClose} className="ml-auto text-subtle hover:text-content"><X size={14} /></button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex gap-4 text-[11px] text-subtle mb-1">
            <span>{progress.done} of {progress.total} nodes read</span>
            <span className="text-content">{groups.patches.reduce((a, g) => a + g.nodes.length, 0)} with a patch</span>
            <span>{groups.inSync.length} in sync</span>
            {groups.failed.length > 0 && <span className="text-red-400">{groups.failed.length} failed</span>}
          </div>
          <div className="h-1.5 bg-surface-hi rounded-full overflow-hidden">
            <div className="h-full bg-brand transition-all" style={{ width: `${(progress.done / (progress.total || 1)) * 100}%` }} />
          </div>
        </div>

        {groups.patches.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle">
              {groups.patches.length} distinct patch{groups.patches.length === 1 ? '' : 'es'}
            </div>
            {groups.patches.map(g => <PatchGroup key={g.hash} group={g} excluded={excluded} onExclude={exclude} />)}
          </div>
        )}

        {groups.failed.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Failed</div>
            {groups.failed.map(r => (
              <div key={r.job_id} className="text-[11px] font-mono truncate" title={r.error}>
                <span className="text-content">{r.hostname ?? `Node ${r.node_id}`}</span>
                <span className="text-red-400"> · {r.error?.split('\n')[0]}</span>
              </div>
            ))}
          </div>
        )}

        {FINISHED.includes(run.state) && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirming(true)}
              disabled={chosen.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply on {chosen.length} node{chosen.length === 1 ? '' : 's'}
            </button>
            <span className="text-[11px] text-subtle">
              Each node is read again first and patched only if it still renders the patch shown here.
            </span>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        )}
      </div>

      {confirming && (
        <ApplyConfirmModal
          path={request.path}
          prune={request.prune}
          patches={groups.patches.filter(g => g.nodes.some(n => !excluded.has(n.node_id))).length}
          hostnames={chosen.map(n => n.hostname ?? `Node ${n.node_id}`)}
          onConfirm={apply}
          onClose={() => setConfirming(false)}
        />
      )}
    </section>
  )
}
