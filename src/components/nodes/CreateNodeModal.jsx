import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X, Check } from 'lucide-react'
import { fetchLogicalNodes, fetchAssets, fetchAssetClusters, createNodeInstance } from '../../api/inventory'
import VendorIcon from '../ui/VendorIcon'

const INPUT_CLS = 'bg-surface-hi border border-edge rounded px-2.5 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors w-full'

const NODE_STATUSES = ['planned', 'init', 'active', 'decommissioned']

function FormField({ label, required, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] text-subtle mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function LogicalNodeRow({ node, isSelected, onClick }) {
  const sublabel = [node.site, node.role].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2 border-b border-edge/50 last:border-0 transition-colors',
        isSelected ? 'bg-brand/10' : 'hover:bg-surface-hi',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-content truncate">{node.hostname}</span>
        {isSelected && <Check size={12} className="text-brand shrink-0" />}
      </div>
      {sublabel && <div className="mt-0.5 text-[11px] text-subtle truncate">{sublabel}</div>}
    </button>
  )
}

function AssetRow({ asset, isSelected, onClick }) {
  const sublabel = [
    asset.ned_id,
    asset.serial_number && `SN: ${asset.serial_number}`,
  ].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2 border-b border-edge/50 last:border-0 transition-colors',
        isSelected ? 'bg-brand/10' : 'hover:bg-surface-hi',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <VendorIcon vendor={asset.vendor} size={13} />
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2 border-b border-edge/50 last:border-0 transition-colors',
        isSelected ? 'bg-brand/10' : 'hover:bg-surface-hi',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-content truncate">{cluster.name || '—'}</span>
        {isSelected && <Check size={12} className="text-brand shrink-0" />}
      </div>
      {cluster.ned_id && <div className="mt-0.5 text-[11px] text-subtle">{cluster.ned_id}</div>}
    </button>
  )
}

export default function CreateNodeModal({ onClose, onSuccess }) {
  const [hostnameFilter, setHostnameFilter] = useState('')
  const [dHostnameFilter, setDHostnameFilter] = useState('')
  const [selectedLogicalNode, setSelectedLogicalNode] = useState(null)

  const [assetTab, setAssetTab] = useState('single')
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [status, setStatus] = useState('planned')

  useEffect(() => {
    const t = setTimeout(() => setDHostnameFilter(hostnameFilter), 300)
    return () => clearTimeout(t)
  }, [hostnameFilter])

  const { data: logicalNodesData, isLoading: logicalNodesLoading } = useQuery({
    queryKey: ['logical-nodes-picker', dHostnameFilter],
    queryFn: () => fetchLogicalNodes({ hostname: dHostnameFilter || undefined, limit: 100 }),
  })
  const logicalNodes = logicalNodesData?.items ?? []

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets-picker', 'unassigned-for-node'],
    queryFn: () => fetchAssets({ assigned: false, limit: 200 }),
    enabled: assetTab === 'single',
  })
  const assets = assetsData?.items ?? []

  const { data: clustersData, isLoading: clustersLoading } = useQuery({
    queryKey: ['asset-clusters-picker', 'unassigned-for-node'],
    queryFn: () => fetchAssetClusters({ assigned: false, limit: 200 }),
    enabled: assetTab === 'cluster',
  })
  const clusters = clustersData?.items ?? []

  const mutation = useMutation({
    mutationFn: (payload) => createNodeInstance(payload),
    onSuccess: (created) => { onSuccess(created); onClose() },
  })

  const submit = () => {
    if (!selectedLogicalNode || !selectedAsset) return
    mutation.mutate({
      logical_node_id: selectedLogicalNode.id,
      asset_ref_id: selectedAsset.id,
      asset_ref_type: selectedAsset.type,
      status,
    })
  }

  const ASSET_TABS = [
    { key: 'single',  label: 'Single Asset' },
    { key: 'cluster', label: 'Cluster' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">New Node</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Logical Node picker */}
          <div>
            <FormField label={`Logical Node${selectedLogicalNode ? `: ${selectedLogicalNode.hostname}` : ''}`} required>
              <input
                type="text"
                placeholder="Filter by hostname…"
                value={hostnameFilter}
                onChange={e => setHostnameFilter(e.target.value)}
                autoFocus
                className={INPUT_CLS}
              />
            </FormField>
            <div className="border border-edge rounded max-h-72 overflow-y-auto">
              {logicalNodesLoading ? (
                <div className="px-3 py-3 text-xs text-subtle animate-pulse">Loading…</div>
              ) : logicalNodes.length === 0 ? (
                <div className="px-3 py-3 text-xs text-subtle">No logical nodes found.</div>
              ) : (
                logicalNodes.map(ln => (
                  <LogicalNodeRow
                    key={ln.id}
                    node={ln}
                    isSelected={selectedLogicalNode?.id === ln.id}
                    onClick={() => setSelectedLogicalNode(ln)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Asset picker */}
          <div>
            <FormField label={`Asset${selectedAsset ? `: ${selectedAsset.name || [selectedAsset.vendor, selectedAsset.hardware_model].filter(Boolean).join(' ')}` : ''}`} required>
              <div className="flex border border-edge rounded overflow-hidden text-xs">
                {ASSET_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setAssetTab(key); setSelectedAsset(null) }}
                    className={[
                      'flex-1 px-2 py-1.5 transition-colors',
                      assetTab === key ? 'bg-brand/10 text-brand font-semibold' : 'text-subtle hover:text-content',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormField>
            <div className="border border-edge rounded max-h-72 overflow-y-auto">
              {assetTab === 'single' ? (
                assetsLoading ? (
                  <div className="px-3 py-3 text-xs text-subtle animate-pulse">Loading…</div>
                ) : assets.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-subtle">No unassigned assets available.</div>
                ) : (
                  assets.map(asset => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      isSelected={selectedAsset?.type !== 'asset_cluster' && selectedAsset?.id === asset.id}
                      onClick={() => setSelectedAsset({ ...asset, type: 'asset' })}
                    />
                  ))
                )
              ) : (
                clustersLoading ? (
                  <div className="px-3 py-3 text-xs text-subtle animate-pulse">Loading…</div>
                ) : clusters.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-subtle">No unassigned clusters available.</div>
                ) : (
                  clusters.map(cluster => (
                    <ClusterRow
                      key={cluster.id}
                      cluster={cluster}
                      isSelected={selectedAsset?.type === 'asset_cluster' && selectedAsset?.id === cluster.id}
                      onClick={() => setSelectedAsset({ ...cluster, type: 'asset_cluster' })}
                    />
                  ))
                )
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <FormField label="Status">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className={INPUT_CLS}
              >
                {NODE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>

            {mutation.isError && (
              <p className="text-[11px] text-red-400">Failed to create node.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!selectedLogicalNode || !selectedAsset || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
