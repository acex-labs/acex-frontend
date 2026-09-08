import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X, Check } from 'lucide-react'
import { fetchAssets, createAssetCluster } from '../../api/inventory'
import VendorIcon from '../ui/VendorIcon'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

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

export default function CreateAssetClusterModal({ onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [nedId, setNedId] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['assets-picker', 'unassigned'],
    queryFn: () => fetchAssets({ assigned: false, limit: 200 }),
  })
  const assets = data?.items ?? []

  const toggleId = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const mutation = useMutation({
    mutationFn: createAssetCluster,
    onSuccess: (created) => { onSuccess(created); onClose() },
  })

  const submit = () => {
    mutation.mutate({
      name: name.trim(),
      ned_id: nedId.trim() || undefined,
      asset_ids: Array.from(selectedIds),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">New Cluster</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1">
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className={INPUT_CLS}
            />
          </FormField>
          <FormField label="Driver (NED)">
            <input
              type="text"
              value={nedId}
              onChange={e => setNedId(e.target.value)}
              className={INPUT_CLS}
            />
          </FormField>

          <FormField label={`Member assets (${selectedIds.size} selected)`}>
            <div className="border border-edge rounded max-h-52 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-3 text-xs text-subtle animate-pulse">Loading…</div>
              ) : assets.length === 0 ? (
                <div className="px-3 py-3 text-xs text-subtle">No unassigned assets available.</div>
              ) : (
                assets.map(asset => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggleId(asset.id)}
                    className={[
                      'w-full text-left px-3 py-2 border-b border-edge/50 last:border-0 flex items-center gap-2 transition-colors',
                      selectedIds.has(asset.id) ? 'bg-brand/10' : 'hover:bg-surface-hi',
                    ].join(' ')}
                  >
                    <VendorIcon vendor={asset.vendor} size={13} />
                    <span className="text-xs text-content truncate flex-1">
                      {[asset.vendor, asset.hardware_model].filter(Boolean).join(' ') || '—'}
                      {asset.serial_number && <span className="text-subtle"> · SN: {asset.serial_number}</span>}
                    </span>
                    {selectedIds.has(asset.id) && <Check size={12} className="text-brand shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </FormField>

          {mutation.isError && (
            <p className="mt-2 text-[11px] text-red-400">Failed to create cluster.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
