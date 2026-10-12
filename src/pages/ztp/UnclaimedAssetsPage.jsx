import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, X, ArrowRight, Search, AlertTriangle } from 'lucide-react'
import { fetchAssets, fetchLogicalNodes } from '../../api/inventory'
import { claimAsset } from '../../api/ztp'
import { useDebounce } from '../../hooks/useDebounce'
import PageHeader from '../../components/ui/PageHeader'
import VendorIcon from '../../components/ui/VendorIcon'

const INPUT_CLS = 'h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 transition-colors'

const byPlan = (a, b) =>
  (a.site ?? '').localeCompare(b.site ?? '') ||
  (a.sequence ?? 0) - (b.sequence ?? 0) ||
  a.hostname.localeCompare(b.hostname)

function LogicalNodeOption({ ln, taken, onPick }) {
  return (
    <button
      onClick={() => onPick(ln)}
      disabled={taken}
      className="w-full text-left px-4 py-2 border-b border-edge/50 hover:bg-surface-hi disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-content truncate">{ln.hostname}</span>
        {taken && <span className="ml-auto text-[10px] text-subtle">already mapped</span>}
      </div>
      <div className="text-[11px] text-subtle truncate">{[ln.site, ln.role].filter(Boolean).join(' · ') || '—'}</div>
    </button>
  )
}

