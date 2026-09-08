import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { createRegion, updateRegion } from '../../api/inventory'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

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

export default function RegionFormModal({ region, onClose, onSuccess }) {
  const isEdit = !!region
  const [name, setName] = useState(region?.name ?? '')
  const [displayName, setDisplayName] = useState(region?.display_name ?? '')
  const [description, setDescription] = useState(region?.description ?? '')

  const mutation = useMutation({
    mutationFn: (payload) => isEdit ? updateRegion(region.id, payload) : createRegion(payload),
    onSuccess: (saved) => { onSuccess(saved); onClose() },
  })

  const submit = () => {
    mutation.mutate({
      name: name.trim(),
      display_name: displayName.trim() || undefined,
      description: description.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">{isEdit ? 'Edit Region' : 'New Region'}</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1">
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className={INPUT_CLS}
            />
          </FormField>
          <FormField label="Display Name">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className={INPUT_CLS}
            />
          </FormField>
          <FormField label="Description">
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={INPUT_CLS}
            />
          </FormField>

          {mutation.isError && (
            <p className="mt-2 text-[11px] text-red-400">Failed to {isEdit ? 'save' : 'create'} region.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Saving…' : (isEdit ? 'Save' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  )
}
