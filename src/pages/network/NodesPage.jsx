import { useState, useRef, useCallback } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { fetchNodes } from '../../api/inventory'
import { apiFetch } from '../../api/client'
import { useQueryParams } from '../../hooks/useQueryParams'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import BulkSelectionTray from '../../components/bulk/BulkSelectionTray'
import BulkActionsModal from '../../components/bulk/BulkActionsModal'
import BulkConfirmModal from '../../components/bulk/BulkConfirmModal'

const DEFAULTS = {
  hostname: '', site: '', region: '', role: '', id: '',
  sort: 'hostname', order: 'asc', limit: 50, offset: 0,
}

const FILTERS = [
  { key: 'hostname', label: 'Hostname', width: '160px' },
  { key: 'site',     label: 'Site',     width: '120px' },
  { key: 'region',   label: 'Region',   width: '120px' },
  { key: 'role',     label: 'Role',     width: '120px' },
  { key: 'id',       label: 'ID',       width: '90px'  },
]

const COLUMNS = [
  { key: 'hostname', label: 'Hostname', sortable: true },
  { key: 'site',     label: 'Site',     sortable: true },
  { key: 'role',     label: 'Role' },
  { key: 'status',   label: 'Status' },
  { key: 'ned_id',   label: 'Driver' },
  { key: 'regions',  label: 'Regions', render: (v) => v?.join(', ') || '—' },
  { key: 'id',       label: 'ID' },
]

export default function NodesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useQueryParams(DEFAULTS)

  // ── Bulk mode ─────────────────────────────────────────────────
  const [bulkMode, setBulkMode]     = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [actionSpec, setActionSpec] = useState(null)

  // Cache node → {asset_ref_id, asset_ref_type} so Set NED doesn't need extra fetches
  const nodeInfoCache = useRef(new Map())

  // Select-all-matching state
  const [selectingAll, setSelectingAll]     = useState(false)
  const [selectAllProgress, setSelectAllProgress] = useState(null)
  const cancelSelectAll = useRef(false)

  // ── Data ──────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['nodes', params],
    queryFn: () => fetchNodes(params),
    placeholderData: keepPreviousData,
  })

  const nodes = data?.items ?? []
  const total = data?.total ?? 0

  // Cache asset info from every page we load
  nodes.forEach(n => {
    if (n.asset_ref_id != null)
      nodeInfoCache.current.set(n.id, { asset_ref_id: n.asset_ref_id, asset_ref_type: n.asset_ref_type })
  })

  // ── Selection helpers ─────────────────────────────────────────
  const toggleId = useCallback((row) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(row.id) ? next.delete(row.id) : next.add(row.id)
      if (row.asset_ref_id != null)
        nodeInfoCache.current.set(row.id, { asset_ref_id: row.asset_ref_id, asset_ref_type: row.asset_ref_type })
      return next
    })
  }, [])

  const toggleAll = useCallback((rows) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const allSelected = rows.every(r => next.has(r.id))
      rows.forEach(r => {
        allSelected ? next.delete(r.id) : next.add(r.id)
        if (r.asset_ref_id != null)
          nodeInfoCache.current.set(r.id, { asset_ref_id: r.asset_ref_id, asset_ref_type: r.asset_ref_type })
      })
      return next
    })
  }, [])

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

    // Build query without the id path-param shortcut
    const { id: _skip, ...filterParams } = params

    while (offset < total) {
      if (cancelSelectAll.current) break
      try {
        const qs = new URLSearchParams()
        Object.entries({ ...filterParams, limit: PAGE, offset }).forEach(([k, v]) => {
          if (v !== '' && v !== undefined && v !== null) qs.append(k, v)
        })
        const data = await apiFetch(`/api/v1/inventory/node_instances?${qs}`)
        ;(data.items ?? []).forEach(item => {
          allIds.add(item.id)
          nodeInfoCache.current.set(item.id, { asset_ref_id: item.asset_ref_id, asset_ref_type: item.asset_ref_type })
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
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Nodes"
        description={total > 0 ? `${total} nodes` : undefined}
        actions={
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
        }
      />

      <TableToolbar
        filters={FILTERS}
        values={{ hostname: params.hostname, site: params.site, region: params.region, role: params.role, id: params.id }}
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
        columns={COLUMNS}
        data={nodes}
        isLoading={isLoading}
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
    </div>
  )
}
