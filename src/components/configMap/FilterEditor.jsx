const OPERATORS  = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte']
const ATTRIBUTES = ['role', 'site', 'hostname', 'sequence']

export default function FilterEditor({ value, onChange }) {
  const active = value !== null && value !== undefined

  const update = (patch) => onChange({ ...value, ...patch })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Filter</span>
        <button
          onClick={() => onChange(active ? null : { attribute: 'role', operator: 'eq', value: '' })}
          className="text-[11px] text-brand hover:text-brand/70 transition-colors"
        >
          {active ? 'Remove' : '+ Add filter'}
        </button>
      </div>

      {active && (
        <div className="flex gap-2">
          <input
            list="filter-attrs"
            value={value.attribute}
            onChange={e => update({ attribute: e.target.value })}
            placeholder="attribute"
            className="flex-1 min-w-0 bg-surface-hi border border-edge rounded px-2 py-1.5 text-[12px] text-content outline-none focus:border-brand/50"
          />
          <datalist id="filter-attrs">
            {ATTRIBUTES.map(a => <option key={a} value={a} />)}
          </datalist>

          <select
            value={value.operator}
            onChange={e => update({ operator: e.target.value })}
            className="bg-surface-hi border border-edge rounded px-2 py-1.5 text-[12px] text-content"
          >
            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>

          <input
            value={value.value}
            onChange={e => update({ value: e.target.value })}
            placeholder="value or /regex/"
            className="flex-1 min-w-0 bg-surface-hi border border-edge rounded px-2 py-1.5 text-[12px] text-content outline-none focus:border-brand/50"
          />
        </div>
      )}
    </div>
  )
}
