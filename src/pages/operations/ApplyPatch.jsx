import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupports } from '../../components/operations/capabilities'
import RunsTable from '../../components/operations/RunsTable'
import RunDrawer from '../../components/operations/RunDrawer'
import PatchPlan from '../../components/operations/PatchPlan'
import { orderError } from '../../components/operations/runs'
import { renderPatch } from '../../api/operations'

const INPUT = 'w-full px-3 py-2 text-xs font-mono bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50'

// Paths into the configuration tree often patched; any other dotted path works too, down to one attribute.
const PATHS = [
  'system.config', 'system.ntp.servers', 'system.snmp', 'system.aaa', 'system.logging', 'system.ssh',
  'system.dns', 'interfaces', 'network_instances', 'acl', 'stp', 'lacp', 'lldp', 'cdp',
]

// Brings a path of each chosen node's configuration to its desired state. A plan is rendered from a live read of
// every node and shown grouped by patch; the nodes chosen from it are sent theirs.
export default function ApplyPatch({ selected }) {
  const queryClient = useQueryClient()
  const reads = useSupports(['operations', 'get_config'])
  const writes = useSupports(['operations', 'apply'])
  const nodes = [...selected.values()].filter(n => reads(n) && writes(n))
  const skipped = selected.size - nodes.length
  const [path, setPath] = useState('')
  const [prune, setPrune] = useState(false)
  const [error, setError] = useState(null)
  const [plan, setPlan] = useState(null)
  const [openRun, setOpenRun] = useState(null)

  const render = async () => {
    setError(null)
    try {
      const ordered = await renderPatch(nodes.map(n => n.id), path.trim(), prune)
      queryClient.invalidateQueries({ queryKey: ['runs', 'patch'] })
      setPlan(ordered.id)
    } catch (err) {
      setError(orderError(err))
    }
  }

  const applied = runId => {
    queryClient.invalidateQueries({ queryKey: ['runs', 'patch'] })
    setOpenRun(runId)
  }

  // A plan opens here to be applied from; an apply opens as a run.
  const open = (id, run) => (run.type.endsWith('.patch.render') ? setPlan(id) : setOpenRun(id))

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 flex flex-col gap-1 text-[11px] text-subtle">
              Path
              <input value={path} onChange={e => setPath(e.target.value)} list="patch-paths" placeholder="system.ntp.servers" className={INPUT} />
              <datalist id="patch-paths">{PATHS.map(p => <option key={p} value={p} />)}</datalist>
              <span className="text-[10px] text-subtle/70">A dotted path into the configuration tree, empty for all of it. Only what is at the path and below it is touched.</span>
            </label>
            <label className="flex items-start gap-2 pt-5 text-[11px] text-subtle">
              <input type="checkbox" checked={prune} onChange={e => setPrune(e.target.checked)} className="mt-0.5" />
              <span className={prune ? 'text-red-400' : ''}>
                Prune
                <span className="block text-[10px] text-subtle/70">Also remove config at the path that desired doesn't declare.</span>
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={render}
              disabled={nodes.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Render patch on {nodes.length} node{nodes.length === 1 ? '' : 's'}
            </button>
            {skipped > 0 && <span className="text-[11px] text-amber-400">{skipped} can't read and write config and will be skipped</span>}
            <span className="text-[11px] text-subtle">Each node is read live. Nothing is sent until you apply the plan.</span>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </section>
        {plan != null && <PatchPlan key={plan} planId={plan} onApplied={applied} onClose={() => setPlan(null)} />}
        <section className="border border-edge rounded-md overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-edge text-[11px] font-semibold text-subtle uppercase tracking-wider">Runs</div>
          <RunsTable kind="patch" onOpen={open} />
        </section>
      </div>

      {openRun != null && <RunDrawer key={openRun} runId={openRun} onClose={() => setOpenRun(null)} />}
    </>
  )
}
