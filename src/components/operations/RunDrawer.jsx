import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Download, X } from 'lucide-react'
import { downloadReport, fetchRun } from '../../api/operations'
import JobStateBadge from '../jobs/JobStateBadge'
import { formatDuration, formatTime } from '../jobs/jobs'
import { FINISHED, runDuration, runProgress, runSummary } from './runs'

// What one node answered to raw commands: each command and its masked output.
function CommandOutputs({ outputs }) {
  return outputs.map((o, i) => (
    <div key={i} className="border-t border-edge">
      <div className="px-3 py-1 text-[11px] font-mono text-brand bg-surface-hi">$ {o.command}</div>
      <pre className="px-3 py-2 text-[11px] font-mono whitespace-pre-wrap break-all text-content">{o.output || ' '}</pre>
    </div>
  ))
}

// A ping's abstract result: packets back of sent, success rate and round-trip times.
function PingResult({ result }) {
  const rtt = result.rtt_avg_ms != null ? ` · rtt ${result.rtt_min_ms}/${result.rtt_avg_ms}/${result.rtt_max_ms} ms` : ''
  return (
    <div className={`px-3 py-2 text-xs font-mono border-t border-edge ${result.success ? 'text-green-400' : 'text-red-400'}`}>
      {result.received}/{result.sent} received · {result.success_rate}%{rtt}
    </div>
  )
}

// A node's answer in one line, for its collapsed row: the error, the ping's outcome, or how many commands answered.
function responseSummary(response) {
  if (response.error) return response.error.split('\n')[0]
  const result = response.result
  if (!result) return null
  if (result.outputs) return `${result.outputs.length} command${result.outputs.length === 1 ? '' : 's'}`
  if ('sent' in result) return `${result.received}/${result.sent} received · ${result.success_rate}%`
  return null
}

// One node's response: a row with its outcome in short, opening to the full output.
function Response({ response }) {
  const [open, setOpen] = useState(false)
  const summary = responseSummary(response)
  const hasDetail = !!(response.error || response.result)
  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <button
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${hasDetail ? 'hover:bg-surface-hi' : 'cursor-default'}`}
      >
        <ChevronRight
          size={12}
          className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''} ${hasDetail ? 'text-subtle' : 'text-transparent'}`}
        />
        <span className="text-xs font-semibold text-content shrink-0">{response.hostname ?? `Node ${response.node_id}`}</span>
        <JobStateBadge state={response.state} />
        {summary && (
          <span className={`ml-auto text-[11px] font-mono truncate ${response.error ? 'text-red-400' : 'text-subtle'}`} title={summary}>
            {summary}
          </span>
        )}
      </button>
      {open && response.error && (
        <pre className="px-3 py-2 text-[11px] font-mono whitespace-pre-wrap break-all text-red-400 border-t border-edge">{response.error}</pre>
      )}
      {open && response.result?.outputs && <CommandOutputs outputs={response.result.outputs} />}
      {open && response.result && 'sent' in response.result && <PingResult result={response.result} />}
    </div>
  )
}

// A run's details: progress while it runs, then every node's response; the report downloads as CSV or JSON.
export default function RunDrawer({ runId, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { data: run } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => fetchRun(runId),
    refetchInterval: query => (FINISHED.includes(query.state.data?.state) ? false : 2000),
  })
  const progress = run ? runProgress(run) : null

  // While the run is going, its running time counts up every second.
  const running = !!run && !FINISHED.includes(run.state)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])
  const took = run?.finished_at ? `Took ${formatDuration(runDuration(run))}`
    : running ? `Running for ${formatDuration(runDuration(run, now))}` : null

  return (
    <>
      <div className="absolute inset-0 z-20 bg-black/20" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 z-30 w-full max-w-xl bg-surface border-l border-edge shadow-2xl overflow-auto">
        <div className="px-4 py-3 border-b border-edge flex items-center gap-2">
          <h2 className="text-sm font-semibold text-content">Run {runId}</h2>
          {run && <JobStateBadge state={run.state} />}
          <button onClick={onClose} className="ml-auto text-subtle hover:text-content"><X size={14} /></button>
        </div>
        {run && (
          <div className="p-4 space-y-4">
            <div className="text-[11px] text-subtle space-y-1">
              <div className="font-mono text-content break-all">{runSummary(run)}</div>
              <div>Ordered by {run.created_by} · {formatTime(run.created_at)}{took && ` · ${took}`}</div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-subtle mb-1">
                <span>{progress.done} of {progress.total} nodes done</span>
                {progress.failed > 0 && <span className="text-red-400">{progress.failed} failed</span>}
              </div>
              <div className="h-1.5 bg-surface-hi rounded-full overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${(progress.done / (progress.total || 1)) * 100}%` }} />
              </div>
            </div>
            <div className="flex gap-2">
              {['csv', 'json'].map(format => (
                <button
                  key={format}
                  onClick={() => downloadReport(runId, format)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content"
                >
                  <Download size={11} /> {format.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {run.responses.map(r => <Response key={r.job_id} response={r} />)}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
