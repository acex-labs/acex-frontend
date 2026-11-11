import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { fetchPlatforms, enableHardwareModel, disableHardwareModel } from '../../api/inventory'
import PageHeader from '../../components/ui/PageHeader'

const INPUT_CLS = 'h-7 px-2 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50'
const BTN_CLS = 'px-2 py-0.5 rounded text-[10px] border border-edge text-subtle hover:text-content disabled:opacity-40 transition-colors'

// The models worth showing: those an installed NED supports, and enabled ones whatever their support.
const shown = m => m.supported_os.length > 0 || m.enabled

function ModelRow({ model }) {
  const queryClient = useQueryClient()
  const toggle = useMutation({
    mutationFn: () => (model.enabled ? disableHardwareModel : enableHardwareModel)(model.hardware_model),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platforms'] }),
  })
  return (
    <tr className="border-b border-edge/50 last:border-0 text-xs">
      <td className="px-6 py-2 w-10">
        <input
          type="checkbox"
          checked={model.enabled}
          onChange={() => toggle.mutate()}
          disabled={toggle.isPending}
          aria-label={`Enable ${model.hardware_model}`}
        />
      </td>
      <td className="px-6 py-2 font-medium text-content whitespace-nowrap">{model.hardware_model}</td>
      <td className="px-6 py-2 font-mono text-subtle">
        {model.supported_os.length > 0
          ? model.supported_os.join(', ')
          : (
            <span className="inline-flex items-center gap-1 font-sans text-[11px] text-amber-400">
              <AlertTriangle size={11} /> No installed NED supports it
            </span>
          )}
      </td>
    </tr>
  )
}

function VendorSection({ vendor, models }) {
  const queryClient = useQueryClient()
  // Every model of the vendor shown here, on or off at once.
  const setAll = useMutation({
    mutationFn: enabled => Promise.all(models
      .filter(m => m.enabled !== enabled)
      .map(m => (enabled ? enableHardwareModel : disableHardwareModel)(m.hardware_model))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platforms'] }),
  })
  const enabledCount = models.filter(m => m.enabled).length
  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">
          {vendor} <span className="normal-case tracking-normal font-normal">· {enabledCount} of {models.length} enabled</span>
        </h3>
        <div className="flex gap-1">
          <button onClick={() => setAll.mutate(true)} disabled={setAll.isPending || enabledCount === models.length} className={BTN_CLS}>All</button>
          <button onClick={() => setAll.mutate(false)} disabled={setAll.isPending || enabledCount === 0} className={BTN_CLS}>None</button>
        </div>
      </div>
      <table className="w-full">
        <tbody>
          {models.map(m => <ModelRow key={m.hardware_model} model={m} />)}
        </tbody>
      </table>
    </div>
  )
}

export default function HardwareModelsPage() {
  const platforms = useQuery({ queryKey: ['platforms'], queryFn: fetchPlatforms })
  const [filter, setFilter] = useState('')
  const needle = filter.trim().toLowerCase()

  const sections = (platforms.data?.vendors ?? [])
    .map(v => ({
      vendor: v.vendor,
      models: v.hardware_models.filter(m => shown(m) && m.hardware_model.toLowerCase().includes(needle)),
    }))
    .filter(s => s.models.length > 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Hardware models"
        description="The models this installation runs, of those an installed NED supports. Only enabled models are offered in the software policy. A model is enabled when an asset of it enters the inventory."
        actions={
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter models" className={`${INPUT_CLS} w-48`} />
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {platforms.isLoading && <p className="text-xs text-subtle animate-pulse">Loading…</p>}
        {platforms.isError && <p className="text-xs text-red-400">Could not load the hardware models.</p>}
        {platforms.data && sections.length === 0 && (
          <p className="text-xs text-subtle">{needle ? 'No model matches.' : 'No installed NED supports any declared hardware model.'}</p>
        )}
        {sections.map(s => <VendorSection key={s.vendor} vendor={s.vendor} models={s.models} />)}
      </div>
    </div>
  )
}
