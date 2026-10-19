import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { fetchLogicalNodes } from '../../api/inventory'
import { useDebounce } from '../../hooks/useDebounce'

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

// Picks the logical node an asset should become. Planned nodes are offered first; one in service
// means replacing its device. Each picked node carries assigned: whether it is in service.
export default function LogicalNodePicker({ asset, siteFilter, onSiteFilterChange, takenIds = new Set(), onPick }) {
  const [search, setSearch] = useState('')
  const q = useDebounce(search.trim(), 250)
  const site = useDebounce(siteFilter.trim(), 300)

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
        <input
          value={siteFilter}
          onChange={e => onSiteFilterChange(e.target.value)}
          placeholder="Site…"
          className={`${INPUT_CLS} w-full`}
        />
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
