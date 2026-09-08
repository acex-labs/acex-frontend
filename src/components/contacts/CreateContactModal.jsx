import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { createContact } from '../../api/inventory'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

const FIELDS = [
  { key: 'name',         label: 'Name',         required: true },
  { key: 'display_name', label: 'Display Name' },
  { key: 'first_name',   label: 'First Name' },
  { key: 'family_name',  label: 'Family Name' },
  { key: 'role',         label: 'Role' },
  { key: 'email',        label: 'Email',  type: 'email' },
  { key: 'phone',        label: 'Phone',  type: 'tel' },
]

function FormField({ label, required, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] text-subtle mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function CreateContactModal({ onClose, onSuccess }) {
  const [values, setValues] = useState({})
  const setField = (key, val) => setValues(prev => ({ ...prev, [key]: val }))

  const mutation = useMutation({
    mutationFn: createContact,
    onSuccess: (created) => { onSuccess(created); onClose() },
  })

  const submit = () => {
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v?.trim?.())
    )
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">New Contact</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1">
          {FIELDS.map((f, i) => (
            <FormField key={f.key} label={f.label} required={f.required}>
              <input
                type={f.type ?? 'text'}
                value={values[f.key] ?? ''}
                onChange={e => setField(f.key, e.target.value)}
                autoFocus={i === 0}
                className={INPUT_CLS}
              />
            </FormField>
          ))}

          {mutation.isError && (
            <p className="mt-2 text-[11px] text-red-400">Failed to create contact.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!values.name?.trim() || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
