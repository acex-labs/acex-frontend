import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { fetchAllNodes, fetchNodes } from '../../api/inventory'
import TableToolbar from '../table/TableToolbar'
import DataTable from '../table/DataTable'
import Pagination from '../table/Pagination'

const LIMIT = 25

const FILTERS = [
  { key: 'hostname', label: 'Hostname', width: '160px' },
  { key: 'site',     label: 'Site',     width: '120px' },
  { key: 'region',   label: 'Region',   width: '120px' },
  { key: 'vendor',   label: 'Vendor',   width: '120px' },
]

const COLUMNS = [
  { key: 'hostname', label: 'Hostname' },
  { key: 'site', label: 'Site' },
  { key: 'role', label: 'Role' },
  { key: 'ip', label: 'IP Address', render: (_, row) => row.management_connections?.[0]?.target_ip ?? '—' },
  { key: 'ned_id', label: 'Driver', render: v => v ?? '—' },
]

// Nodes to run operations on, found by hostname, site, region and vendor, one page at a time or every node the
// filters match at once. `selected` maps node id to the node, so a choice survives filtering and paging; which of
// them an operation can run on is the operation's to say.
export default function NodePicker({ selected, onChange }) {
  const [filters, setFilters] = useState({ hostname: '', site: '', region: '', vendor: '' })
  const [offset, setOffset] = useState(0)
  // Every node the current filters match, once fetched for selecting them all.
  const [matching, setMatching] = useState(null)
  const [fetchingAll, setFetchingAll] = useState(false)

  const query = { ...filters, offset, limit: LIMIT, sort: 'hostname', order: 'asc' }
  const { data, isFetching } = useQuery({
    queryKey: ['nodes', query],
    queryFn: () => fetchNodes(query),
    placeholderData: keepPreviousData,
  })
  const nodes = data?.items ?? []
  const total = data?.total ?? 0
  const allMatchingSelected = matching?.length > 0 && matching.every(n => selected.has(n.id))

  const filter = vals => {
    setFilters(vals)
    setOffset(0)
    setMatching(null)
  }
  const toggle = node => {
    const next = new Map(selected)
    next.has(node.id) ? next.delete(node.id) : next.set(node.id, node)
    onChange(next)
  }
  const toggleAll = rows => {
    const next = new Map(selected)
    const all = rows.every(r => next.has(r.id))
    rows.forEach(r => (all ? next.delete(r.id) : next.set(r.id, r)))
    onChange(next)
  }
  const toggleMatching = async () => {
    if (allMatchingSelected) return toggleAll(matching)
    setFetchingAll(true)
    try {
      const all = await fetchAllNodes(filters)
      setMatching(all)
      onChange(new Map([...selected, ...all.map(n => [n.id, n])]))
    } finally {
      setFetchingAll(false)
    }
  }

  return (
    <div className="flex flex-col border border-edge rounded-md overflow-hidden min-h-0">
      <TableToolbar
        filters={FILTERS}
        values={filters}
        onChange={filter}
        actions={
          <>
            {total > nodes.length && (
              <button
                onClick={toggleMatching}
                disabled={fetchingAll}
                className="text-[11px] text-brand hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {fetchingAll ? `Selecting ${total}…` : `${allMatchingSelected ? 'Deselect' : 'Select'} all ${total} matching`}
              </button>
            )}
            <span className="text-[11px] text-subtle">{selected.size} selected</span>
            {selected.size > 0 && (
              <button onClick={() => onChange(new Map())} className="text-subtle hover:text-content" title="Clear selection">
                <X size={12} />
              </button>
            )}
          </>
        }
      />
      <div className="max-h-72 overflow-auto flex flex-col">
        <DataTable
          columns={COLUMNS}
          data={nodes}
          isLoading={isFetching && !data}
          selection={{
            ids: new Set(selected.keys()),
            onToggle: toggle,
            onToggleAll: toggleAll,
            allSelected: nodes.length > 0 && nodes.every(n => selected.has(n.id)),
          }}
        />
      </div>
      <Pagination offset={offset} limit={LIMIT} total={total} onChange={setOffset} />
    </div>
  )
}
