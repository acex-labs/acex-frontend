import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X, Check } from 'lucide-react'
import { createSite, createRegionAssignment, fetchRegions } from '../../api/inventory'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

const FIELDS = [
  { key: 'name',         label: 'Name',         required: true },
  { key: 'display_name', label: 'Display Name' },
  { key: 'address',      label: 'Address' },
  { key: 'city',         label: 'City' },
  { key: 'country',      label: 'Country' },
  { key: 'latitude',     label: 'Latitude',  type: 'number' },
  { key: 'longitude',    label: 'Longitude', type: 'number' },
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

export default function CreateSiteModal({ onClose, onSuccess }) {
  const [values, setValues] = useState({})
  const [selectedRegions, setSelectedRegions] = useState(new Set())
  const setField = (key, val) => setValues(prev => ({ ...prev, [key]: val }))

  const { data: regionsData } = useQuery({
    queryKey: ['regions-picker'],
    queryFn: () => fetchRegions({ limit: 200 }),
  })
  const regions = regionsData?.items ?? []

  const toggleRegion = (name) => setSelectedRegions(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const created = await createSite(payload)
      await Promise.all(
        Array.from(selectedRegions).map(region_name =>
          createRegionAssignment({ region_name, site_name: created.name })
        )
      )
      return created
    },
    onSuccess: (created) => { onSuccess(created); onClose() },
  })

  const submit = () => {
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined && v !== '')
    )
    if (payload.latitude !== undefined) payload.latitude = Number(payload.latitude)
    if (payload.longitude !== undefined) payload.longitude = Number(payload.longitude)
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">New Site</h2>
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

          {regions.length > 0 && (
            <FormField label={`Regions (${selectedRegions.size} selected)`}>
              <div className="border border-edge rounded max-h-36 overflow-y-auto">
                {regions.map(r => (
                  <button
                    key={r.id ?? r.name}
                    type="button"
                    onClick={() => toggleRegion(r.name)}
                    className={[
                      'w-full text-left px-3 py-2 border-b border-edge/50 last:border-0 flex items-center gap-2 transition-colors',
                      selectedRegions.has(r.name) ? 'bg-brand/10' : 'hover:bg-surface-hi',
                    ].join(' ')}
                  >
                    <span className="text-xs text-content truncate flex-1">{r.display_name || r.name}</span>
                    {selectedRegions.has(r.name) && <Check size={12} className="text-brand shrink-0" />}
                  </button>
                ))}
              </div>
            </FormField>
          )}

          {mutation.isError && (
            <p className="mt-2 text-[11px] text-red-400">Failed to create site.</p>
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
