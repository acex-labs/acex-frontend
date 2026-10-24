import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupports } from '../../components/operations/capabilities'
import RunsTable from '../../components/operations/RunsTable'
import RunDrawer from '../../components/operations/RunDrawer'
import { ExecuteConfirmModal } from '../../components/operations/ConfirmModals'
import { orderError } from '../../components/operations/runs'
import { executeCommands } from '../../api/operations'

// Raw commands, run as written on each chosen node, one session per node, output masked by its driver.
export default function ExecCommands({ selected }) {
  const queryClient = useQueryClient()
  const supports = useSupports(['operations', 'execute'])
  const nodes = [...selected.values()].filter(supports)
  const skipped = selected.size - nodes.length
  const [text, setText] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [openRun, setOpenRun] = useState(null)

  const commands = text.split('\n').map(c => c.trim()).filter(Boolean)
  const canRun = nodes.length > 0 && commands.length > 0

  const run = async () => {
    setConfirming(false)
    setError(null)
    try {
      const ordered = await executeCommands(nodes.map(n => n.id), commands)
      queryClient.invalidateQueries({ queryKey: ['runs', 'execute'] })
      setOpenRun(ordered.id)
    } catch (err) {
      setError(orderError(err))
    }
  }

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-3">
          <textarea
            rows={4}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'show version\nshow ip interface brief'}
            className="w-full px-3 py-2 text-xs font-mono bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 resize-y"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirming(true)}
              disabled={!canRun}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Run on {nodes.length} node{nodes.length === 1 ? '' : 's'}
            </button>
            {skipped > 0 && <span className="text-[11px] text-amber-400">{skipped} can't run execute and will be skipped</span>}
            <span className="text-[11px] text-subtle">One command per line, run in order. Secrets in the output are masked.</span>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </section>
        <section className="border border-edge rounded-md overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-edge text-[11px] font-semibold text-subtle uppercase tracking-wider">Runs</div>
          <RunsTable kind="execute" onOpen={setOpenRun} />
        </section>
      </div>

      {confirming && (
        <ExecuteConfirmModal commands={commands} hostnames={nodes.map(n => n.hostname)} onConfirm={run} onClose={() => setConfirming(false)} />
      )}
      {openRun != null && <RunDrawer key={openRun} runId={openRun} onClose={() => setOpenRun(null)} />}
    </>
  )
}
