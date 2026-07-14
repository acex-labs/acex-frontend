import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { searchNodeInstances } from '../../api/configComponents'

export default function NodeSearch({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)

  const { data } = useQuery({
    queryKey: ['node-instance-search', query],
    queryFn: () => searchNodeInstances(query),
    enabled: query.length >= 1,
    staleTime: 30_000,
  })

  const results = data?.items ?? []

  const select = (node) => {
    onChange(node)
    setQuery('')
    setOpen(false)
  }

  const clear = () => {
    onChange(null)
    setQuery('')
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 bg-surface-hi border border-edge rounded px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-content">{value.hostname ?? `Node ${value.id}`}</div>
          <div className="text-[10px] text-subtle mt-0.5">
            {[value.site, value.role, `#${value.id}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={clear} className="text-subtle hover:text-content transition-colors shrink-0">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface-hi border border-edge rounded px-3 py-2">
        <Search size={13} className="text-subtle shrink-0" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search by hostname…"
          className="flex-1 bg-transparent text-[12px] text-content outline-none placeholder:text-subtle/40"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface border border-edge rounded-md shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map(n => (
            <button
              key={n.id}
              onMouseDown={() => select(n)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hi text-left transition-colors border-b border-edge/30 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-content">{n.hostname ?? `Node ${n.id}`}</div>
                <div className="text-[10px] text-subtle">
                  {[n.site, n.role, `#${n.id}`].filter(Boolean).join(' · ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
