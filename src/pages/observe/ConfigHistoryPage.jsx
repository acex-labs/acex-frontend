import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNodes } from '../../api/inventory'
import ConfigHistory from '../../components/config/ConfigHistory'

export default function ConfigHistoryPage() {
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['nodes-for-config-history', search],
    queryFn: () => fetchNodes({ hostname: search || undefined, limit: 100 }),
    staleTime: 30_000,
  })

  const nodes = data?.items ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <h1 className="text-sm font-semibold text-content">Config History</h1>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Node selector panel */}
        <div className="w-56 shrink-0 flex flex-col border-r border-edge bg-surface">
          <div className="px-3 py-3 border-b border-edge shrink-0">
            <input
              type="search"
              placeholder="Filter nodes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-hi border border-edge rounded focus:outline-none focus:border-brand/60 text-content placeholder:text-subtle"
            />
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {isLoading && (
              <div className="px-3 py-2 text-xs text-subtle animate-pulse">Loading…</div>
            )}
            {!isLoading && nodes.length === 0 && (
              <div className="px-3 py-2 text-xs text-subtle">No nodes found.</div>
            )}
            {nodes.map(node => (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={[
                  'w-full text-left px-3 py-1.5 text-xs transition-colors',
                  selectedNodeId === node.id
                    ? 'bg-brand/10 text-brand'
                    : 'text-content hover:bg-surface-hi',
                ].join(' ')}
              >
                <div className="truncate font-medium">{node.hostname}</div>
                {node.site && (
                  <div className="truncate text-subtle">{node.site}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {!selectedNodeId ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-subtle">Select a node to view its configuration history.</p>
            </div>
          ) : (
            <ConfigHistory nodeId={selectedNodeId} key={selectedNodeId} />
          )}
        </div>
      </div>
    </div>
  )
}
