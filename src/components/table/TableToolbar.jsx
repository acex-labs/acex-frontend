import { useState, useEffect, useRef, useId } from 'react'
import { Search, X } from 'lucide-react'

// A filter without `options` is a text box. One flagged `search: true` is the page's quick search: it has a search
// icon and takes the room the other filters leave, instead of a width of its own. Its `hint` names the fields it
// looks in, so the placeholder can stay short: a note under the box, shown while the pointer is over it or while it
// has focus and nothing is typed yet.
export default function TableToolbar({ filters = [], values = {}, onChange, actions }) {
  const [local, setLocal] = useState(values)
  const timerRef = useRef(null)
  const hintId = useId()

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

  // Selects apply immediately — there is nothing to debounce.
  const handleSelect = (key, val) => {
    const next = { ...local, [key]: val }
    setLocal(next)
    clearTimeout(timerRef.current)
    onChange(next)
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
      {filters.map(f => f.options ? (
        <select
          key={f.key}
          value={local[f.key] ?? ''}
          onChange={e => handleSelect(f.key, e.target.value)}
          className={[
            'h-7 px-2 text-xs rounded border transition-colors bg-surface-hi focus:outline-none',
            local[f.key] ? 'border-brand/50 text-content' : 'border-edge text-subtle focus:border-brand',
          ].join(' ')}
          style={{ width: f.width ?? '140px' }}
        >
          <option value="">{f.label}</option>
          {f.options.map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <div key={f.key} className={f.search ? 'group relative flex-1 min-w-[16rem] max-w-xl' : 'relative'}>
          {f.search && (
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          )}
          <input
            type="text"
            value={local[f.key] ?? ''}
            onChange={e => handleChange(f.key, e.target.value)}
            placeholder={f.label}
            aria-describedby={f.hint ? hintId : undefined}
            className={[
              'h-7 pr-6 text-xs rounded border transition-colors bg-surface-hi text-content placeholder:text-subtle focus:outline-none',
              f.search ? 'w-full pl-7' : 'pl-2.5',
              local[f.key] ? 'border-brand/50' : 'border-edge focus:border-brand',
            ].join(' ')}
            style={f.search ? undefined : { width: f.width ?? '140px' }}
          />
          {f.hint && (
            <div
              id={hintId}
              role="tooltip"
              className={[
                'hidden group-hover:block absolute left-0 top-full z-20 mt-1 max-w-full px-2.5 py-1.5 rounded border',
                'border-edge bg-surface-hi text-[11px] leading-snug text-subtle shadow-lg pointer-events-none',
                local[f.key] ? '' : 'group-focus-within:block',
              ].join(' ')}
            >
              {f.hint}
            </div>
          )}
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
