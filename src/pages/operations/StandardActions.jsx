import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupports } from '../../components/operations/capabilities'
import RunsTable from '../../components/operations/RunsTable'
import RunDrawer from '../../components/operations/RunDrawer'
import { ConfirmModal } from '../../components/operations/ConfirmModals'
import { orderError } from '../../components/operations/runs'
import { runAction } from '../../api/operations'

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

// Ping's params, bounded as the API bounds them. Empty optional fields are left out.
function PingForm({ params, onChange }) {
  const set = key => e => onChange({ ...params, [key]: e.target.value })
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Target"><input value={params.target} onChange={set('target')} placeholder="10.0.0.1 or a hostname" className={INPUT} /></Field>
      <Field label="Count" hint="1–100"><input type="number" min={1} max={100} value={params.count} onChange={set('count')} className={INPUT} /></Field>
      <Field label="Timeout" hint="Seconds per reply"><input type="number" min={1} max={60} value={params.timeout} onChange={set('timeout')} className={INPUT} /></Field>
      <Field label="VRF" hint="Empty for the global table"><input value={params.vrf} onChange={set('vrf')} placeholder="MGMT" className={INPUT} /></Field>
      <Field label="Source interface"><input value={params.source} onChange={set('source')} placeholder="Loopback0" className={INPUT} /></Field>
      <Field label="Size" hint="36–9216 bytes; sent with don't-fragment"><input type="number" min={36} max={9216} value={params.size} onChange={set('size')} className={INPUT} /></Field>
    </div>
  )
}

// The abstract actions: the same params and result whatever the vendor. One entry per action the API has.
const ACTIONS = [
  {
    key: 'ping',
    label: 'Ping',
    defaults: { target: '', count: 1, timeout: 2, vrf: '', source: '', size: '' },
    Form: PingForm,
    ready: p => p.target.trim() !== '',
    // Numbers as numbers; empty optional fields left out so the API's defaults apply.
    params: p => Object.fromEntries(
      Object.entries({ ...p, target: p.target.trim(), count: Number(p.count), timeout: Number(p.timeout), size: p.size === '' ? '' : Number(p.size) })
        .filter(([, v]) => v !== '')
    ),
  },
]

// Vendor-agnostic methods: the same params and result on every device, whatever its driver.
export default function StandardActions({ selected }) {
  const queryClient = useQueryClient()
  const [actionKey, setActionKey] = useState(ACTIONS[0].key)
  const action = ACTIONS.find(a => a.key === actionKey)
  const [params, setParams] = useState(action.defaults)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [openRun, setOpenRun] = useState(null)
  const supports = useSupports(['actions', action.key])
  const nodes = [...selected.values()].filter(supports)
  const skipped = selected.size - nodes.length

  const choose = key => {
    setActionKey(key)
    setParams(ACTIONS.find(a => a.key === key).defaults)
  }

  const run = async () => {
    setConfirming(false)
    setError(null)
    try {
      const ordered = await runAction(action.key, nodes.map(n => n.id), action.params(params))
      queryClient.invalidateQueries({ queryKey: ['runs', 'actions'] })
      setOpenRun(ordered.id)
    } catch (err) {
      setError(orderError(err))
    }
  }

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex gap-2">
            {ACTIONS.map(a => (
              <button
                key={a.key}
                onClick={() => choose(a.key)}
                className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${a.key === actionKey ? 'bg-brand/10 border-brand/40 text-brand' : 'border-edge text-subtle hover:text-content'}`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <action.Form params={params} onChange={setParams} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirming(true)}
              disabled={nodes.length === 0 || !action.ready(params)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {action.label} from {nodes.length} node{nodes.length === 1 ? '' : 's'}
            </button>
            {skipped > 0 && <span className="text-[11px] text-amber-400">{skipped} can't run {action.key} and will be skipped</span>}
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </section>
        <section className="border border-edge rounded-md overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-edge text-[11px] font-semibold text-subtle uppercase tracking-wider">Runs</div>
          <RunsTable kind="actions" onOpen={setOpenRun} />
        </section>
      </div>

      {confirming && (
        <ConfirmModal title="Are you sure?" onConfirm={run} onClose={() => setConfirming(false)}>
          {action.label} from {nodes.length} node{nodes.length === 1 ? '' : 's'}: {nodes.map(n => n.hostname).join(', ')}.
        </ConfirmModal>
      )}
      {openRun != null && <RunDrawer key={openRun} runId={openRun} onClose={() => setOpenRun(null)} />}
    </>
  )
}
