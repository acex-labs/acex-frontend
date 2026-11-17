import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchCollectionAgentCollection, fetchNodes } from '../../api/inventory'
import { Age } from '../config/ConfigSync'
import { CollectionBadge } from '../nodes/NodeStatusBadge'
import { COLLECTION_REASONS } from '../nodes/nodeStatus'

const SHOWN = 50

function Count({ value, label, className }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-base font-bold tabular-nums ${className}`}>{value}</span>
      <span className="text-[10px] text-subtle uppercase tracking-wide">{label}</span>
    </div>
  )
}

// What the nodes whose last attempt this agent made look like: how many were collected, how many were not and why, and
// which nodes they are. The numbers come from what the agent reports after each round.
export default function AgentCollectionPanel({ agentId }) {
  const { data: summary } = useQuery({
    queryKey: ['collection-agent-collection', agentId],
    queryFn: () => fetchCollectionAgentCollection(agentId),
    refetchInterval: 30_000,
  })
  const failing = (summary?.not_collected ?? 0) > 0
  const { data: failed } = useQuery({
    queryKey: ['nodes', { collection_agent_id: agentId, collection_status: 'failing', limit: SHOWN }],
    queryFn: () => fetchNodes({
      collection_agent_id: agentId, collection_status: 'failing', sort: 'hostname', order: 'asc', limit: SHOWN,
    }),
    enabled: failing,
    refetchInterval: 30_000,
  })

  if (!summary) return <p className="text-xs text-subtle">Loading…</p>
  if (summary.collected + summary.not_collected === 0) {
    return <p className="text-xs text-subtle">This agent has not reported on any node yet.</p>
  }

  const reasons = Object.entries(summary.by_category).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-6">
        <Count value={summary.collected} label="collected" className="text-emerald-400" />
        <Count value={summary.not_collected} label="not collected" className={failing ? 'text-red-400' : 'text-subtle'} />
      </div>

      {failing && (
        <div className="flex flex-wrap gap-1.5">
          {reasons.map(([category, count]) => (
            <span key={category} className="text-[11px] px-2 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 tabular-nums">
              {count} {(COLLECTION_REASONS[category] ?? category).toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {failing && failed && (
        <div>
          <div className="max-h-72 overflow-auto border border-edge rounded">
            <table className="w-full text-xs">
              <tbody>
                {failed.items.map(node => (
                  <tr key={node.id} className="border-b border-edge last:border-0">
                    <td className="px-3 py-1.5">
                      <Link to={`/network/nodes/${node.id}`} className="text-brand hover:text-brand/80 transition-colors">
                        {node.hostname}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5"><CollectionBadge collection={node.collection} /></td>
                    <td className="px-3 py-1.5 text-subtle text-right">
                      {node.collection?.failing_since ? <>since <Age iso={node.collection.failing_since} /></> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {failed.total > failed.items.length && (
            <p className="text-[11px] text-subtle mt-1.5">Showing {failed.items.length} of {failed.total}</p>
          )}
        </div>
      )}
    </div>
  )
}
