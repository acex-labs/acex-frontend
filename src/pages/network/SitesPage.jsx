import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus } from 'lucide-react'
import { fetchSites } from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useSiteRegionFilters } from '../../hooks/useSiteRegionFilters'
import { useBulkSelect } from '../../hooks/useBulkSelect'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import BulkSelectionTray from '../../components/bulk/BulkSelectionTray'
import BulkPlaceholderModal from '../../components/bulk/BulkPlaceholderModal'
import CreateSiteModal from '../../components/sites/CreateSiteModal'

const DEFAULTS = {
  q: '', region: '',
  sort: 'name', order: 'asc', limit: 50, offset: 0,
}

// Addresses from before the one search box named a field each; their text is searched for in every field now.
const OLD_FILTERS = ['name', 'city', 'country']

const SEARCH = {
  key: 'q', label: 'Search sites…', search: true,
  hint: 'Matches name, display name, city, country and address.',
}

const COLUMNS = [
  { key: 'name',         label: 'Name',         sortable: true },
  { key: 'display_name', label: 'Display Name' },
  { key: 'city',         label: 'City',         sortable: true },
  { key: 'country',      label: 'Country',      sortable: true },
]

export default function SitesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useQueryParams(DEFAULTS, { fold: OLD_FILTERS })
  const filters = [SEARCH, ...useSiteRegionFilters(params, { sites: false })]
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sites', params],
    queryFn: () => fetchSites(params),
    placeholderData: keepPreviousData,
  })

  const sites = data?.items ?? []
  const total = data?.total ?? 0

  const bulk = useBulkSelect({
    endpoint: '/api/v1/inventory/sites',
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
          <>
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
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"
            >
              <Plus size={12} />
              Add Site
            </button>
          </>
        }
      />
      <TableToolbar
        filters={filters}
        values={{ q: params.q, region: params.region }}
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
      {showCreate && (
        <CreateSiteModal
          onClose={() => setShowCreate(false)}
          onSuccess={(created) => {
            queryClient.invalidateQueries({ queryKey: ['sites'] })
            navigate(`/network/sites/${created.id}`)
          }}
        />
      )}
    </div>
  )
}
