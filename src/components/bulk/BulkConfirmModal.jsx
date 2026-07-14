import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../../api/client'

const CONCURRENCY = 10

async function runWithConcurrency(items, fn, onProgress) {
  let done = 0, failed = 0
  const queue = [...items]

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      try { await fn(item) }
      catch { failed++ }
      done++
      onProgress(done, failed)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  return { succeeded: done - failed, failed }
}

function buildActionFn({ action, value }, nodeInfoCache) {
  if (action === 'status') {
    return (nodeId) =>
      apiFetch(`/api/v1/inventory/node_instances/${nodeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: value }),
      })
  }

  if (action === 'ned') {
    return async (nodeId) => {
      let info = nodeInfoCache.get(nodeId)
      if (!info) {
        const data = await apiFetch(`/api/v1/inventory/node_instances/${nodeId}`)
        info = { asset_ref_id: data.asset_ref_id, asset_ref_type: data.asset_ref_type }
        nodeInfoCache.set(nodeId, info)
      }
      const url = info.asset_ref_type === 'asset_cluster'
        ? `/api/v1/inventory/asset_clusters/${info.asset_ref_id}`
        : `/api/v1/inventory/assets/${info.asset_ref_id}`
      return apiFetch(url, {
        method: 'PATCH',
        body: JSON.stringify({ ned_id: value }),
      })
    }
  }

  throw new Error(`Unknown action: ${action}`)
}

export default function BulkConfirmModal({ selectedIds, actionSpec, nodeInfoCache, onClose }) {
  const [phase, setPhase]       = useState('confirm') // confirm | running | done
  const [input, setInput]       = useState('')
  const [progress, setProgress] = useState(null)
  const [result, setResult]     = useState(null)
  const inputRef                = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const ready = input.trim() === 'apply'
  const pct   = progress ? Math.round((progress.done / progress.total) * 100) : 0

  const actionLabel = {
    ned:    `Set NED → ${actionSpec.value}`,
    status: `Set status → ${actionSpec.value}`,
  }[actionSpec.action] ?? actionSpec.action

  const handleConfirm = async () => {
    if (!ready) return
    setPhase('running')
    setProgress({ done: 0, failed: 0, total: selectedIds.size })

    const ids = [...selectedIds]
    const fn  = buildActionFn(actionSpec, nodeInfoCache)

    const res = await runWithConcurrency(ids, fn, (done, failed) =>
      setProgress({ done, failed, total: ids.length })
    )

    setResult(res)
    setPhase('done')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={phase === 'confirm' ? onClose : undefined}
    >
      <div
        className="w-full max-w-md bg-surface border border-edge rounded-xl p-6 flex flex-col gap-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-1">
            {phase === 'confirm' ? 'Confirm Bulk Action' : phase === 'running' ? 'Running…' : 'Done'}
          </div>
          <div className="text-sm font-semibold text-content">{actionLabel}</div>
        </div>

        {/* Summary */}
        <div className="bg-surface-hi border border-edge rounded-lg p-4 flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <span className="text-subtle">Action</span>
            <span className="text-content font-medium">{actionLabel}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-subtle">Nodes</span>
            <span className="text-content font-medium">{selectedIds.size.toLocaleString()}</span>
          </div>
        </div>

        {/* Confirm phase */}
        {phase === 'confirm' && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-subtle">
                Type <span className="font-mono text-content">apply</span> to confirm
              </label>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && ready) handleConfirm(); if (e.key === 'Escape') onClose() }}
                placeholder="apply"
                className={[
                  'px-3 py-2 text-xs font-mono bg-surface-hi border rounded-lg text-content placeholder-subtle/50 focus:outline-none transition-colors',
                  input === '' ? 'border-edge'
                    : ready ? 'border-green-500/50'
                    : 'border-red-500/30',
                ].join(' ')}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-xs text-subtle border border-edge rounded-lg hover:bg-surface-hi transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!ready}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-brand/10 border border-brand/30 text-brand hover:bg-brand/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </>
        )}

        {/* Running phase */}
        {phase === 'running' && progress && (
          <div className="flex flex-col gap-3">
            <div className="w-full bg-surface-hi rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-brand transition-all duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-subtle">
              <span>{progress.done.toLocaleString()} / {progress.total.toLocaleString()} nodes</span>
              <span>
                {pct}%
                {progress.failed > 0 && <span className="text-red-400 ml-2">{progress.failed} failed</span>}
              </span>
            </div>
          </div>
        )}

        {/* Done phase */}
        {phase === 'done' && result && (
          <>
            <div className={[
              'rounded-lg p-4 border text-xs flex flex-col gap-1',
              result.failed > 0
                ? 'bg-yellow-500/8 border-yellow-500/20 text-yellow-300'
                : 'bg-green-500/8 border-green-500/20 text-green-400',
            ].join(' ')}>
              <div className="font-semibold">
                {result.failed === 0 ? 'Completed successfully' : 'Completed with errors'}
              </div>
              <div className="text-subtle">
                {result.succeeded.toLocaleString()} succeeded
                {result.failed > 0 && `, ${result.failed.toLocaleString()} failed`}
              </div>
            </div>
            <button
              onClick={onClose}
              className="py-2 text-xs text-subtle border border-edge rounded-lg hover:bg-surface-hi transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}
