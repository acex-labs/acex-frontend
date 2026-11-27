import { useState, useRef, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Columns3, Layers, Plus } from 'lucide-react'
import { fetchNodes } from '../../api/inventory'
import { apiFetch } from '../../api/client'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useSiteRegionFilters } from '../../hooks/useSiteRegionFilters'
import { useTableColumns } from '../../hooks/useTableColumns'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import ConfigureTableModal from '../../components/table/ConfigureTableModal'
import { Age } from '../../components/config/ConfigSync'
import { CollectionBadge } from '../../components/nodes/NodeStatusBadge'
import BulkSelectionTray from '../../components/bulk/BulkSelectionTray'
import BulkActionsModal from '../../components/bulk/BulkActionsModal'
import BulkConfirmModal from '../../components/bulk/BulkConfirmModal'
import CreateNodeModal from '../../components/nodes/CreateNodeModal'
import { ADMIN_STATUSES, PROVISION_STATUSES, COLLECTION_FILTER_OPTIONS } from '../../components/nodes/nodeStatus'

const DEFAULTS = {
  q: '', region: '',
  admin_status: '', provision_status: '', collection_status: '',
  sort: 'hostname', order: 'asc', limit: 50, offset: 0,
}

// Addresses from before the one search box named a field each; their text is searched for in every field now.
const OLD_FILTERS = ['hostname', 'management_connection_ip', 'id', 'role', 'site']

// The one search box, then the filters that choose from a fixed set of values. There is no site choice: the server
// matches a site name as part of a name, so picking `hq` would also list `hq-2`; the search box finds a site as text.
const SEARCH = {
  key: 'q', label: 'Search nodes…', search: true,
  hint: 'Matches hostname, IP address, serial number, hardware model, vendor, site and role. A number also matches the ID.',
}
const STATUS_FILTERS = [
  { key: 'admin_status',     label: 'Admin',        width: '120px', options: ADMIN_STATUSES },
  { key: 'provision_status', label: 'Provisioning', width: '130px', options: PROVISION_STATUSES },
  { key: 'collection_status', label: 'Collection',  width: '140px', options: COLLECTION_FILTER_OPTIONS, column: 'collection' },
]

// A badge with the reason when the node was not collected; a node no agent has reported on shows a dash.
function collectionCell(_, row) {
  const collection = row.collection
  if (collection?.status === 'failing') return <CollectionBadge collection={collection} />
  return collection?.status === 'ok' ? <span className="text-subtle">Collected</span> : '—'
}

// Every column the list can show. Which of them are shown, and in which order, is chosen with Configure Table.
const COLUMNS = [
  { key: 'hostname', label: 'Hostname', sortable: true },
  { key: 'ip', label: 'IP Address', sortable: true, render: (_, row) => row.management_connections?.[0]?.target_ip ?? '—' },
  { key: 'site',     label: 'Site',     sortable: true },
  { key: 'role',     label: 'Role',     sortable: true },
  { key: 'admin_status',     label: 'Admin',        sortable: true },
  { key: 'provision_status', label: 'Provisioning', sortable: true },
  { key: 'ned_id',   label: 'Driver', sortable: true },
  { key: 'regions',  label: 'Regions', render: (v) => v?.join(', ') || '—' },
  { key: 'id',       label: 'ID', sortable: true },
  { key: 'collection', label: 'Collection', render: collectionCell },
  {
    key: 'collection_since', label: 'Not collected since',
    render: (_, row) => row.collection?.failing_since ? <Age iso={row.collection.failing_since} /> : '—',
  },
  { key: 'collection_agent', label: 'Collection agent', render: (_, row) => row.collection?.agent_name ?? '—' },
]

// What the list shows until someone chooses.
const DEFAULT_COLUMN_KEYS = ['hostname', 'ip', 'site', 'role', 'admin_status', 'provision_status', 'ned_id', 'regions', 'id']

