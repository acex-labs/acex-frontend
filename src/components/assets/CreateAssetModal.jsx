import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { createAsset, fetchPlatforms } from '../../api/inventory'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

// The backend requires these; anything else is optional.
const REQUIRED = ['vendor', 'os', 'hardware_model', 'serial_number', 'os_version']

function FormField({ label, required, hint, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] text-subtle mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-subtle">{hint}</p>}
    </div>
  )
}

function errorMessage(error) {
  const { detail } = error ?? {}
  if (typeof detail === 'string') return detail
  // FastAPI validation errors arrive as a list of {loc, msg}.
  if (Array.isArray(detail)) {
    return detail.map(d => `${d.loc?.slice(1).join('.') ?? 'field'}: ${d.msg}`).join(' · ')
  }
  return 'Failed to create asset.'
}

export default function CreateAssetModal({ onClose, onSuccess }) {
  const [values, setValues] = useState({})

  const { data: catalog, isPending: loadingCatalog, isError: catalogFailed } = useQuery({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    staleTime: Infinity,
  })

  const vendors = catalog?.vendors ?? []
  const vendor = vendors.find(v => v.vendor === values.vendor)
  const models = useMemo(() => vendor?.hardware_models ?? [], [vendor])
  const model = models.find(m => m.hardware_model === values.hardware_model)

  // A known model settles the OS. An unrecognised one leaves every OS this
  // vendor declares on the table.
  const operatingSystems = useMemo(() => {
    if (model) return model.operating_systems
    if (!vendor) return []
    return [...new Set(models.flatMap(m => m.operating_systems))].sort()
  }, [model, vendor, models])

  const versionHint = useMemo(() => {
    const examples = catalog?.version_examples?.[values.os] ?? []
    return examples.length ? `e.g. ${examples.slice(0, 3).join(', ')}` : ''
  }, [catalog, values.os])

  // Narrowing a choice invalidates the ones below it.
  const setField = (key, val) => setValues(prev => {
    const next = { ...prev, [key]: val }
    if (key === 'vendor') { next.hardware_model = ''; next.os = ''; next.os_version = '' }
    if (key === 'hardware_model') {
      next.os_version = ''
      // Settle the OS ourselves when the model allows only one.
      const picked = (prev.vendor === next.vendor ? models : []).find(m => m.hardware_model === val)
      next.os = picked?.operating_systems.length === 1 ? picked.operating_systems[0] : ''
    }
    return next
  })

  const mutation = useMutation({
    mutationFn: createAsset,
    onSuccess: (created) => { onSuccess(created); onClose() },
  })

  const complete = REQUIRED.every(key => values[key]?.trim())

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
          <h2 className="text-sm font-semibold text-content">New Asset</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1">
          <FormField label="Vendor" required>
            <select
              value={values.vendor ?? ''}
              onChange={e => setField('vendor', e.target.value)}
              disabled={loadingCatalog || catalogFailed}
              autoFocus
              className={INPUT_CLS}
            >
              <option value="">{loadingCatalog ? 'Loading…' : 'Select a vendor'}</option>
              {vendors.map(v => <option key={v.vendor} value={v.vendor}>{v.vendor}</option>)}
            </select>
          </FormField>

          <FormField
            label="Model"
            required
            hint={vendor ? `${models.length} known models — type to search, or enter your own` : ''}
          >
            <input
              type="text"
              list="asset-hardware-models"
              value={values.hardware_model ?? ''}
              onChange={e => setField('hardware_model', e.target.value)}
              disabled={!vendor}
              placeholder={vendor ? models[0]?.hardware_model : 'Pick a vendor first'}
              className={INPUT_CLS}
            />
            <datalist id="asset-hardware-models">
              {models.map(m => <option key={m.hardware_model} value={m.hardware_model} />)}
            </datalist>
          </FormField>

          <FormField
            label="OS"
            required
            hint={model && model.operating_systems.length === 1 ? 'Determined by the model' : ''}
          >
            <select
              value={values.os ?? ''}
              onChange={e => setField('os', e.target.value)}
              disabled={!operatingSystems.length}
              className={INPUT_CLS}
            >
              <option value="">{vendor ? 'Select an OS' : 'Pick a vendor first'}</option>
              {operatingSystems.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>

          <FormField label="OS Version" required hint={versionHint}>
            <input
              type="text"
              value={values.os_version ?? ''}
              onChange={e => setField('os_version', e.target.value)}
              disabled={!values.os}
              placeholder={catalog?.version_examples?.[values.os]?.[0] ?? ''}
              className={INPUT_CLS}
            />
          </FormField>

          <FormField label="Serial Number" required>
            <input
              type="text"
              value={values.serial_number ?? ''}
              onChange={e => setField('serial_number', e.target.value)}
              className={INPUT_CLS}
            />
          </FormField>

          <FormField label="Driver (NED)">
            <input
              type="text"
              value={values.ned_id ?? ''}
              onChange={e => setField('ned_id', e.target.value)}
              className={INPUT_CLS}
            />
          </FormField>

          {catalogFailed && (
            <p className="mt-2 text-[11px] text-red-400">Could not load the platform catalog.</p>
          )}
          {mutation.isError && (
            <p className="mt-2 text-[11px] text-red-400">{errorMessage(mutation.error)}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!complete || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
