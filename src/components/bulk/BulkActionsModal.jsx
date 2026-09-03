import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiFetch } from '../../api/client'

const STATUS_OPTIONS = ['planned', 'init', 'active', 'decommissioned']

export default function BulkActionsModal({ selectedCount, onApply, onClose }) {
  const [action, setAction] = useState('ned')
  const [nedId, setNedId]   = useState('')
  const [status, setStatus] = useState('')

  const { data: neds = [] } = useQuery({
    queryKey: ['neds'],
    queryFn: () => apiFetch('/api/v1/neds'),
    staleTime: 300_000,
  })

  const canApply = (action === 'ned' && nedId) || (action === 'status' && status)

  const handleApply = () => {
    if (!canApply) return
    if (action === 'ned')    onApply({ action: 'ned',    value: nedId })
    if (action === 'status') onApply({ action: 'status', value: status })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface border border-edge rounded-xl p-6 flex flex-col gap-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-0.5">Bulk Action</div>
            <div className="text-sm font-semibold text-content">
              {selectedCount.toLocaleString()} {selectedCount === 1 ? 'node' : 'nodes'}
            </div>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Action picker */}
        <div className="flex gap-2">
          {[
            { key: 'ned',    label: 'Set NED' },
            { key: 'status', label: 'Set Status' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setAction(opt.key)}
              className={[
                'flex-1 py-1.5 text-xs font-semibold rounded border transition-colors',
                action === opt.key
                  ? 'bg-brand/10 border-brand/40 text-brand'
                  : 'border-edge text-subtle hover:text-content hover:border-edge/80',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* NED picker */}
        {action === 'ned' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-subtle">Driver (NED)</label>
            <select
              value={nedId}
              onChange={e => setNedId(e.target.value)}
              className="px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content focus:outline-none focus:border-brand/50 transition-colors"
            >
              <option value="">Select driver…</option>
              {neds.map(n => (
                <option key={n.name} value={n.name}>{n.name} — v{n.version}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status picker */}
        {action === 'status' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-subtle">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={[
                    'py-1.5 text-xs font-medium rounded border transition-colors',
                    status === s
                      ? 'bg-brand/10 border-brand/40 text-brand'
                      : 'border-edge text-subtle hover:text-content',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Apply */}
        <button
          onClick={handleApply}
          disabled={!canApply}
          className="w-full py-2 text-xs font-semibold rounded-lg bg-brand/10 border border-brand/30 text-brand hover:bg-brand/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
