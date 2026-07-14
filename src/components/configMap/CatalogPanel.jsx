import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

export default function CatalogPanel({ components, onAdd, onSelect, selected }) {
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('all')

  const categories = useMemo(() => {
    const cats = [...new Set(components.map(c => c.category))].sort()
    return ['all', ...cats]
  }, [components])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return components.filter(c => {
      const matchCat = category === 'all' || c.category === category
      const matchQ   = !q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [components, search, category])

  const grouped = useMemo(() => {
    if (category !== 'all') return { [category]: filtered }
    return filtered.reduce((acc, c) => {
      if (!acc[c.category]) acc[c.category] = []
      acc[c.category].push(c)
      return acc
    }, {})
  }, [filtered, category])

  return (
    <div className="flex flex-col h-full">
      {/* Search + category */}
      <div className="shrink-0 p-3 space-y-2 border-b border-edge">
        <div className="flex items-center gap-2 bg-surface-hi border border-edge rounded px-2.5 py-1.5">
          <Search size={12} className="text-subtle shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search components…"
            className="flex-1 bg-transparent text-[12px] text-content outline-none placeholder:text-subtle/40"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={[
                'px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors',
                category === cat ? 'bg-brand/15 text-brand' : 'text-subtle hover:text-content',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).map(([cat, comps]) => (
          <div key={cat}>
            {category === 'all' && (
              <div className="sticky top-0 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-subtle/60 bg-surface border-b border-edge/30">
                {cat}
              </div>
            )}
            {comps.map(c => {
              const isSelected = selected?.name === c.name
              return (
                <div
                  key={c.name}
                  onClick={() => onSelect?.(c)}
                  className={[
                    'flex items-center gap-2 px-3 py-2.5 border-b border-edge/20 transition-colors group',
                    onSelect ? 'cursor-pointer' : '',
                    isSelected
                      ? 'bg-brand/8 border-l-2 border-l-brand'
                      : 'hover:bg-surface-hi/60',
                  ].join(' ')}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] font-medium ${isSelected ? 'text-brand' : 'text-content'}`}>
                      {c.name}
                    </div>
                    {c.description && (
                      <div className="text-[10px] text-subtle truncate mt-0.5">{c.description}</div>
                    )}
                  </div>
                  {onAdd && (
                    <button
                      onClick={e => { e.stopPropagation(); onAdd(c) }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-brand/10 text-brand hover:bg-brand/20 rounded text-[10px] font-semibold transition-all"
                    >
                      Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-subtle">No components match.</div>
        )}
      </div>
    </div>
  )
}
