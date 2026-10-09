import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { purgeJobs } from '../../api/workers'

// state '' purges every job, whatever its state.
const CHOICES = [
  { state: 'failed',    label: 'Failed jobs' },
  { state: 'cancelled', label: 'Cancelled jobs' },
  { state: '',          label: 'All jobs' },
]

// Deletes jobs in bulk to clean up the list: all of them, or the failed or cancelled ones.
export default function PurgeJobsButton() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(null)
  const purge = useMutation({
    mutationFn: () => purgeJobs(choice.state),
    onSuccess: () => {
      setChoice(null)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job'] })
    },
  })
  const close = () => { setOpen(false); setChoice(null); purge.reset() }

  return (
    <div className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-red-400 transition-colors"
      >
        <Trash2 size={11} />
        Purge
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={close} />
          <div className="absolute right-0 mt-1 z-30 w-60 bg-canvas border border-edge rounded-md shadow-2xl p-1">
            {choice ? (
              <div className="p-2 space-y-2">
                <p className="text-[11px] text-red-400">
                  {choice.state
                    ? `Delete every ${choice.state} job, also inside batches?`
                    : 'Delete every job, including queued and running ones?'}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => purge.mutate()}
                    disabled={purge.isPending}
                    className="px-2 py-0.5 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setChoice(null)}
                    className="px-2 py-0.5 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
                  >
                    Back
                  </button>
                </div>
                {purge.isError && (
                  <p className="text-[11px] text-red-400">
                    {typeof purge.error.detail === 'string' ? purge.error.detail : purge.error.message}
                  </p>
                )}
              </div>
            ) : (
              <>
                {CHOICES.map(c => (
                  <button
                    key={c.label}
                    onClick={() => { purge.reset(); setChoice(c) }}
                    className="block w-full text-left px-2 py-1.5 rounded text-xs text-content hover:bg-surface-hi transition-colors"
                  >
                    {c.label}
                  </button>
                ))}
                {purge.isSuccess && (
                  <p className="px-2 py-1 text-[11px] text-subtle">Deleted {purge.data.deleted} jobs.</p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
