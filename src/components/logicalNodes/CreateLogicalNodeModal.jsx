import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { createLogicalNode, fetchAllSites } from '../../api/inventory'

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

export default function CreateLogicalNodeModal({ onClose, onSuccess }) {
  const [hostname, setHostname] = useState('')
  const [role, setRole] = useState('')
  const [site, setSite] = useState('')
  const [sequence, setSequence] = useState('')

  const { data: sites } = useQuery({
    queryKey: ['sites-all'],
    queryFn: fetchAllSites,
  })

  const mutation = useMutation({
    mutationFn: createLogicalNode,
    onSuccess: (created) => { onSuccess(created); onClose() },
  })

  const submit = () => {
    mutation.mutate({
      hostname: hostname.trim(),
      role: role.trim() || undefined,
      site: site.trim() || undefined,
      sequence: sequence !== '' ? Number(sequence) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">New Logical Node</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1">
          <FormField label="Hostname" required>
            <input
              type="text"
              value={hostname}
              onChange={e => setHostname(e.target.value)}
              autoFocus
              className={INPUT_CLS}
            />
          </FormField>
          <FormField label="Role">
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="core, distribution, access…"
              className={INPUT_CLS}
            />
          </FormField>
          <FormField label="Site">
            <input
              type="text"
              value={site}
              onChange={e => setSite(e.target.value)}
              list="logical-node-sites"
              className={INPUT_CLS}
            />
            <datalist id="logical-node-sites">
              {(sites ?? []).map(s => <option key={s.id ?? s.name} value={s.name} />)}
            </datalist>
          </FormField>
          <FormField label="Sequence">
            <input
              type="number"
              value={sequence}
              onChange={e => setSequence(e.target.value)}
              className={INPUT_CLS}
            />
          </FormField>

          {mutation.isError && (
            <p className="mt-2 text-[11px] text-red-400">Failed to create logical node.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!hostname.trim() || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
