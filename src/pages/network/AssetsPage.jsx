import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Layers, Plus } from 'lucide-react'
import { fetchAssets, fetchAssetClusters } from '../../api/inventory'
import { apiFetch } from '../../api/client'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useBulkSelect } from '../../hooks/useBulkSelect'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import BulkSelectionTray from '../../components/bulk/BulkSelectionTray'
import BulkAssetActionsModal from '../../components/bulk/BulkAssetActionsModal'
import BulkConfirmModal from '../../components/bulk/BulkConfirmModal'
import CreateAssetModal from '../../components/assets/CreateAssetModal'
import CreateAssetClusterModal from '../../components/assets/CreateAssetClusterModal'

const DEFAULTS = {
  view: 'assets',
  vendor: '', os: '', serial_number: '', name: '',
  assigned: '',
  sort: 'vendor', order: 'asc', limit: 50, offset: 0,
}

const ASSET_FILTERS = [
  { key: 'vendor',        label: 'Vendor', width: '140px' },
  { key: 'os',            label: 'OS',     width: '140px' },
  { key: 'serial_number', label: 'Serial', width: '160px' },
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
  const queryClient = useQueryClient()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [actionSpec, setActionSpec] = useState(null)
  const [showCreateAsset, setShowCreateAsset] = useState(false)
  const [showCreateCluster, setShowCreateCluster] = useState(false)

  const isAssetsView = params.view !== 'clusters'

  const assignedFilter = params.assigned === 'true' ? true : params.assigned === 'false' ? false : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['assets', params],
    queryFn: () => fetchAssets({
      ...params,
      serial_number: params.serial_number || undefined,
      assigned: assignedFilter,
    }),
    placeholderData: keepPreviousData,
    enabled: isAssetsView,
  })

  const { data: clusterData, isLoading: clustersLoading } = useQuery({
    queryKey: ['asset-clusters', params.name, params.limit, params.offset],
    queryFn: () => fetchAssetClusters({ limit: params.limit, offset: params.offset }),
    placeholderData: keepPreviousData,
    enabled: !isAssetsView,
  })

  const { data: unassignedData } = useQuery({
    queryKey: ['assets', 'unassigned-count'],
    queryFn: () => fetchAssets({ assigned: false, limit: 1 }),
    staleTime: 30_000,
  })
  const unassignedCount = unassignedData?.total ?? 0

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

  // Every asset action is a PATCH of one field; the backend validates each one.
  const buildAssetAction = useCallback(({ action, value }) => (assetId) =>
    apiFetch(`/api/v1/inventory/assets/${assetId}`, {
      method: 'PATCH',
      body: JSON.stringify({ [action === 'ned' ? 'ned_id' : action]: value }),
    }), [])

  const handleApplyAction = (spec) => {
    setShowActionsModal(false)
    setActionSpec(spec)
  }

  const handleConfirmClose = () => {
    setActionSpec(null)
    bulk.clearSelection()
    queryClient.invalidateQueries({ queryKey: ['assets'] })
  }

  const switchView = (view) => setParams({ view, offset: 0, sort: DEFAULTS.sort, order: DEFAULTS.order })

  const total = isAssetsView ? assetsTotal : clustersTotal

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Assets"
        description={total > 0 ? `${total} ${isAssetsView ? (params.assigned === 'false' ? 'unassigned' : params.assigned === 'true' ? 'assigned' : 'assets') : 'clusters'}` : undefined}
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

      {isAssetsView && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-edge shrink-0">
          {[
            { value: '',      label: 'All' },
            { value: 'true',  label: 'Assigned' },
            { value: 'false', label: 'Unassigned', count: unassignedCount },
          ].map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setParams({ assigned: value, offset: 0 })}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                params.assigned === value
                  ? 'bg-brand/10 border-brand/40 text-brand'
                  : 'border-edge text-subtle hover:text-content hover:border-edge/80',
              ].join(' ')}
            >
              {label}
              {count != null && count > 0 && (
                <span className={[
                  'inline-flex items-center justify-center rounded-full px-1.5 min-w-[18px] text-[10px] font-semibold',
                  params.assigned === value
                    ? 'bg-brand/20 text-brand'
                    : 'bg-amber-500/15 text-amber-500',
                ].join(' ')}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <TableToolbar
        filters={isAssetsView ? ASSET_FILTERS : CLUSTER_FILTERS}
        values={isAssetsView ? { vendor: params.vendor, os: params.os, serial_number: params.serial_number } : { name: params.name }}
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
        <BulkAssetActionsModal
          selectedCount={bulk.selectedIds.size}
          onApply={handleApplyAction}
          onClose={() => setShowActionsModal(false)}
        />
      )}

      {actionSpec && (
        <BulkConfirmModal
          selectedIds={bulk.selectedIds}
          actionSpec={actionSpec}
          buildAction={buildAssetAction}
          entity="asset"
          onClose={handleConfirmClose}
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
