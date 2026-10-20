import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Check, Search } from 'lucide-react'
import { fetchLogicalNodes, updateNodeInstance } from '../../api/inventory'
import { useDebounce } from '../../hooks/useDebounce'

const INPUT_CLS = 'h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 transition-colors w-full'

const byPlan = (a, b) =>
  (a.site ?? '').localeCompare(b.site ?? '') ||
  (a.sequence ?? 0) - (b.sequence ?? 0) ||
  a.hostname.localeCompare(b.hostname)

function LogicalNodeRow({ ln, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-4 py-2.5 border-b border-edge/50 last:border-0 transition-colors',
        isSelected ? 'bg-brand/10' : 'hover:bg-surface-hi',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-content truncate">{ln.hostname}</span>
        {isSelected && <Check size={12} className="text-brand shrink-0" />}
      </div>
      <div className="mt-0.5 text-[11px] text-subtle truncate">{[ln.site, ln.role].filter(Boolean).join(' · ') || '—'}</div>
    </button>
  )
}

export default function ChangeLogicalNodeModal({ nodeId, currentHostname, onClose }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const q = useDebounce(search.trim(), 250)
  const site = useDebounce(siteFilter.trim(), 300)

  // Only logical nodes without a node instance can be picked, so a logical node never ends up with two nodes.
  const { data: planned = [], isLoading } = useQuery({
    queryKey: ['logical-nodes', 'unassigned', site],
    queryFn: () => fetchLogicalNodes({ assigned: false, site: site || undefined, limit: 1000 }).then(d => d.items),
  })

  const matches = useMemo(
    () => planned.filter(ln => !q || ln.hostname.toLowerCase().includes(q.toLowerCase())).sort(byPlan),
    [planned, q],
  )

  const mutation = useMutation({
    mutationFn: (ln) => updateNodeInstance(nodeId, { logical_node_id: ln.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node', String(nodeId)] })
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      queryClient.invalidateQueries({ queryKey: ['logical-nodes'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface border border-edge rounded-lg w-[540px] max-h-[600px] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">Change Logical Node</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-edge shrink-0 space-y-2">
          <div className="text-[11px] text-subtle">
            <span className="text-content font-medium">{currentHostname}</span> keeps its asset and management connections.
            Hostname, site, role and desired configuration come from the logical node you pick.
            Only logical nodes without a node are listed.
          </div>
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search hostname…"
              className={`${INPUT_CLS} pl-6`}
            />
          </div>
          <input
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
            placeholder="Site…"
            className={INPUT_CLS}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-xs text-subtle animate-pulse">Loading…</div>
          ) : matches.length === 0 ? (
            <div className="px-4 py-3 text-xs text-subtle">
              No unassigned logical nodes{q ? ' match' : site ? ' at this site' : ''}.
            </div>
          ) : (
            matches.map(ln => (
              <LogicalNodeRow
                key={ln.id}
                ln={ln}
                isSelected={selected?.id === ln.id}
                onClick={() => setSelected(ln)}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-edge shrink-0">
          {mutation.isError && (
            <span className="text-xs text-red-400">Failed to change logical node.</span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-subtle hover:text-content border border-edge rounded transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!selected || mutation.isPending}
              onClick={() => mutation.mutate(selected)}
              className="px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded disabled:opacity-40 transition-opacity"
            >
              {mutation.isPending ? 'Saving…' : 'Change Logical Node'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