function Picker({ asset, site, takenIds, onPick }) {
  const [search, setSearch] = useState('')
  const q = useDebounce(search.trim(), 250)

  // Planned = logical nodes without a node instance. Loaded up front — these are the likely targets.
  const { data: planned = [], isLoading } = useQuery({
    queryKey: ['logical-nodes', 'unassigned', site],
    queryFn: () => fetchLogicalNodes({ assigned: false, site: site || undefined, limit: 1000 }).then(d => d.items),
  })

  // In service = already instantiated. Only fetched on search: picking one means replacing a device.
  const { data: inService = [] } = useQuery({
    queryKey: ['logical-nodes', 'assigned', q],
    queryFn: () => fetchLogicalNodes({ assigned: true, hostname: q, limit: 20 }).then(d => d.items),
    enabled: q.length > 0,
  })

  const plannedMatches = useMemo(
    () => planned.filter(ln => !q || ln.hostname.toLowerCase().includes(q.toLowerCase())).sort(byPlan),
    [planned, q],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-edge space-y-2">
        <div className="text-[11px] text-subtle">
          Map <span className="text-content font-medium">{asset.serial_number}</span>
          {' '}({[asset.vendor, asset.hardware_model].filter(Boolean).join(' ')}) to
        </div>
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hostname…"
            className={`${INPUT_CLS} w-full pl-6`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-subtle">
          Planned {!isLoading && <span className="font-normal">({plannedMatches.length})</span>}
        </div>
        {isLoading ? (
          <p className="px-4 py-2 text-xs text-subtle animate-pulse">Loading…</p>
        ) : plannedMatches.length === 0 ? (
          <p className="px-4 py-2 text-xs text-subtle">No planned logical nodes{q ? ' match' : site ? ' at this site' : ''}.</p>
        ) : (
          plannedMatches.map(ln => (
            <LogicalNodeOption key={ln.id} ln={{ ...ln, assigned: false }} taken={takenIds.has(ln.id)} onPick={onPick} />
          ))
        )}

        <div className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-subtle">
          In service <span className="font-normal normal-case tracking-normal">— replaces the current device</span>
        </div>
        {!q ? (
          <p className="px-4 py-2 text-xs text-subtle">Search to find a node whose device is being replaced.</p>
        ) : inService.length === 0 ? (
          <p className="px-4 py-2 text-xs text-subtle">No match.</p>
        ) : (
          inService.map(ln => (
            <LogicalNodeOption key={ln.id} ln={{ ...ln, assigned: true }} taken={takenIds.has(ln.id)} onPick={onPick} />
          ))
        )}
      </div>
    </div>
  )
}

export default function UnclaimedAssetsPage() {
  const queryClient = useQueryClient()
  const [site, setSite] = useState('')
  const dSite = useDebounce(site.trim(), 300)
  const [selectedId, setSelectedId] = useState(null)
  const [mappings, setMappings] = useState(new Map())   // asset id → logical node
  const [errors, setErrors] = useState(new Map())       // asset id → message from the last apply
  const [applying, setApplying] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', 'unassigned'],
    queryFn: () => fetchAssets({ assigned: false, limit: 500 }).then(d => d.items),
  })

  const selected = assets.find(a => a.id === selectedId)
  const takenIds = useMemo(() => new Set([...mappings.values()].map(ln => ln.id)), [mappings])
  const replaceCount = [...mappings.values()].filter(ln => ln.assigned).length

  const pick = (ln) => {
    setMappings(prev => new Map(prev).set(selectedId, ln))
    setConfirmReplace(false)
    // Jump to the next unmapped asset so a batch can be mapped click-by-click.
    const idx = assets.findIndex(a => a.id === selectedId)
    const next = [...assets.slice(idx + 1), ...assets.slice(0, idx)].find(a => !mappings.has(a.id) && a.id !== selectedId)
    setSelectedId(next?.id ?? null)
  }

  const unmap = (assetId) => {
    setMappings(prev => { const m = new Map(prev); m.delete(assetId); return m })
    setConfirmReplace(false)
  }

  const apply = async () => {
    if (replaceCount > 0 && !confirmReplace) { setConfirmReplace(true); return }
    setApplying(true)
    const entries = [...mappings.entries()]
    const results = await Promise.allSettled(
      entries.map(([assetId, logicalNode]) => claimAsset({ asset: assets.find(a => a.id === assetId), logicalNode })),
    )
    // Keep failed mappings so they can be fixed and retried; drop the ones that went through.
    const failed = new Map()
    const remaining = new Map()
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        failed.set(entries[i][0], r.reason?.message ?? 'Failed')
        remaining.set(entries[i][0], entries[i][1])
      }
    })
    setErrors(failed)
    setMappings(remaining)
    setConfirmReplace(false)
    setApplying(false)
    setSelectedId(null)
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    queryClient.invalidateQueries({ queryKey: ['logical-nodes'] })
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['ztp'] })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Unclaimed Assets"
        description="Hardware not yet bound to a logical node. Map each asset to the logical node it should become."
      />

      <div className="flex items-center gap-2 px-6 py-2 border-b border-edge shrink-0">
        <input
          value={site}
          onChange={e => setSite(e.target.value)}
          placeholder="Suggest logical nodes at site…"
          className={`${INPUT_CLS} w-56`}
        />
        <span className="ml-auto text-[11px] text-subtle">
          {isLoading ? '—' : `${assets.length} unclaimed · ${mappings.size} mapped`}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Assets */}
        <div className="flex-1 overflow-auto">
          {!isLoading && assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Inbox size={28} className="text-subtle mb-3" />
              <h2 className="text-sm font-medium text-content">No unclaimed assets</h2>
              <p className="mt-1 text-xs text-subtle max-w-sm">All hardware is bound to a logical node.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="sticky top-0 bg-canvas border-b border-edge z-10">
                  {['Hardware', 'Serial', 'OS', 'Driver', 'Logical node'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => {
                  const ln = mappings.get(asset.id)
                  const err = errors.get(asset.id)
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedId(asset.id)}
                      className={[
                        'border-b border-edge transition-colors cursor-pointer',
                        asset.id === selectedId ? 'bg-brand/5' : 'hover:bg-surface-hi',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2.5 text-xs text-content">
                        <div className="flex items-center gap-1.5">
                          <VendorIcon vendor={asset.vendor} size={13} />
                          {[asset.vendor, asset.hardware_model].filter(Boolean).join(' ') || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-content">{asset.serial_number}</td>
                      <td className="px-4 py-2.5 text-xs text-subtle">{[asset.os, asset.os_version].filter(Boolean).join(' ') || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-subtle">{asset.ned_id ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {ln ? (
                          <div className="flex items-center gap-1.5">
                            <ArrowRight size={11} className="text-subtle" />
                            <span className="text-content font-medium">{ln.hostname}</span>
                            {ln.assigned && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">replaces device</span>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); unmap(asset.id) }}
                              className="ml-1 text-subtle hover:text-content"
                              title="Remove mapping"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                        {err && <div className="mt-1 text-[11px] text-red-400">{err}</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Logical node picker */}
        {selected && (
          <div className="w-80 shrink-0 border-l border-edge bg-surface">
            <Picker key={selected.id} asset={selected} site={dSite} takenIds={takenIds} onPick={pick} />
          </div>
        )}
      </div>

      {mappings.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-3 border-t border-edge bg-surface shrink-0">
          <span className="text-xs text-content">
            {mappings.size - replaceCount} new node{mappings.size - replaceCount === 1 ? '' : 's'}
            {replaceCount > 0 && <span className="text-amber-400"> · {replaceCount} device replacement{replaceCount === 1 ? '' : 's'}</span>}
          </span>
          {confirmReplace && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle size={11} />
              Replaced devices' nodes will need to be provisioned again.
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setMappings(new Map()); setErrors(new Map()); setConfirmReplace(false) }}
              disabled={applying}
              className="px-3 py-1.5 text-xs text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors"
            >
              Clear
            </button>
            <button
              onClick={apply}
              disabled={applying}
              className={[
                'px-4 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50',
                confirmReplace ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-brand text-white hover:bg-brand/90',
              ].join(' ')}
            >
              {applying ? 'Applying…' : confirmReplace ? 'Confirm' : `Apply ${mappings.size}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
