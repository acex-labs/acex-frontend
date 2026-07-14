import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function TableToolbar({ filters = [], values = {}, onChange, actions }) {
  const [local, setLocal] = useState(values)
  const timerRef = useRef(null)

  // Sync from URL on browser back/forward
  useEffect(() => {
    setLocal(values)
  }, [JSON.stringify(values)]) // eslint-disable-line

  const handleChange = (key, val) => {
    const next = { ...local, [key]: val }
    setLocal(next)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(next), 400)
  }

  const handleClear = (key) => {
    const next = { ...local, [key]: '' }
    setLocal(next)
    clearTimeout(timerRef.current)
    onChange(next)
  }

  const hasActiveFilters = filters.some(f => local[f.key])

  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-edge shrink-0 flex-wrap">
      {filters.map(f => (
        <div key={f.key} className="relative">
          <input
            type="text"
            value={local[f.key] ?? ''}
            onChange={e => handleChange(f.key, e.target.value)}
            placeholder={f.label}
            className={[
              'h-7 pl-2.5 pr-6 text-xs rounded border transition-colors bg-surface-hi text-content placeholder:text-subtle focus:outline-none',
              local[f.key] ? 'border-brand/50' : 'border-edge focus:border-brand',
            ].join(' ')}
            style={{ width: f.width ?? '140px' }}
          />
          {local[f.key] && (
            <button
              onClick={() => handleClear(f.key)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-subtle hover:text-content"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}

      {hasActiveFilters && (
        <button
          onClick={() => {
            const cleared = Object.fromEntries(filters.map(f => [f.key, '']))
            setLocal(prev => ({ ...prev, ...cleared }))
            clearTimeout(timerRef.current)
            onChange({ ...local, ...cleared })
          }}
          className="text-[11px] text-subtle hover:text-content transition-colors px-1"
        >
          Clear all
        </button>
      )}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
