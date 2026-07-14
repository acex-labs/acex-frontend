import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { fetchLogicalNodes } from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useBulkSelect } from '../../hooks/useBulkSelect'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import BulkSelectionTray from '../../components/bulk/BulkSelectionTray'
import BulkPlaceholderModal from '../../components/bulk/BulkPlaceholderModal'

const DEFAULTS = {
  hostname: '', site: '',
  sort: 'hostname', order: 'asc', limit: 50, offset: 0,
}

const FILTERS = [
  { key: 'hostname', label: 'Hostname', width: '180px' },
  { key: 'site',     label: 'Site',     width: '140px' },
]

const COLUMNS = [
  { key: 'hostname', label: 'Hostname', sortable: true },
  { key: 'site',     label: 'Site',     sortable: true },
  { key: 'role',     label: 'Role' },
  { key: 'sequence', label: 'Seq' },
  { key: 'regions',  label: 'Regions', render: v => v?.join(', ') || '—' },
]

export default function LogicalNodesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [showActionsModal, setShowActionsModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['logical-nodes', params],
    queryFn: () => fetchLogicalNodes(params),
    placeholderData: keepPreviousData,
  })

  const nodes = data?.items ?? []
  const total = data?.total ?? 0

  const bulk = useBulkSelect({
    endpoint: '/api/v1/inventory/logical_nodes/',
    params,
    total,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Logical Nodes"
        description={total > 0 ? `${total} logical nodes` : undefined}
        actions={
          <button
            onClick={bulk.toggleBulkMode}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border transition-colors',
              bulk.bulkMode
                ? 'bg-brand/10 border-brand/40 text-brand'
                : 'border-edge text-subtle hover:text-content',
            ].join(' ')}
          >
            <Layers size={12} />
            {bulk.bulkMode ? 'Exit Bulk' : 'Bulk Edit'}
          </button>
        }
      />
      <TableToolbar
        filters={FILTERS}
        values={{ hostname: params.hostname, site: params.site }}
        onChange={vals => setParams({ ...vals, offset: 0 })}
      />
      {bulk.bulkMode && (
        <BulkSelectionTray
          selectedCount={bulk.selectedIds.size}
          totalMatching={total}
          selectingAll={bulk.selectingAll}
          selectAllProgress={bulk.selectAllProgress}
          onSelectAllMatching={bulk.handleSelectAllMatching}
          onCancelSelectAll={() => { bulk.cancelSelectAll.current = true }}
          onClearSelection={bulk.clearSelection}
          onApplyAction={() => setShowActionsModal(true)}
          entity="logical node"
          entityPlural="logical nodes"
        />
      )}
      <DataTable
        columns={COLUMNS}
        data={nodes}
        isLoading={isLoading}
        sortKey={params.sort}
        sortOrder={params.order}
        onSort={(key, order) => setParams({ sort: key, order, offset: 0 })}
        onRowClick={bulk.bulkMode ? undefined : row => navigate(`/network/nodes?hostname=${encodeURIComponent(row.hostname)}`)}
        selection={bulk.bulkMode ? {
          ids: bulk.selectedIds,
          onToggle: bulk.toggleId,
          onToggleAll: bulk.toggleAll,
          allSelected: bulk.allVisibleSelected(nodes),
        } : undefined}
      />
      <Pagination
        offset={params.offset}
        limit={params.limit}
        total={total}
        onChange={offset => setParams({ offset })}
      />
      {showActionsModal && (
        <BulkPlaceholderModal
          selectedCount={bulk.selectedIds.size}
          entity="logical node"
          entityPlural="logical nodes"
          onClose={() => setShowActionsModal(false)}
        />
      )}
    </div>
  )
}
