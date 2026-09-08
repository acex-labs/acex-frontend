import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Pencil, Trash2, X, Check } from 'lucide-react'
import { fetchAsset, updateAsset, deleteAsset } from '../../api/inventory'
import VendorIcon from '../../components/ui/VendorIcon'

const FIELDS = [
  { key: 'vendor',         label: 'Vendor',        required: true },
  { key: 'hardware_model', label: 'Model' },
  { key: 'os',             label: 'OS' },
  { key: 'os_version',     label: 'OS Version' },
  { key: 'serial_number',  label: 'Serial Number' },
  { key: 'ned_id',         label: 'Driver (NED)' },
]

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-4 py-2 border-b border-edge last:border-0">
      <dt className="w-32 shrink-0 text-[11px] text-subtle">{label}</dt>
      <dd className="text-xs text-content break-all">{value}</dd>
    </div>
  )
}

function EditField({ field, value, onChange }) {
  return (
    <div className="flex gap-4 py-1.5 border-b border-edge last:border-0 items-center">
      <label className="w-32 shrink-0 text-[11px] text-subtle">{field.label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(field.key, e.target.value)}
        required={field.required}
        className="flex-1 bg-surface-hi border border-edge rounded px-2 py-1 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors"
      />
    </div>
  )
}

export default function AssetPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => fetchAsset(id),
  })

  const mutation = useMutation({
    mutationFn: (data) => updateAsset(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['asset', id], updated)
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      navigate('/network/assets')
    },
  })

  const startEdit = () => {
    setDraft({ ...asset })
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditing(false)
    mutation.reset()
  }

  const setField = (key, value) => setDraft(d => ({ ...d, [key]: value || null }))

  const save = () => {
    if (!draft.vendor?.trim()) return
    mutation.mutate(draft)
  }

  const title = asset
    ? [asset.vendor, asset.hardware_model].filter(Boolean).join(' ') || asset.serial_number || `Asset ${id}`
    : '—'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <Link
          to="/network/assets"
          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-content mb-2 transition-colors"
        >
          <ChevronLeft size={11} />
          Assets
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {asset && <VendorIcon vendor={asset.vendor} size={15} />}
            <h1 className="text-sm font-semibold text-content">
              {isLoading ? '—' : title}
            </h1>
          </div>

          {!isLoading && asset && !editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
              >
                <Pencil size={11} />
                Edit
              </button>
              {deleteConfirm ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-red-400">Delete?</span>
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              )}
            </div>
          )}

          {editing && (
            <div className="flex items-center gap-2">
              {mutation.isError && (
                <span className="text-[11px] text-red-400">Save failed.</span>
              )}
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
              >
                <X size={11} />
                Cancel
              </button>
              <button
                onClick={save}
                disabled={mutation.isPending || !draft?.vendor?.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                <Check size={11} />
                {mutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-xs text-subtle animate-pulse">Loading…</div>
        ) : !asset ? (
          <div className="text-xs text-subtle">Asset not found.</div>
        ) : (
          <div className="max-w-lg bg-surface border border-edge rounded-md overflow-hidden">
            <div className="px-4 py-3">
              {editing
                ? FIELDS.map(f => (
                    <EditField key={f.key} field={f} value={draft[f.key]} onChange={setField} />
                  ))
                : (
                  <dl>
                    {FIELDS.map(f => <Field key={f.key} label={f.label} value={asset[f.key]} />)}
                    <Field label="ID" value={asset.id} />
                  </dl>
                )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
