import { Plus, X } from 'lucide-react'

const OPERATORS  = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte']
const ATTRIBUTES = ['role', 'site', 'hostname', 'sequence']
const NEW_FILTER = { attribute: 'role', operator: 'eq', value: '' }

export default function FilterEditor({ value, onChange, multiple = false }) {
  const active = value !== null && value !== undefined
  const filters = multiple ? (Array.isArray(value) ? value : []) : (active ? [value] : [])

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
              <input
                list="filter-attrs"
                value={filter.attribute}
                onChange={e => update(index, { attribute: e.target.value })}
                placeholder="attribute"
                className="flex-1 min-w-0 bg-surface-hi border border-edge rounded px-2 py-1.5 text-[12px] text-content outline-none focus:border-brand/50"
              />

              <select
                value={filter.operator}
                onChange={e => update(index, { operator: e.target.value })}
                className="bg-surface-hi border border-edge rounded px-2 py-1.5 text-[12px] text-content"
              >
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>

              <input
                value={filter.value}
                onChange={e => update(index, { value: e.target.value })}
                placeholder="value or /regex/"
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
          <datalist id="filter-attrs">
            {ATTRIBUTES.map(a => <option key={a} value={a} />)}
          </datalist>
        </div>
      )}
    </div>
  )
}
