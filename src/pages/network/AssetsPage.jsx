import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { fetchAssets } from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useBulkSelect } from '../../hooks/useBulkSelect'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import BulkSelectionTray from '../../components/bulk/BulkSelectionTray'
import BulkPlaceholderModal from '../../components/bulk/BulkPlaceholderModal'

const DEFAULTS = {
  vendor: '', os: '',
  sort: 'vendor', order: 'asc', limit: 50, offset: 0,
}

const FILTERS = [
  { key: 'vendor', label: 'Vendor', width: '140px' },
  { key: 'os',     label: 'OS',     width: '140px' },
]

const COLUMNS = [
  { key: 'vendor',         label: 'Vendor',    sortable: true },
  { key: 'hardware_model', label: 'Model' },
  { key: 'os',             label: 'OS',        sortable: true },
  { key: 'os_version',     label: 'Version' },
  { key: 'ned_id',         label: 'Driver' },
  { key: 'serial_number',  label: 'Serial' },
  { key: 'type',           label: 'Type' },
]

export default function AssetsPage() {
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [showActionsModal, setShowActionsModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['assets', params],
    queryFn: () => fetchAssets(params),
    placeholderData: keepPreviousData,
  })

  const assets = data?.items ?? []
  const total = data?.total ?? 0

  const bulk = useBulkSelect({
    endpoint: '/api/v1/inventory/assets',
    params,
    total,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Assets"
        description={total > 0 ? `${total} assets` : undefined}
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
        values={{ vendor: params.vendor, os: params.os }}
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
          entity="asset"
        />
      )}
      <DataTable
        columns={COLUMNS}
        data={assets}
        isLoading={isLoading}
        sortKey={params.sort}
        sortOrder={params.order}
        onSort={(key, order) => setParams({ sort: key, order, offset: 0 })}
        selection={bulk.bulkMode ? {
          ids: bulk.selectedIds,
          onToggle: bulk.toggleId,
          onToggleAll: bulk.toggleAll,
          allSelected: bulk.allVisibleSelected(assets),
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
          entity="asset"
          onClose={() => setShowActionsModal(false)}
        />
      )}
    </div>
  )
}