export default function NodesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useQueryParams(DEFAULTS, { fold: OLD_FILTERS })
  const { columns, keys: columnKeys, choose: chooseColumns } = useTableColumns('nodes', COLUMNS, DEFAULT_COLUMN_KEYS)
  const [showColumns, setShowColumns] = useState(false)

  // A filter that belongs to a column is offered while the column is shown, and while it is in use, so that a filter
  // with a value (from a shared address, say) is never hidden.
  const regionFilters = useSiteRegionFilters(params, { sites: false })
  const filters = [
    SEARCH,
    ...regionFilters,
    ...STATUS_FILTERS.filter(f => !f.column || columnKeys.includes(f.column) || params[f.key]),
  ]

  // ── Bulk mode ─────────────────────────────────────────────────
  const [bulkMode, setBulkMode]     = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [actionSpec, setActionSpec] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  // Cache node → {asset_ref_id, asset_ref_type, logical_node_id} so bulk
  // actions (NED on the asset, role/site on the logical node) skip extra fetches
  const nodeInfoCache = useRef(new Map())
  const cacheNodeInfo = useCallback((n) => {
    if (n.asset_ref_id != null || n.logical_node_id != null)
      nodeInfoCache.current.set(n.id, {
        asset_ref_id: n.asset_ref_id,
        asset_ref_type: n.asset_ref_type,
        logical_node_id: n.logical_node_id,
      })
  }, [])

  // Select-all-matching state
  const [selectingAll, setSelectingAll]     = useState(false)
  const [selectAllProgress, setSelectAllProgress] = useState(null)
  const cancelSelectAll = useRef(false)

  // ── Data ──────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: ['nodes', params],
    queryFn: () => fetchNodes(params),
    placeholderData: keepPreviousData,
  })

  const nodes = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0

  // Cache asset info from every page we load
  nodes.forEach(cacheNodeInfo)

  // ── Selection helpers ─────────────────────────────────────────
  const toggleId = useCallback((row) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(row.id) ? next.delete(row.id) : next.add(row.id)
      cacheNodeInfo(row)
      return next
    })
  }, [cacheNodeInfo])

  const toggleAll = useCallback((rows) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const allSelected = rows.every(r => next.has(r.id))
      rows.forEach(r => {
        allSelected ? next.delete(r.id) : next.add(r.id)
        cacheNodeInfo(r)
      })
      return next
    })
  }, [cacheNodeInfo])

  const clearSelection = () => setSelectedIds(new Set())

  const allVisibleSelected = nodes.length > 0 && nodes.every(n => selectedIds.has(n.id))

  // ── Select all matching ───────────────────────────────────────
  const handleSelectAllMatching = async () => {
    if (!total || total === 0) return
    cancelSelectAll.current = false
    setSelectingAll(true)
    setSelectAllProgress({ fetched: 0, total })

    const PAGE = 100
    let offset = 0
    const allIds = new Set()

    while (offset < total) {
      if (cancelSelectAll.current) break
      try {
        const qs = new URLSearchParams()
        Object.entries({ ...params, limit: PAGE, offset }).forEach(([k, v]) => {
          if (v !== '' && v !== undefined && v !== null) qs.append(k, v)
        })
        const data = await apiFetch(`/api/v1/inventory/node_instances?${qs}`)
        ;(data.items ?? []).forEach(item => {
          allIds.add(item.id)
          cacheNodeInfo(item)
        })
        offset += PAGE
        setSelectAllProgress({ fetched: Math.min(offset, total), total })
      } catch {
        break
      }
    }

    if (!cancelSelectAll.current) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        allIds.forEach(id => next.add(id))
        return next
      })
    }

    setSelectingAll(false)
    setSelectAllProgress(null)
  }

  // ── Bulk mode toggle ──────────────────────────────────────────
  const toggleBulkMode = () => {
    if (bulkMode) {
      setBulkMode(false)
      clearSelection()
    } else {
      setBulkMode(true)
    }
  }

  // ── Action flow ───────────────────────────────────────────────
  const handleApplyAction = ({ action, value }) => {
    setShowActionsModal(false)
    setActionSpec({ action, value })
  }

  const handleConfirmClose = () => {
    setActionSpec(null)
    clearSelection()
    // Role/site edits change listed columns and filter matches.
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Nodes"
        description={total > 0 ? `${total} nodes` : undefined}
        actions={
          <>
            <button
              onClick={() => setShowColumns(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border border-edge text-subtle hover:text-content transition-colors"
            >
              <Columns3 size={12} />
              Configure Table
            </button>
            <button
              onClick={toggleBulkMode}
              className={[
                'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border transition-colors',
                bulkMode
                  ? 'bg-brand/10 border-brand/40 text-brand'
                  : 'border-edge text-subtle hover:text-content',
              ].join(' ')}
            >
              <Layers size={12} />
              {bulkMode ? 'Exit Bulk' : 'Bulk Edit'}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"
            >
              <Plus size={12} />
              Add Node
            </button>
          </>
        }
      />

      <TableToolbar
        filters={filters}
        values={{ q: params.q, region: params.region, admin_status: params.admin_status, provision_status: params.provision_status, collection_status: params.collection_status }}
        onChange={vals => setParams({ ...vals, offset: 0 })}
      />

      {bulkMode && (
        <BulkSelectionTray
          selectedCount={selectedIds.size}
          totalMatching={total}
          selectingAll={selectingAll}
          selectAllProgress={selectAllProgress}
          onSelectAllMatching={handleSelectAllMatching}
          onCancelSelectAll={() => { cancelSelectAll.current = true }}
          onClearSelection={clearSelection}
          onApplyAction={() => setShowActionsModal(true)}
        />
      )}

      <DataTable
        columns={columns}
        data={nodes}
        isLoading={isFetching}
        sortKey={params.sort}
        sortOrder={params.order}
        onSort={(key, order) => setParams({ sort: key, order, offset: 0 })}
        onRowClick={bulkMode ? undefined : row => navigate(`/network/nodes/${row.id}`)}
        selection={bulkMode ? {
          ids: selectedIds,
          onToggle: toggleId,
          onToggleAll: toggleAll,
          allSelected: allVisibleSelected,
        } : undefined}
      />

      <Pagination
        offset={params.offset}
        limit={params.limit}
        total={total}
        onChange={offset => setParams({ offset })}
      />

      {showActionsModal && (
        <BulkActionsModal
          selectedCount={selectedIds.size}
          onApply={handleApplyAction}
          onClose={() => setShowActionsModal(false)}
        />
      )}

      {actionSpec && (
        <BulkConfirmModal
          selectedIds={selectedIds}
          actionSpec={actionSpec}
          nodeInfoCache={nodeInfoCache.current}
          onClose={handleConfirmClose}
        />
      )}

      {showColumns && (
        <ConfigureTableModal
          allColumns={COLUMNS}
          selectedKeys={columnKeys}
          defaultKeys={DEFAULT_COLUMN_KEYS}
          onApply={(keys) => { chooseColumns(keys); setShowColumns(false) }}
          onClose={() => setShowColumns(false)}
        />
      )}

      {showCreate && (
        <CreateNodeModal
          onClose={() => setShowCreate(false)}
          onSuccess={(created) => {
            queryClient.invalidateQueries({ queryKey: ['nodes'] })
            navigate(`/network/nodes/${created.id}`)
          }}
        />
      )}
    </div>
  )
}
