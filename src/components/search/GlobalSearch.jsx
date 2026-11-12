import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Search, Cloud, Server, MapPin, Globe, Package, Boxes, BookUser, Loader2 } from 'lucide-react'
import { searchInventory, SEARCH_MIN_LENGTH } from '../../api/search'
import { useDebounce } from '../../hooks/useDebounce'

// Regions have no page of their own; a hit opens the list.
const TYPES = {
  logical_node:  { label: 'Logical nodes',  icon: Cloud,    href: hit => `/network/logical-nodes/${hit.id}` },
  node_instance: { label: 'Nodes',          icon: Server,   href: hit => `/network/nodes/${hit.id}` },
  site:          { label: 'Sites',          icon: MapPin,   href: hit => `/network/sites/${hit.id}` },
  region:        { label: 'Regions',        icon: Globe,    href: () => '/network/regions' },
  asset:         { label: 'Assets',         icon: Package,  href: hit => `/network/assets/${hit.id}` },
  asset_cluster: { label: 'Asset clusters', icon: Boxes,    href: hit => `/network/asset-clusters/${hit.id}` },
  contact:       { label: 'Contacts',       icon: BookUser, href: hit => `/network/contacts/${hit.id}` },
}

const FIELD_LABELS = {
  management_ip: 'IP',
  serial_number: 'serial',
  display_name:  'name',
  hardware_model: 'model',
}

function SearchHit({ hit, active, onPick, onHover }) {
  // Say where the text was found when it isn't in the label itself.
  const via = hit.matched_value && hit.matched_value !== hit.label
    ? `${FIELD_LABELS[hit.matched_field] ?? hit.matched_field.replaceAll('_', ' ')}: ${hit.matched_value}`
    : null
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onPick}
      onMouseEnter={onHover}
      className={`w-full text-left px-4 py-1.5 flex items-baseline gap-3 transition-colors ${active ? 'bg-surface-hi' : ''}`}
    >
      <span className="text-xs font-medium text-content truncate">{hit.label}</span>
      {hit.sublabel && <span className="text-[11px] text-subtle truncate">{hit.sublabel}</span>}
      {via && <span className="ml-auto shrink-0 text-[10px] text-subtle font-mono">{via}</span>}
    </button>
  )
}

// One box that searches the whole inventory: nodes, logical nodes, sites, regions, assets, contacts.
export default function GlobalSearch() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const q = useDebounce(text.trim(), 250)
  const enabled = q.length >= SEARCH_MIN_LENGTH

  const { data, isFetching, isError } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchInventory(q),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  const groups = useMemo(() => (enabled ? data?.groups ?? [] : []), [enabled, data])
  const hits = useMemo(
    () => groups.flatMap(g => g.items.map(hit => ({ hit, href: TYPES[g.type]?.href(hit) ?? '/' }))),
    [groups],
  )

  useEffect(() => setActiveIndex(0), [q])

  useEffect(() => {
    const close = e => { if (!containerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const pick = href => {
    setOpen(false)
    navigate(href)
  }

  const onKeyDown = e => {
    if (e.key === 'Escape') {
      if (open) setOpen(false)
      else setText('')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex(i => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && hits[activeIndex]) {
      pick(hits[activeIndex].href)
    }
  }

  const showPanel = open && enabled
  let index = 0

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          value={text}
          onChange={e => { setText(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search nodes, sites, regions, assets, IP addresses, serial numbers…"
          className="w-full h-10 pl-9 pr-9 text-sm rounded-md border border-edge bg-surface text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 transition-colors"
        />
        {isFetching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle animate-spin" />}
      </div>

      {showPanel && (
        // Above Leaflet's panes and controls (z-index up to 1000) on the dashboard map.
        <div className="absolute z-[1100] mt-1 w-full max-h-[60vh] overflow-auto bg-surface border border-edge rounded-md shadow-lg py-1">
          {isError && <div className="px-4 py-3 text-xs text-subtle">Search failed.</div>}
          {!isError && data && groups.length === 0 && !isFetching && (
            <div className="px-4 py-3 text-xs text-subtle">No matches for “{q}”.</div>
          )}
          {groups.map(group => {
            const type = TYPES[group.type]
            const Icon = type?.icon ?? Search
            return (
              <div key={group.type} className="py-1">
                <div className="px-4 py-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">
                  <Icon size={11} />
                  {type?.label ?? group.type}
                  <span className="ml-auto font-normal normal-case tracking-normal">
                    {group.total > group.items.length ? `${group.items.length} of ${group.total}` : group.total}
                  </span>
                </div>
                {group.items.map(hit => {
                  const i = index++
                  return (
                    <SearchHit
                      key={hit.id}
                      hit={hit}
                      active={i === activeIndex}
                      onPick={() => pick(hits[i].href)}
                      onHover={() => setActiveIndex(i)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
