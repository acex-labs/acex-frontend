import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Trash2 } from 'lucide-react'
import { createRegion, updateRegion, deleteRegion, fetchSites } from '../../api/inventory'

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
  const queryClient = useQueryClient()
  const [name, setName] = useState(region?.name ?? '')
  const [displayName, setDisplayName] = useState(region?.display_name ?? '')
  const [description, setDescription] = useState(region?.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { data: sitesData } = useQuery({
    queryKey: ['region-sites-count', region?.name],
    queryFn: () => fetchSites({ region: region.name, limit: 1 }),
    enabled: isEdit,
  })
  const siteCount = sitesData?.total ?? null

  const mutation = useMutation({
    mutationFn: (payload) => isEdit ? updateRegion(region.id, payload) : createRegion(payload),
    onSuccess: (saved) => { onSuccess(saved); onClose() },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteRegion(region.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      onSuccess(null)
      onClose()
    },
  })

  const submit = (e) => {
    e.preventDefault()
    const payload = { name: name.trim() }
    if (isEdit) {
      payload.display_name = displayName.trim() || null
      payload.description = description.trim() || null
    } else {
      if (displayName.trim()) payload.display_name = displayName.trim()
      if (description.trim()) payload.description = description.trim()
    }
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={submit} className="flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
            <h2 className="text-sm font-semibold text-content">{isEdit ? 'Edit Region' : 'New Region'}</h2>
            <button type="button" onClick={onClose} className="text-subtle hover:text-content transition-colors">
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
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={`${INPUT_CLS} resize-none`}
              />
            </FormField>

            {mutation.isError && (
              <p className="mt-2 text-[11px] text-red-400">Failed to {isEdit ? 'save' : 'create'} region.</p>
            )}
            {deleteMutation.isError && (
              <p className="mt-2 text-[11px] text-red-400">Failed to delete region.</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-edge shrink-0">
            <div>
              {isEdit && (confirmDelete ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-red-400">Delete?</span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={siteCount > 0}
                  title={siteCount > 0 ? 'Cannot delete: sites are still assigned to this region.' : undefined}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-red-400 disabled:opacity-40 disabled:hover:text-subtle transition-colors"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || mutation.isPending}
                className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                {mutation.isPending ? 'Saving…' : (isEdit ? 'Save' : 'Create')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
