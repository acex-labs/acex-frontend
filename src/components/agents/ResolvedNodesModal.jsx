import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiFetch } from '../../api/client'

export default function ResolvedNodesModal({ resolvedNodes = [], explicitNodes = [], onClose }) {
  const [filter, setFilter] = useState('')
  const explicitSet = new Set(explicitNodes)
  const resolvedSet = new Set(resolvedNodes)

  const explicitCount = resolvedNodes.filter(id => explicitSet.has(id)).length
  const ruleCount = resolvedNodes.length - explicitCount

  // Fetch full node details for all resolved nodes
  const { data: nodeData, isLoading } = useQuery({
    queryKey: ['nodes-for-resolved', resolvedNodes],
    queryFn: () =>
      apiFetch(`/api/v1/inventory/node_instances?limit=10000`)
        .then(d => {
          const all = d.items ?? (Array.isArray(d) ? d : [])
          // Build a map of only the resolved nodes
          const map = new Map()
          all.forEach(n => { if (resolvedSet.has(n.id)) map.set(n.id, n) })
          return map
        }),
    staleTime: 30000,
  })

  const q = filter.trim().toLowerCase()
  const rows = resolvedNodes
    .map(id => ({ id, node: nodeData?.get(id) ?? null }))
    .filter(({ id, node }) => {
      if (!q) return true
      return (
        String(id).includes(q) ||
        (node?.hostname || '').toLowerCase().includes(q) ||
        (node?.site || '').toLowerCase().includes(q) ||
        (node?.role || '').toLowerCase().includes(q) ||
        (node?.status || '').toLowerCase().includes(q)
      )
    })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-canvas border border-edge rounded-xl w-[760px] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
          <div>
            <h3 className="text-sm font-semibold text-content">Resolved Nodes</h3>
            <p className="text-[11px] text-subtle mt-0.5">
              {resolvedNodes.length} total
              {explicitCount > 0 && ` · ${explicitCount} explicit`}
              {ruleCount > 0 && ` · ${ruleCount} by rules`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Filter */}
        <div className="px-5 py-2.5 border-b border-edge">
          <input
            type="text"
            placeholder="Filter by hostname, site, role, status, ID…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            autoFocus
            className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 transition-colors"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="sticky top-0 bg-canvas border-b border-edge z-10">
                {['ID', 'Hostname', 'Site', 'Role', 'Status', 'Source'].map(col => (
                  <th key={col} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-edge/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-2.5">
                        <div className="h-2.5 rounded bg-surface-hi animate-pulse" style={{ width: `${50 + ((i * 6 + j) % 5) * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-subtle">No nodes match</td>
                </tr>
              ) : (
                rows.map(({ id, node }) => {
                  const isExplicit = explicitSet.has(id)
                  return (
                    <tr key={id} className="border-b border-edge/50 hover:bg-surface-hi transition-colors">
                      <td className="px-4 py-2.5 text-xs font-mono text-subtle">#{id}</td>
                      <td className="px-4 py-2.5 text-xs text-content font-medium">{node?.hostname ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-content">{node?.site ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-subtle">{node?.role ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {node?.status ? (
                          <span className="text-subtle">{node.status}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={[
                          'text-[10px] px-2 py-0.5 rounded-full border',
                          isExplicit
                            ? 'text-blue-400 bg-blue-400/8 border-blue-400/20'
                            : 'text-purple-400 bg-purple-400/8 border-purple-400/20',
                        ].join(' ')}>
                          {isExplicit ? 'explicit' : 'rule'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-edge">
          <span className="text-[11px] text-subtle">{rows.length} of {resolvedNodes.length} shown</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
