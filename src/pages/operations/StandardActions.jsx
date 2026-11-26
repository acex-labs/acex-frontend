import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupports } from '../../components/operations/capabilities'
import RunsTable from '../../components/operations/RunsTable'
import RunDrawer from '../../components/operations/RunDrawer'
import { ConfirmModal } from '../../components/operations/ConfirmModals'
import { orderError } from '../../components/operations/runs'
import { runAction } from '../../api/operations'
import ActionForm from '../../components/operations/ActionForm'
import { formDefaults, formParams, formReady, paramFields, useActions } from '../../components/operations/actions'

// Vendor-agnostic methods: the same params and result on every device, whatever its driver.
export default function StandardActions({ selected }) {
  const queryClient = useQueryClient()
  // Every action the API lists, from devkit's one list; the form of each is built from its params' schema.
  const { actions, byName, isLoading } = useActions()
  const [actionKey, setActionKey] = useState('ping')
  const action = byName[actionKey] ?? actions[0]
  const fields = paramFields(action)
  const [values, setValues] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [openRun, setOpenRun] = useState(null)
  const supports = useSupports(['actions', action?.name])
  const nodes = [...selected.values()].filter(supports)
  const skipped = selected.size - nodes.length
  // What is typed, over the action's defaults.
  const params = { ...formDefaults(fields), ...values }

  const choose = key => {
    setActionKey(key)
    setValues({})
    setError(null)
  }

  const run = async () => {
    setConfirming(false)
    setError(null)
    try {
      const ordered = await runAction(action.name, nodes.map(n => n.id), formParams(fields, params))
      queryClient.invalidateQueries({ queryKey: ['runs', 'actions'] })
      setOpenRun(ordered.id)
    } catch (err) {
      setError(orderError(err))
    }
  }

  if (isLoading) return <p className="text-xs text-subtle">Loading actions…</p>
  if (!action) return <p className="text-xs text-subtle">The API lists no actions.</p>

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {actions.map(a => (
              <button
                key={a.name}
                onClick={() => choose(a.name)}
                title={a.description}
                className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${a.name === action.name ? 'bg-brand/10 border-brand/40 text-brand' : 'border-edge text-subtle hover:text-content'}`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-subtle">{action.description}</p>
          <ActionForm key={action.name} fields={fields} values={params} onChange={setValues} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirming(true)}
              disabled={nodes.length === 0 || !formReady(fields, params)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {action.label} on {nodes.length} node{nodes.length === 1 ? '' : 's'}
            </button>
            {skipped > 0 && <span className="text-[11px] text-amber-400">{skipped} can't run {action.name} and will be skipped</span>}
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
          {action.label} on {nodes.length} node{nodes.length === 1 ? '' : 's'}: {nodes.map(n => n.hostname).join(', ')}.
        </ConfirmModal>
      )}
      {openRun != null && <RunDrawer key={openRun} runId={openRun} onClose={() => setOpenRun(null)} />}
    </>
  )
}
