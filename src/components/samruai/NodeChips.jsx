import { useQueries } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchNode } from '../../api/inventory'

// The ACEX nodes (network module, node_instances) a triage is about, looked up by id in the frontend: the hostname
// comes from the shared node cache, and a node that is gone or not yet loaded shows as "#id".
function useNodeNames(ids) {
  const unique = [...new Set(ids)].sort((a, b) => a - b)
  const queries = useQueries({
    queries: unique.map(id => ({
      queryKey: ['node', String(id)],
      queryFn: () => fetchNode(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  })
  return Object.fromEntries(
    unique.map((id, i) => [
      id,
      // fetchNode gives the raw node_instance: the hostname may sit on its logical node, as normalizeNode does in the api layer.
      queries[i].data?.hostname ?? queries[i].data?.logical_node?.hostname,
    ]),
  )
}

function Chip({ id, name, onRemove }) {
  const label = name ?? `#${id}`
  return (
    <span className="nodrag nowheel inline-flex items-center gap-0.5 pl-1.5 pr-1 py-0.5 text-[10px] rounded border border-edge bg-surface text-content hover:border-brand/60 max-w-[10rem]">
      <Link to={`/network/nodes/${id}`} className="truncate min-w-0" title={name ? `ACEX node: ${label}` : 'ACEX node'}>
        {label}
      </Link>
      {onRemove && (
        <button onClick={() => onRemove(id)} className="text-subtle hover:text-red-400 shrink-0" title="Remove">
          <X size={9} />
        </button>
      )}
    </span>
  )
}

export default function NodeChips({ ids, onRemove, className = '' }) {
  const names = useNodeNames(ids)
  if (ids.length === 0) return null
  return (
    <span className={`flex flex-wrap gap-1 min-w-0 ${className}`}>
      {ids.map(id => <Chip key={id} id={id} name={names[id]} onRemove={onRemove} />)}
    </span>
  )
}

// The triage's nodes not yet on the observation: click one to mark the observation as seen on it.
export function NodeToggle({ availableIds, selectedIds, onToggle }) {
  const names = useNodeNames(availableIds)
  const rest = availableIds.filter(id => !selectedIds.includes(id))
  if (rest.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {rest.map(id => (
        <button key={id} onClick={() => onToggle(id)} title={`Mark as observed on ${names[id] ?? `node ${id}`}`}
          className="nodrag nowheel inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border border-dashed border-edge bg-surface text-subtle hover:text-brand hover:border-brand/60 max-w-[10rem]">
          <Plus size={9} className="shrink-0" /> <span className="truncate min-w-0">{names[id] ?? `#${id}`}</span>
        </button>
      ))}
    </div>
  )
}
