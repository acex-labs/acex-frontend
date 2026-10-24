import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { fetchNodes } from '../../api/inventory'
import { useSupports } from './capabilities'
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

// Nodes to run an operation on, found by hostname, site, region and vendor. Only nodes whose NED can run it
// can be chosen; a node chosen for another operation stays chosen, and is counted as skipped. `selected` maps
// node id to the node, so a choice survives filtering, paging and switching operation.
export default function NodePicker({ capability, selected, onChange }) {
  const [filters, setFilters] = useState({ hostname: '', site: '', region: '', vendor: '' })
  const [offset, setOffset] = useState(0)
  const supports = useSupports(capability)

  const query = { ...filters, offset, limit: LIMIT, sort: 'hostname', order: 'asc' }
  const { data, isFetching } = useQuery({
    queryKey: ['nodes', query],
    queryFn: () => fetchNodes(query),
    placeholderData: keepPreviousData,
  })
  const nodes = data?.items ?? []

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

  const columns = [
    { key: 'hostname', label: 'Hostname' },
    { key: 'site', label: 'Site' },
    { key: 'role', label: 'Role' },
    { key: 'ip', label: 'IP Address', render: (_, row) => row.management_connections?.[0]?.target_ip ?? '—' },
    {
      key: 'ned_id', label: 'Driver',
      render: (v, row) => supports(row) ? v : <span title={`${v ?? 'No driver'} can't run ${capability[1]}`}>{v ?? '—'} · no {capability[1]}</span>,
    },
  ]
  const selectable = nodes.filter(supports)
  const skipped = [...selected.values()].filter(n => !supports(n)).length

  return (
    <div className="flex flex-col border border-edge rounded-md overflow-hidden min-h-0">
      <TableToolbar
        filters={FILTERS}
        values={filters}
        onChange={vals => { setFilters(vals); setOffset(0) }}
        actions={
          <>
            <span className="text-[11px] text-subtle">
              {selected.size} selected
              {skipped > 0 && <span className="text-amber-400"> · {skipped} can't run {capability[1]} and will be skipped</span>}
            </span>
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
          columns={columns}
          data={nodes}
          isLoading={isFetching && !data}
          selection={{
            ids: new Set(selected.keys()),
            onToggle: toggle,
            onToggleAll: toggleAll,
            allSelected: selectable.length > 0 && selectable.every(n => selected.has(n.id)),
            // A chosen node can always be unchosen, even one this operation can't run on.
            isSelectable: node => supports(node) || selected.has(node.id),
          }}
        />
      </div>
      <Pagination offset={offset} limit={LIMIT} total={data?.total ?? 0} onChange={setOffset} />
    </div>
  )
}
