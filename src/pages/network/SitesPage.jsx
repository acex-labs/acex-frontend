import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { fetchSites } from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useBulkSelect } from '../../hooks/useBulkSelect'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import BulkSelectionTray from '../../components/bulk/BulkSelectionTray'
import BulkPlaceholderModal from '../../components/bulk/BulkPlaceholderModal'

const DEFAULTS = {
  name: '', city: '', country: '', region: '',
  sort: 'name', order: 'asc', limit: 50, offset: 0,
}

const FILTERS = [
  { key: 'name',    label: 'Name',    width: '160px' },
  { key: 'city',    label: 'City',    width: '130px' },
  { key: 'country', label: 'Country', width: '130px' },
  { key: 'region',  label: 'Region',  width: '130px' },
]

const COLUMNS = [
  { key: 'name',         label: 'Name',         sortable: true },
  { key: 'display_name', label: 'Display Name' },
  { key: 'city',         label: 'City',         sortable: true },
  { key: 'country',      label: 'Country',      sortable: true },
]

export default function SitesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [showActionsModal, setShowActionsModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sites', params],
    queryFn: () => fetchSites(params),
    placeholderData: keepPreviousData,
  })

  const sites = data?.items ?? []
  const total = data?.total ?? 0

  const bulk = useBulkSelect({
    endpoint: '/api/v1/inventory/sites/',
    params,
    total,
    rowKey: 'name',
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Sites"
        description={total > 0 ? `${total} sites` : undefined}
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
        values={{ name: params.name, city: params.city, country: params.country, region: params.region }}
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
          entity="site"
        />
      )}
      <DataTable
        columns={COLUMNS}
        data={sites}
        isLoading={isLoading}
        sortKey={params.sort}
        sortOrder={params.order}
        onSort={(key, order) => setParams({ sort: key, order, offset: 0 })}
        onRowClick={bulk.bulkMode ? undefined : row => navigate(`/network/sites/${row.id}`)}
        rowKey="name"
        selection={bulk.bulkMode ? {
          ids: bulk.selectedIds,
          onToggle: bulk.toggleId,
          onToggleAll: bulk.toggleAll,
          allSelected: bulk.allVisibleSelected(sites),
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
          entity="site"
          onClose={() => setShowActionsModal(false)}
        />
      )}
    </div>
  )
}
