import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { fetchSites } from '../../api/inventory'
import { ADMIN_STATUSES } from '../nodes/nodeStatus'


const ACTIONS = [
  { key: 'ned',    label: 'Set NED'    },
  { key: 'status', label: 'Set Admin Status' },
  { key: 'role',   label: 'Set Role'   },
  { key: 'site',   label: 'Set Site'   },
]

const INPUT_CLS = 'px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 transition-colors'

export default function BulkActionsModal({ selectedCount, onApply, onClose }) {
  const [action, setAction] = useState('ned')
  const [nedId, setNedId]   = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole]     = useState('')
  const [site, setSite]     = useState('')

  const { data: neds = [] } = useQuery({
    queryKey: ['neds'],
    queryFn: () => apiFetch('/api/v1/neds'),
    staleTime: 300_000,
  })

  // Suggestions only — site is free text on the logical node.
  const { data: sites = [] } = useQuery({
    queryKey: ['sites', 'bulk-suggestions'],
    queryFn: () => fetchSites({ limit: 1000 }).then(d => d.items ?? []),
    enabled: action === 'site',
    staleTime: 300_000,
  })

  const values = { ned: nedId, status, role: role.trim(), site: site.trim() }
  const canApply = !!values[action]

  const handleApply = () => {
    if (!canApply) return
    onApply({ action, value: values[action] })
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
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setAction(opt.key)}
              className={[
                'py-1.5 text-xs font-semibold rounded border transition-colors',
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
            <label className="text-[11px] text-subtle">Admin status</label>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_STATUSES.map(s => (
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

        {/* Role / site — stored on each node's logical node */}
        {(action === 'role' || action === 'site') && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-subtle">{action === 'role' ? 'Role' : 'Site'}</label>
            <input
              type="text"
              autoFocus
              list={action === 'site' ? 'bulk-site-options' : undefined}
              value={action === 'role' ? role : site}
              onChange={e => (action === 'role' ? setRole : setSite)(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleApply() }}
              placeholder={action === 'role' ? 'e.g. core' : 'e.g. sto1'}
              className={INPUT_CLS}
            />
            {action === 'site' && (
              <datalist id="bulk-site-options">
                {sites.map(s => <option key={s.id ?? s.name} value={s.name} />)}
              </datalist>
            )}
            <p className="text-[10px] text-subtle/70">
              Applied to each node's logical node — other nodes sharing it change too.
            </p>
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
