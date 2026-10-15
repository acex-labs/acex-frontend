import { useMemo, useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Inbox, X, ArrowRight, Search, AlertTriangle } from 'lucide-react'
import { fetchAssets } from '../../api/inventory'
import { claimAsset, fetchAwaitingClaim } from '../../api/ztp'
import { useDebounce } from '../../hooks/useDebounce'
import PageHeader from '../../components/ui/PageHeader'
import VendorIcon from '../../components/ui/VendorIcon'
import Pagination from '../../components/table/Pagination'
import LogicalNodePicker from '../../components/ztp/LogicalNodePicker'

const PAGE_SIZE = 50
const INPUT_CLS = 'h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 transition-colors'

export default function UnclaimedAssetsPage() {
  const queryClient = useQueryClient()
  const [serial, setSerial] = useState('')
  const dSerial = useDebounce(serial.trim(), 250)
  const [discoveredOnly, setDiscoveredOnly] = useState(false)
  const [site, setSite] = useState('')   // kept here so it survives jumping to the next asset
  const [selected, setSelected] = useState(null)
  const [mappings, setMappings] = useState(new Map())   // asset id → { asset, logicalNode }, kept while a search hides the asset
  const [errors, setErrors] = useState(new Map())       // asset id → message from the last apply
  const [applying, setApplying] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [pageOffset, setPageOffset] = useState(0)

  const { data: assetList = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', 'unassigned', dSerial],
    queryFn: async () => {
      const limit = 500
      const items = []
      for (let offset = 0; ; offset += limit) {
        const page = await fetchAssets({ assigned: false, serial_number: dSerial || undefined, limit, offset })
        items.push(...page.items)
        if (page.items.length < limit || items.length >= page.total) return items
      }
    },
    placeholderData: keepPreviousData,
    enabled: !discoveredOnly,
  })

  // Discovered: approved discoveries whose asset no node has claimed yet. Few enough to search here.
  const { data: discoveries = [], isLoading: discoveriesLoading } = useQuery({
    queryKey: ['ztp', 'discoveries', 'awaiting-claim'],
    queryFn: fetchAwaitingClaim,
    enabled: discoveredOnly,
  })
  const discovered = useMemo(
    () => discoveries
      .filter(d => d.serial_number.toLowerCase().includes(dSerial.toLowerCase()))
      .map(d => ({
        id: d.asset_id, serial_number: d.serial_number, vendor: d.vendor, hardware_model: d.hardware_model,
        os: d.os, os_version: d.os_version, source_ip: d.source_ip,
      })),
    [discoveries, dSerial],
  )

  const assets = discoveredOnly ? discovered : assetList
  const isLoading = discoveredOnly ? discoveriesLoading : assetsLoading

  // The list shrinks after a claim, so the page can't stay past the end.
  const offset = Math.min(pageOffset, Math.max(0, Math.ceil(assets.length / PAGE_SIZE) - 1) * PAGE_SIZE)
  const pageAssets = assets.slice(offset, offset + PAGE_SIZE)
  const takenIds = useMemo(() => new Set([...mappings.values()].map(m => m.logicalNode.id)), [mappings])
  const replaceCount = [...mappings.values()].filter(m => m.logicalNode.assigned).length

  const pick = (ln) => {
    setMappings(prev => new Map(prev).set(selected.id, { asset: selected, logicalNode: ln }))
    setConfirmReplace(false)
    // Jump to the next unmapped asset so a batch can be mapped click-by-click.
    const idx = assets.findIndex(a => a.id === selected.id)
    const next = [...assets.slice(idx + 1), ...assets.slice(0, idx)].find(a => !mappings.has(a.id) && a.id !== selected.id)
    setSelected(next ?? null)
    if (next) setPageOffset(Math.floor(assets.indexOf(next) / PAGE_SIZE) * PAGE_SIZE)
  }

  const unmap = (assetId) => {
    setMappings(prev => { const m = new Map(prev); m.delete(assetId); return m })
    setConfirmReplace(false)
  }

  const apply = async () => {
    if (replaceCount > 0 && !confirmReplace) { setConfirmReplace(true); return }
    setApplying(true)
    const entries = [...mappings.entries()]
    const results = await Promise.allSettled(entries.map(([, mapping]) => claimAsset(mapping)))
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
    setSelected(null)
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
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            autoFocus
            value={serial}
            onChange={e => { setSerial(e.target.value); setPageOffset(0) }}
            placeholder="Search serial…"
            className={`${INPUT_CLS} w-56 pl-6`}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-subtle cursor-pointer select-none">
          <input type="checkbox" checked={discoveredOnly} onChange={e => { setDiscoveredOnly(e.target.checked); setPageOffset(0) }} />
          Discovered only
        </label>
        <span className="ml-auto text-[11px] text-subtle">
          {isLoading ? '—' : [
            `${assets.length} ${dSerial ? 'matching' : discoveredOnly ? 'discovered' : 'unclaimed'}`,
            `${mappings.size} mapped`,
          ].join(' · ')}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Assets */}
        <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto">
          {!isLoading && assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Inbox size={28} className="text-subtle mb-3" />
              {dSerial ? (
                <h2 className="text-sm font-medium text-content">No {discoveredOnly ? 'discovered' : 'unclaimed'} asset matches “{dSerial}”</h2>
              ) : discoveredOnly ? (
                <>
                  <h2 className="text-sm font-medium text-content">No discovered assets waiting</h2>
                  <p className="mt-1 text-xs text-subtle max-w-sm">No approved discovery has an asset that isn't bound to a logical node.</p>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-medium text-content">No unclaimed assets</h2>
                  <p className="mt-1 text-xs text-subtle max-w-sm">All hardware is bound to a logical node.</p>
                </>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="sticky top-0 bg-canvas border-b border-edge z-10">
                  {['Hardware', 'Serial', discoveredOnly && 'Source IP', 'OS', 'Driver', 'Logical node'].filter(Boolean).map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageAssets.map(asset => {
                  const ln = mappings.get(asset.id)?.logicalNode
                  const err = errors.get(asset.id)
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelected(asset)}
                      className={[
                        'border-b border-edge transition-colors cursor-pointer',
                        asset.id === selected?.id ? 'bg-brand/5' : 'hover:bg-surface-hi',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2.5 text-xs text-content">
                        <div className="flex items-center gap-1.5">
                          <VendorIcon vendor={asset.vendor} size={13} />
                          {[asset.vendor, asset.hardware_model].filter(Boolean).join(' ') || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-content">{asset.serial_number}</td>
                      {discoveredOnly && <td className="px-4 py-2.5 text-xs font-mono text-subtle">{asset.source_ip}</td>}
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
        {assets.length > PAGE_SIZE && (
          <Pagination offset={offset} limit={PAGE_SIZE} total={assets.length} onChange={setPageOffset} />
        )}
        </div>

        {/* Logical node picker */}
        {selected && (
          <div className="w-80 shrink-0 border-l border-edge bg-surface">
            <LogicalNodePicker key={selected.id} asset={selected} siteFilter={site} onSiteFilterChange={setSite} takenIds={takenIds} onPick={pick} />
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
