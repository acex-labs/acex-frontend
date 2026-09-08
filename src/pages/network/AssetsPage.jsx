import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Layers, Plus } from 'lucide-react'
import { fetchAssets, fetchAssetClusters } from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useBulkSelect } from '../../hooks/useBulkSelect'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import BulkSelectionTray from '../../components/bulk/BulkSelectionTray'
import BulkPlaceholderModal from '../../components/bulk/BulkPlaceholderModal'
import CreateAssetModal from '../../components/assets/CreateAssetModal'
import CreateAssetClusterModal from '../../components/assets/CreateAssetClusterModal'

const DEFAULTS = {
  view: 'assets',
  vendor: '', os: '', name: '',
  sort: 'vendor', order: 'asc', limit: 50, offset: 0,
}

const ASSET_FILTERS = [
  { key: 'vendor', label: 'Vendor', width: '140px' },
  { key: 'os',     label: 'OS',     width: '140px' },
]

const CLUSTER_FILTERS = [
  { key: 'name', label: 'Name', width: '180px' },
]

const ASSET_COLUMNS = [
  { key: 'vendor',         label: 'Vendor',    sortable: true },
  { key: 'hardware_model', label: 'Model' },
  { key: 'os',             label: 'OS',        sortable: true },
  { key: 'os_version',     label: 'Version' },
  { key: 'ned_id',         label: 'Driver' },
  { key: 'serial_number',  label: 'Serial' },
  { key: 'type',           label: 'Type' },
]

const CLUSTER_COLUMNS = [
  { key: 'name',   label: 'Name' },
  { key: 'ned_id', label: 'Driver' },
  { key: 'id',     label: 'ID' },
]

const VIEWS = [
  { key: 'assets',   label: 'Assets' },
  { key: 'clusters', label: 'Clusters' },
]

export default function AssetsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [showCreateAsset, setShowCreateAsset] = useState(false)
  const [showCreateCluster, setShowCreateCluster] = useState(false)

  const isAssetsView = params.view !== 'clusters'

  const { data, isLoading } = useQuery({
    queryKey: ['assets', params],
    queryFn: () => fetchAssets(params),
    placeholderData: keepPreviousData,
    enabled: isAssetsView,
  })

  const { data: clusterData, isLoading: clustersLoading } = useQuery({
    queryKey: ['asset-clusters', params.name, params.limit, params.offset],
    queryFn: () => fetchAssetClusters({ limit: params.limit, offset: params.offset }),
    placeholderData: keepPreviousData,
    enabled: !isAssetsView,
  })

  const assets = data?.items ?? []
  const assetsTotal = data?.total ?? 0

  const allClusters = clusterData?.items ?? []
  const clusters = params.name
    ? allClusters.filter(c => c.name?.toLowerCase().includes(params.name.toLowerCase()))
    : allClusters
  const clustersTotal = params.name ? clusters.length : (clusterData?.total ?? 0)

  const bulk = useBulkSelect({
    endpoint: '/api/v1/inventory/assets',
    params,
    total: assetsTotal,
  })

  const switchView = (view) => setParams({ view, offset: 0, sort: DEFAULTS.sort, order: DEFAULTS.order })

  const total = isAssetsView ? assetsTotal : clustersTotal

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Assets"
        description={total > 0 ? `${total} ${isAssetsView ? 'assets' : 'clusters'}` : undefined}
        actions={
          <>
            {isAssetsView && (
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
            )}
            <button
              onClick={() => isAssetsView ? setShowCreateAsset(true) : setShowCreateCluster(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"
            >
              <Plus size={12} />
              {isAssetsView ? 'Add Asset' : 'Add Cluster'}
            </button>
          </>
        }
      />

      <div className="flex border-b border-edge px-4 shrink-0">
        {VIEWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchView(key)}
            className={[
              'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
              params.view === key
                ? 'border-brand text-content'
                : 'border-transparent text-subtle hover:text-content',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <TableToolbar
        filters={isAssetsView ? ASSET_FILTERS : CLUSTER_FILTERS}
        values={isAssetsView ? { vendor: params.vendor, os: params.os } : { name: params.name }}
        onChange={vals => setParams({ ...vals, offset: 0 })}
      />

      {isAssetsView && bulk.bulkMode && (
        <BulkSelectionTray
          selectedCount={bulk.selectedIds.size}
          totalMatching={assetsTotal}
          selectingAll={bulk.selectingAll}
          selectAllProgress={bulk.selectAllProgress}
          onSelectAllMatching={bulk.handleSelectAllMatching}
          onCancelSelectAll={() => { bulk.cancelSelectAll.current = true }}
          onClearSelection={bulk.clearSelection}
          onApplyAction={() => setShowActionsModal(true)}
          entity="asset"
        />
      )}

      {isAssetsView ? (
        <DataTable
          columns={ASSET_COLUMNS}
          data={assets}
          isLoading={isLoading}
          sortKey={params.sort}
          sortOrder={params.order}
          onSort={(key, order) => setParams({ sort: key, order, offset: 0 })}
          onRowClick={bulk.bulkMode ? undefined : row => navigate(`/network/assets/${row.id}`)}
          selection={bulk.bulkMode ? {
            ids: bulk.selectedIds,
            onToggle: bulk.toggleId,
            onToggleAll: bulk.toggleAll,
            allSelected: bulk.allVisibleSelected(assets),
          } : undefined}
        />
      ) : (
        <DataTable
          columns={CLUSTER_COLUMNS}
          data={clusters}
          isLoading={clustersLoading}
          onRowClick={row => navigate(`/network/asset-clusters/${row.id}`)}
        />
      )}

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

      {showCreateAsset && (
        <CreateAssetModal
          onClose={() => setShowCreateAsset(false)}
          onSuccess={(created) => navigate(`/network/assets/${created.id}`)}
        />
      )}

      {showCreateCluster && (
        <CreateAssetClusterModal
          onClose={() => setShowCreateCluster(false)}
          onSuccess={(created) => navigate(`/network/asset-clusters/${created.id}`)}
        />
      )}
    </div>
  )
}
