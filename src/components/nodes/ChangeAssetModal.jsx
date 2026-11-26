import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Check } from 'lucide-react'
import { fetchAssets, fetchAssetClusters, updateNodeInstance } from '../../api/inventory'
import { parseApiError } from '../../api/apiError'
import VendorIcon from '../ui/VendorIcon'
import { FormError } from '../ui/ApiError'

function FilterInput({ placeholder, title, value, onChange, autoFocus }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      title={title}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      className="bg-surface-hi border border-edge rounded px-2.5 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors w-full"
    />
  )
}

function AssetRow({ asset, isSelected, onClick }) {
  const sublabel = [
    asset.ned_id,
    asset.serial_number && `SN: ${asset.serial_number}`,
  ].filter(Boolean).join(' · ')

  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-4 py-3 border-b border-edge/50 last:border-0 transition-colors',
        isSelected ? 'bg-brand/10' : 'hover:bg-surface-hi',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <VendorIcon vendor={asset.vendor} size={14} />
          <span className="text-xs font-medium text-content truncate">
            {[asset.vendor, asset.hardware_model].filter(Boolean).join(' ') || '—'}
          </span>
        </div>
        {isSelected && <Check size={12} className="text-brand shrink-0" />}
      </div>
      {sublabel && <div className="mt-0.5 text-[11px] text-subtle truncate">{sublabel}</div>}
    </button>
  )
}

function ClusterRow({ cluster, isSelected, onClick }) {
  const units = cluster.assets ?? []
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-4 py-3 border-b border-edge/50 last:border-0 transition-colors',
        isSelected ? 'bg-brand/10' : 'hover:bg-surface-hi',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-content truncate">{cluster.name || '—'}</span>
        </div>
        {isSelected && <Check size={12} className="text-brand shrink-0" />}
      </div>
      {cluster.ned_id && (
        <div className="mt-0.5 text-[11px] text-subtle">{cluster.ned_id}</div>
      )}
      {units.length > 0 && (
        <div className="mt-1.5 space-y-0.5 pl-2 border-l border-edge">
          {units.map((u, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-subtle">
              <VendorIcon vendor={u.vendor} size={11} />
              {[u.vendor, u.hardware_model].filter(Boolean).join(' ')}
              {u.serial_number && <span className="text-subtle/60"> · SN: {u.serial_number}</span>}
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

function EmptyState({ text }) {
  return <div className="px-4 py-3 text-xs text-subtle">{text}</div>
}


export default function ChangeAssetModal({ nodeId, onClose }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('single')
  const [selected, setSelected] = useState(null)

  const [singleF, setSingleF] = useState({ q: '' })
  const [clusterF, setClusterF] = useState({ name: '' })
  const [dSingle, setDSingle] = useState(singleF)
  const [dCluster, setDCluster] = useState(clusterF)

  useEffect(() => {
    const t = setTimeout(() => setDSingle(singleF), 300)
    return () => clearTimeout(t)
  }, [singleF])

  useEffect(() => {
    const t = setTimeout(() => setDCluster(clusterF), 300)
    return () => clearTimeout(t)
  }, [clusterF])

  const setSingle = (key, val) => setSingleF(p => ({ ...p, [key]: val }))
  const setCluster = (key, val) => setClusterF(p => ({ ...p, [key]: val }))

  // Only assets and clusters without a node instance can be picked: an asset backs at most one node.
  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets-picker', dSingle],
    queryFn: () => fetchAssets({
      q:        dSingle.q.trim() || undefined,
      assigned: false,
      limit: 100,
    }),
    enabled: tab === 'single',
  })

  const { data: clustersData, isLoading: clustersLoading } = useQuery({
    queryKey: ['asset-clusters-picker', 'unassigned'],
    queryFn: () => fetchAssetClusters({ assigned: false, limit: 200 }),
    enabled: tab === 'cluster',
  })

  const mutation = useMutation({
    mutationFn: (asset) =>
      updateNodeInstance(nodeId, { asset_ref_id: asset.id, asset_ref_type: asset.type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node', String(nodeId)] })
      onClose()
    },
    onError: (error) => {
      // A pick may have been taken meanwhile: refresh the lists.
      queryClient.invalidateQueries({ queryKey: ['assets-picker'] })
      queryClient.invalidateQueries({ queryKey: ['asset-clusters-picker'] })
      if (parseApiError(error).duplicate) setSelected(null)
    },
  })

  const assets = assetsData?.items ?? []

  const allClusters = clustersData?.items ?? []
  const clusters = dCluster.name
    ? allClusters.filter(c => c.name?.toLowerCase().includes(dCluster.name.toLowerCase()))
    : allClusters

  const TABS = [
    { key: 'single',  label: 'Single Asset' },
    { key: 'cluster', label: 'Cluster' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface border border-edge rounded-lg w-[540px] max-h-[600px] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">Change Asset</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-edge px-4 shrink-0">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSelected(null) }}
              className={[
                'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
                tab === key ? 'border-brand text-content' : 'border-transparent text-subtle hover:text-content',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-edge shrink-0 space-y-2">
          {tab === 'single' ? (
            <>
              <FilterInput placeholder="Search assets…" title="Matches serial number, vendor, hardware model and driver" value={singleF.q} onChange={v => setSingle('q', v)} autoFocus />
              <div className="text-[11px] text-subtle">Only assets without a node are listed.</div>
            </>
          ) : (
            <>
              <FilterInput placeholder="Cluster name" value={clusterF.name} onChange={v => setCluster('name', v)} autoFocus />
              <div className="text-[11px] text-subtle">Only clusters without a node are listed.</div>
            </>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'single' ? (
            assetsLoading ? (
              <div className="p-4 text-xs text-subtle animate-pulse">Loading…</div>
            ) : assets.length === 0 ? (
              <EmptyState text="No unassigned assets found." />
            ) : (
              assets.map(asset => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  isSelected={selected?.type !== 'asset_cluster' && selected?.id === asset.id}
                  onClick={() => { setSelected({ ...asset, type: 'asset' }); mutation.reset() }}
                />
              ))
            )
          ) : (
            clustersLoading ? (
              <div className="p-4 text-xs text-subtle animate-pulse">Loading…</div>
            ) : clusters.length === 0 ? (
              <EmptyState text="No unassigned clusters found." />
            ) : (
              clusters.map(cluster => (
                <ClusterRow
                  key={cluster.id}
                  cluster={cluster}
                  isSelected={selected?.type === 'asset_cluster' && selected?.id === cluster.id}
                  onClick={() => { setSelected({ ...cluster, type: 'asset_cluster' }); mutation.reset() }}
                />
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-edge shrink-0">
          <FormError error={mutation.error} fallback="Failed to update asset." className="text-xs text-red-400" />
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-subtle hover:text-content border border-edge rounded transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!selected || mutation.isPending}
              onClick={() => mutation.mutate(selected)}
              className="px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded disabled:opacity-40 transition-opacity"
            >
              {mutation.isPending ? 'Saving…' : 'Assign Asset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
