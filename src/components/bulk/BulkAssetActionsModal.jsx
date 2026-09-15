import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { fetchPlatforms } from '../../api/inventory'

const ACTIONS = [
  { key: 'ned',        label: 'Set Driver' },
  { key: 'os',         label: 'Set OS' },
  { key: 'os_version', label: 'Set Version' },
]

export default function BulkAssetActionsModal({ selectedCount, onApply, onClose }) {
  const [action, setAction] = useState('ned')
  const [nedId, setNedId] = useState('')
  const [os, setOs] = useState('')
  const [osVersion, setOsVersion] = useState('')

  const { data: neds = [] } = useQuery({
    queryKey: ['neds'],
    queryFn: () => apiFetch('/api/v1/neds'),
    staleTime: 300_000,
  })

  const { data: catalog } = useQuery({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    staleTime: Infinity,
  })

  // Every OS we have declarations for, regardless of vendor - a selection can
  // span vendors, and the backend rejects a mismatch per asset anyway.
  const operatingSystems = useMemo(() => {
    const all = (catalog?.vendors ?? []).flatMap(v =>
      v.hardware_models.flatMap(m => m.operating_systems)
    )
    return [...new Set(all)].sort()
  }, [catalog])

  const versionExamples = catalog?.version_examples ?? {}

  const value = { ned: nedId, os, os_version: osVersion }[action]
  const canApply = Boolean(value?.trim())

  const handleApply = () => {
    if (!canApply) return
    onApply({
      action,
      value: value.trim(),
      label: {
        ned: `Set driver → ${nedId}`,
        os: `Set OS → ${os}`,
        os_version: `Set version → ${osVersion.trim()}`,
      }[action],
    })
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
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-0.5">Bulk Action</div>
            <div className="text-sm font-semibold text-content">
              {selectedCount.toLocaleString()} {selectedCount === 1 ? 'asset' : 'assets'}
            </div>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          {ACTIONS.map(opt => (
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

        {action === 'os' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-subtle">Operating system</label>
            <select
              value={os}
              onChange={e => setOs(e.target.value)}
              className="px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content focus:outline-none focus:border-brand/50 transition-colors"
            >
              <option value="">Select OS…</option>
              {operatingSystems.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <p className="text-[10px] text-subtle">
              An asset whose version no longer fits the new OS will fail and keep its current values.
            </p>
          </div>
        )}

        {action === 'os_version' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-subtle">OS version</label>
            <input
              type="text"
              value={osVersion}
              onChange={e => setOsVersion(e.target.value)}
              placeholder={versionExamples[operatingSystems[0]]?.[0] ?? '17.9.4a'}
              className="px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder-subtle/50 focus:outline-none focus:border-brand/50 transition-colors"
            />
            <p className="text-[10px] text-subtle">
              Each asset validates the version against its own OS, so a mixed selection will only
              update the assets it fits.
            </p>
          </div>
        )}

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
