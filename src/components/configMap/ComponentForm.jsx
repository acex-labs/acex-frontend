import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

function FieldInput({ field, value, onChange, instances }) {
  const { type, required, enum_values, is_reference, reference_target } = field

  if (is_reference) {
    const options = instances.filter(i => i.component === reference_target)
    return (
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="w-full bg-surface border border-edge rounded px-2 py-1.5 text-[12px] text-content"
      >
        <option value="">— select —</option>
        {options.map(i => (
          <option key={i.id} value={i.variableName}>{i.variableName}</option>
        ))}
      </select>
    )
  }

  if (enum_values?.length) {
    return (
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="w-full bg-surface border border-edge rounded px-2 py-1.5 text-[12px] text-content"
      >
        {!required && <option value="">— none —</option>}
        {enum_values.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    )
  }

  if (type === 'boolean') {
    return (
      <select
        value={value === undefined ? '' : String(value)}
        onChange={e => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
        className="w-full bg-surface border border-edge rounded px-2 py-1.5 text-[12px] text-content"
      >
        {!required && <option value="">— none —</option>}
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    )
  }

  if (type === 'integer' || type === 'float') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full bg-surface border border-edge rounded px-2 py-1.5 text-[12px] text-content outline-none focus:border-brand/50"
      />
    )
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || undefined)}
      placeholder={required ? 'required' : 'optional'}
      className="w-full bg-surface border border-edge rounded px-2 py-1.5 text-[12px] text-content outline-none focus:border-brand/50 placeholder:text-subtle/30"
    />
  )
}

export default function ComponentForm({ instance, component, instances, onChange, onRemove }) {
  const [showOptional, setShowOptional] = useState(false)
  const { variableName, values } = instance
  const { name, fields } = component

  const required = fields.filter(f => f.required)
  const optional = fields.filter(f => !f.required)

  const setField = (fieldName, val) =>
    onChange({ ...instance, values: { ...values, [fieldName]: val } })

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-hi/60 border-b border-edge">
        <span className="text-[11px] font-semibold text-content flex-1">{name}</span>
        <input
          value={variableName}
          onChange={e => onChange({ ...instance, variableName: e.target.value })}
          className="w-36 bg-surface border border-edge rounded px-2 py-1 text-[11px] font-mono text-content outline-none focus:border-brand/50"
          placeholder="variable_name"
        />
        <button
          onClick={onRemove}
          className="text-subtle hover:text-red-400 transition-colors ml-1"
          title="Remove"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Fields */}
      <div className="p-3 space-y-2.5">
        {required.map(f => (
          <div key={f.name} className="grid grid-cols-[130px_1fr] gap-2 items-center">
            <label className="text-[11px] font-mono text-content truncate" title={f.name}>
              {f.name}
              <span className="text-red-400/70 ml-0.5">*</span>
            </label>
            <FieldInput
              field={f}
              value={values[f.name]}
              onChange={v => setField(f.name, v)}
              instances={instances}
            />
          </div>
        ))}

        {optional.length > 0 && (
          <>
            <button
              onClick={() => setShowOptional(v => !v)}
              className="flex items-center gap-1 text-[10px] text-subtle hover:text-content transition-colors"
            >
              {showOptional ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {optional.length} optional {optional.length === 1 ? 'field' : 'fields'}
            </button>
            {showOptional && optional.map(f => (
              <div key={f.name} className="grid grid-cols-[130px_1fr] gap-2 items-center">
                <label className="text-[11px] font-mono text-subtle truncate" title={f.name}>
                  {f.name}
                </label>
                <FieldInput
                  field={f}
                  value={values[f.name]}
                  onChange={v => setField(f.name, v)}
                  instances={instances}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
