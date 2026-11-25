import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { fetchSites } from '../../api/inventory'

const OPERATORS  = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte']
const ATTRIBUTES = ['role', 'site', 'hostname', 'sequence']
const NEW_FILTER = { attribute: 'role', operator: 'eq', value: '' }

const MATCHES = [
  { key: 'all', label: 'All', title: 'A node has to match every filter' },
  { key: 'any', label: 'Any', title: 'A node has to match at least one filter' },
]

// The filters that decide which nodes a generated ConfigMap applies to. With several, `match` says whether a node has
// to match all of them or any one.
export default function FilterEditor({ value, onChange, multiple = false, match = 'all', onMatchChange }) {
  const active = value !== null && value !== undefined
  const filters = multiple ? (Array.isArray(value) ? value : []) : (active ? [value] : [])

  // The sites that exist, offered as the value of a site filter. A name that is typed still goes through: the value
  // can also be a regular expression.
  const usesSite = filters.some(filter => filter.attribute === 'site')
  const { data: sites } = useQuery({
    queryKey: ['filter-sites'],
    queryFn: () => fetchSites({ limit: 1000 }).then(page => (page.items ?? []).map(site => site.name)),
    enabled: usesSite,
    staleTime: 5 * 60_000,
  })

  const update = (index, patch) => {
    if (multiple) {
      onChange(filters.map((filter, i) => i === index ? { ...filter, ...patch } : filter))
    } else {
      onChange({ ...value, ...patch })
    }
  }

  const addFilter = () => {
    if (multiple) {
      onChange([...filters, { ...NEW_FILTER }])
    } else {
      onChange({ ...NEW_FILTER })
    }
  }

  const removeFilter = (index) => {
    if (multiple) {
      onChange(filters.filter((_, i) => i !== index))
    } else {
      onChange(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Filter</span>
        {multiple && onMatchChange && filters.length > 1 && (
          <div role="group" aria-label="Match" className="flex items-center rounded border border-edge overflow-hidden">
            <span className="px-2 py-0.5 text-[10px] text-subtle">Match</span>
            {MATCHES.map(option => (
              <button
                key={option.key}
                type="button"
                title={option.title}
                aria-pressed={match === option.key}
                onClick={() => onMatchChange(option.key)}
                className={['px-2 py-0.5 text-[11px] font-medium transition-colors',
                  match === option.key ? 'bg-brand/15 text-brand' : 'text-subtle hover:text-content'].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={multiple ? addFilter : () => (active ? removeFilter(0) : addFilter())}
          className="text-[11px] text-brand hover:text-brand/70 transition-colors"
        >
          {multiple || !active ? (
            <span className="inline-flex items-center gap-1"><Plus size={12} />Add filter</span>
          ) : 'Remove'}
        </button>
      </div>

      {filters.length > 0 && (
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div key={index} className="flex gap-2">
              <select
                aria-label={`Filter ${index + 1} attribute`}
                value={filter.attribute}
                onChange={e => update(index, { attribute: e.target.value })}
                className="bg-surface-hi border border-edge rounded px-2 py-1.5 text-[12px] text-content"
              >
                {(ATTRIBUTES.includes(filter.attribute) ? ATTRIBUTES : [filter.attribute, ...ATTRIBUTES]).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <select
                value={filter.operator}
                onChange={e => update(index, { operator: e.target.value })}
                className="bg-surface-hi border border-edge rounded px-2 py-1.5 text-[12px] text-content"
              >
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>

              <input
                aria-label={`Filter ${index + 1} value`}
                list={filter.attribute === 'site' ? 'filter-sites' : undefined}
                value={filter.value}
                onChange={e => update(index, { value: e.target.value })}
                placeholder={filter.attribute === 'site' ? 'site name or /regex/' : 'value or /regex/'}
                className="flex-1 min-w-0 bg-surface-hi border border-edge rounded px-2 py-1.5 text-[12px] text-content outline-none focus:border-brand/50"
              />
              {multiple && (
                <button
                  type="button"
                  aria-label={`Remove filter ${index + 1}`}
                  onClick={() => removeFilter(index)}
                  className="shrink-0 text-subtle hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <datalist id="filter-sites">
            {(sites ?? []).map(name => <option key={name} value={name} />)}
          </datalist>
        </div>
      )}
    </div>
  )
}
