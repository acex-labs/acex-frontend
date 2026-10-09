import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban, RotateCw, Trash2 } from 'lucide-react'
import { cancelJob, requeueJob, deleteJob } from '../../api/workers'

// What the backend allows; anything else answers 409. Delete works in any state.
const REQUEUEABLE = ['queued', 'failed', 'cancelled']
const UNFINISHED = ['queued', 'running']

const ICON_BUTTON = 'p-1 rounded text-subtle hover:bg-surface-hi transition-colors disabled:opacity-50'

const errorText = error =>
  typeof error.detail === 'string' ? error.detail : error.detail?.reason ?? error.message

// Requeue, cancel and delete for one job. Cancel stops a job and keeps it;
// delete is for cleaning up. Clicks stay out of a table row's own click.
export default function JobActions({ job, onDeleted }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] })
    queryClient.invalidateQueries({ queryKey: ['job'] })
  }
  const requeue = useMutation({ mutationFn: () => requeueJob(job.id), onSuccess: refresh })
  const cancel = useMutation({ mutationFn: () => cancelJob(job.id), onSuccess: refresh })
  const remove = useMutation({
    mutationFn: () => deleteJob(job.id),
    // Away from a deleted job's page first, so it is not fetched again.
    onSuccess: () => { onDeleted?.(); refresh() },
  })

  const isBatch = !!job.children
  const unfinished = UNFINISHED.includes(job.state)
  const canRequeue = !isBatch && REQUEUEABLE.includes(job.state)
  const error = requeue.error ?? cancel.error ?? remove.error
  const stop = handler => e => { e.stopPropagation(); handler() }

  const question = unfinished
    ? `${isBatch ? 'Batch' : 'Job'} is ${job.state}. Delete anyway?`
    : isBatch ? 'Delete batch?' : 'Delete?'

  return (
    <span className="inline-flex flex-col items-end gap-1" onClick={e => e.stopPropagation()}>
      {confirming ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <span className="text-[11px] text-red-400">{question}</span>
          <button
            onClick={stop(() => remove.mutate())}
            disabled={remove.isPending}
            className="px-2 py-0.5 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={stop(() => setConfirming(false))}
            className="px-2 py-0.5 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
          >
            Cancel
          </button>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          {canRequeue && (
            <button
              onClick={stop(() => requeue.mutate())}
              disabled={requeue.isPending}
              title={job.state === 'queued' ? 'Send the job to its queue again' : 'Queue the job again'}
              className={`${ICON_BUTTON} hover:text-content`}
            >
              <RotateCw size={12} className={requeue.isPending ? 'animate-spin' : ''} />
            </button>
          )}
          {unfinished && (
            <button
              onClick={stop(() => cancel.mutate())}
              disabled={cancel.isPending}
              title={isBatch ? "Cancel the batch's unfinished jobs" : 'Cancel the job'}
              className={`${ICON_BUTTON} hover:text-amber-400`}
            >
              <Ban size={12} />
            </button>
          )}
          <button
            onClick={stop(() => setConfirming(true))}
            title={isBatch ? 'Delete the batch and its jobs' : 'Delete the job'}
            className={`${ICON_BUTTON} hover:text-red-400`}
          >
            <Trash2 size={12} />
          </button>
        </span>
      )}
      {error && <span className="w-56 text-right text-[11px] text-red-400">{errorText(error)}</span>}
    </span>
  )
}
