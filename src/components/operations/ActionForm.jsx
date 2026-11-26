const INPUT = 'w-full px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50'

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-subtle">
      {label}
      {children}
      {hint && <span className="text-[10px] text-subtle/70">{hint}</span>}
    </label>
  )
}

// An action's params, built from its schema: one field each, bounded as the API bounds them.
export default function ActionForm({ fields, values, onChange }) {
  const set = key => e => onChange({ ...values, [key]: e.target.value })
  return (
    <div className="grid grid-cols-3 gap-3">
      {fields.map(f => (
        <Field key={f.key} label={f.required ? `${f.label} *` : f.label} hint={f.hint}>
          {f.kind === 'enum' || f.kind === 'boolean' ? (
            <select value={values[f.key] ?? ''} onChange={set(f.key)} className={INPUT}>
              {!f.required && <option value="">—</option>}
              {(f.kind === 'boolean' ? ['true', 'false'] : f.options).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={f.kind === 'integer' || f.kind === 'number' ? 'number' : 'text'}
              min={f.min}
              max={f.max}
              value={values[f.key] ?? ''}
              onChange={set(f.key)}
              placeholder={f.kind === 'list' ? '10, 20' : ''}
              className={INPUT}
            />
          )}
        </Field>
      ))}
    </div>
  )
}
