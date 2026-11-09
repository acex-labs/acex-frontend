import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ReactFlowProvider, useNodesState } from '@xyflow/react'
import { ArrowLeft, ChevronRight, FastForward, Square, StepForward, Trash2 } from 'lucide-react'
import { continueRun, deleteRun, fetchRun, stopRun } from '../../../api/workflows'
import JobStateBadge from '../../../components/jobs/JobStateBadge'
import { formatTime, childSummary } from '../../../components/jobs/jobs'
import { ConfirmModal } from '../../../components/operations/ConfirmModals'
import { FINISHED, orderError } from '../../../components/operations/runs'
import { ArtifactTable, NodeResponses, StepResult } from '../../../components/workflows/StepResults'
import { nodeRows, onceRows, useResponses } from '../../../components/workflows/results'
import WorkflowCanvas from '../../../components/workflows/WorkflowCanvas'
import { flowEdge, toFlow } from '../../../components/workflows/graph'
import { MODES, STEP_TYPES, onNodes } from '../../../components/workflows/steps'

const QUIET = 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border border-edge text-subtle hover:text-content disabled:opacity-40'
const LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-subtle'

// A box of the run's graph by its key, and what it is called.
const boxOf = (run, key) => run.graph.nodes.find(n => n.key === key)
const nameOf = (run, key) => {
  const box = boxOf(run, key)
  return box?.name || (box?.step ? STEP_TYPES[box.step.type].label : key)
}

// The artifacts one round of a step left: per node for a step on nodes, fetched when first shown.
function RoundArtifacts({ run, stepRun }) {
  const box = boxOf(run, stepRun.key)
  const perNode = onNodes(box.step, box.targets)
  const responses = useResponses(run.id, stepRun, perNode)
  if (perNode && !responses) return <p className="text-xs text-subtle">Loading…</p>
  return <ArtifactTable rows={perNode ? nodeRows(responses) : onceRows(stepRun.result)} />
}

// One round in the list: it opens in place to its artifacts and error, or the step's panel opens at it.
function TimelineRow({ run, stepRun, onOpen }) {
  const [open, setOpen] = useState(false)
  const box = boxOf(run, stepRun.key)
  const leaves = box.step.artifacts.length > 0
  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-hi">
        <button onClick={() => setOpen(o => !o)} className="text-subtle hover:text-content" title="Artifacts">
          <ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <button onClick={() => onOpen(stepRun.key, stepRun.round)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          <span className="text-xs font-semibold text-content truncate">{nameOf(run, stepRun.key)}</span>
          {stepRun.round > 1 && <span className="text-[10px] text-subtle">round {stepRun.round}</span>}
          {leaves && <span className="text-[10px] text-subtle font-mono truncate">{box.step.artifacts.map(a => a.name).join(', ')}</span>}
          <span className="ml-auto"><JobStateBadge state={stepRun.state} /></span>
        </button>
      </div>
      {open && (
        <div className="px-2 pb-2 space-y-2">
          {stepRun.error && <pre className="px-2 py-1 text-[11px] font-mono whitespace-pre-wrap break-all text-red-400">{stepRun.error}</pre>}
          {leaves ? <RoundArtifacts run={run} stepRun={stepRun} /> : <p className="text-[11px] text-subtle">This step leaves no artifacts.</p>}
        </div>
      )}
    </div>
  )
}

// Every round of every step so far, oldest first.
function Timeline({ run, onOpen }) {
  if (run.step_runs.length === 0) return <p className="text-xs text-subtle">No step has started yet.</p>
  return (
    <div className="space-y-1">
      {run.step_runs.map(s => <TimelineRow key={s.job_id} run={run} stepRun={s} onOpen={onOpen} />)}
    </div>
  )
}

// What one round of a step did on each node, or once.
function RoundResult({ run, stepRun, perNode }) {
  const responses = useResponses(run.id, stepRun, perNode)
  if (!perNode) return <StepResult stepResult={stepRun.result} />
  if (!responses) return <p className="text-xs text-subtle">Loading…</p>
  return <NodeResponses responses={responses} />
}

// One step of the run: its rounds, and for the chosen one the artifacts it left, then what it did.
function StepDetail({ run, stepKey, round, onRound, onBack }) {
  const box = boxOf(run, stepKey)
  const kind = STEP_TYPES[box.step.type]
  const perNode = onNodes(box.step, box.targets)
  const rounds = run.step_runs.filter(s => s.key === stepKey)
  const current = rounds.find(s => s.round === round) ?? rounds[rounds.length - 1]
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-[11px] text-subtle hover:text-content"><ArrowLeft size={11} /> Every step</button>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <kind.icon size={14} className="text-brand" />
          <span className="font-semibold text-content">{nameOf(run, stepKey)}</span>
          <span className="text-[11px] text-subtle">{kind.label}</span>
        </div>
        <div className="text-[11px] font-mono text-subtle">{stepKey}</div>
      </div>
      {!current ? (
        <p className="text-xs text-subtle">{run.active.includes(stepKey) ? 'Starting…' : 'This step hasn\'t run.'}</p>
      ) : (
        <>
          {rounds.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {rounds.map(s => (
                <button
                  key={s.round}
                  onClick={() => onRound(s.round)}
                  className={`px-2 py-0.5 text-[11px] rounded border ${s.round === current.round ? 'bg-brand/10 border-brand/40 text-brand' : 'border-edge text-subtle hover:text-content'}`}
                >
                  Round {s.round}
                </button>
              ))}
            </div>
          )}
          <div className="text-[11px] text-subtle space-y-1">
            <div className="flex items-center gap-2"><JobStateBadge state={current.state} />{current.jobs && <span>{childSummary(current.jobs)}</span>}</div>
            <div>Started {formatTime(current.created_at)}{current.finished_at && ` · finished ${formatTime(current.finished_at)}`}</div>
            {current.state === 'scheduled' && current.run_at && <div className="text-amber-400">Waits until {formatTime(current.run_at)}</div>}
            {run.branches[stepKey] && <div>Took its {run.branches[stepKey]} side</div>}
          </div>
          {current.error && <pre className="px-3 py-2 text-[11px] font-mono whitespace-pre-wrap break-all text-red-400 border border-red-500/30 rounded-md">{current.error}</pre>}
          {box.step.artifacts.length > 0 && (
            <div className="space-y-2">
              <div className={LABEL}>Artifacts{rounds.length > 1 && `, round ${current.round}`}</div>
              <RoundArtifacts run={run} stepRun={current} />
            </div>
          )}
          <div className="space-y-2">
            <div className={LABEL}>{perNode ? 'Nodes' : 'Result'}</div>
            <RoundResult run={run} stepRun={current} perNode={perNode} />
          </div>
        </>
      )}
    </div>
  )
}

function RunView({ run }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [initial] = useState(() => toFlow(run.graph))
  const [nodes, , onNodesChange] = useNodesState(initial.nodes)
  // The step open in the side panel and its round; none shows every step.
  const [open, setOpen] = useState(null)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const latest = Object.fromEntries(run.step_runs.map(s => [s.key, s]))
  const shown = nodes.map(n => (n.type !== 'step' ? n : {
    ...n,
    data: {
      ...n.data,
      key: n.id,
      state: run.active.includes(n.id) && !latest[n.id] ? 'queued' : latest[n.id]?.state,
      round: latest[n.id]?.round,
      pending: run.pending.includes(n.id),
      branch: run.branches[n.id],
      waitsUntil: latest[n.id]?.state === 'scheduled' && latest[n.id].run_at ? formatTime(latest[n.id].run_at) : null,
      artifactCount: latest[n.id]?.state === 'succeeded' ? n.data.step.artifacts.length : 0,
    },
  }))
  // Arrows into a step that is running now move; a condition's side not taken fades.
  const edges = run.graph.edges.map(e => ({
    ...flowEdge(e),
    animated: run.active.includes(e.target),
    ...(e.branch && run.branches[e.source] && run.branches[e.source] !== e.branch && { style: { opacity: 0.3 } }),
  }))

  const act = async action => {
    setError(null)
    try {
      queryClient.setQueryData(['workflow-run', String(run.id)], await action(run.id))
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] })
    } catch (err) {
      setError(orderError(err))
    }
  }
  const remove = async () => {
    try {
      await deleteRun(run.id)
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] })
      navigate(`/operations/workflows/runs?workflow=${run.workflow_id}`)
    } catch (err) {
      setDeleting(false)
      setError(orderError(err))
    }
  }

  const live = run.state === 'running' || run.state === 'paused' || run.state === 'queued'
  const pendingNames = run.pending.map(k => nameOf(run, k)).join(', ')

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-edge shrink-0">
        <Link to={`/operations/workflows/runs?workflow=${run.workflow_id}`} className="text-subtle hover:text-content" title="Runs"><ArrowLeft size={14} /></Link>
        <h1 className="text-sm font-semibold text-heading">Run {run.id} · {run.name}</h1>
        <span className="text-[11px] text-subtle">{MODES[run.mode]}</span>
        <JobStateBadge state={run.state} />
        <span className="text-[11px] text-subtle">by {run.created_by} · {formatTime(run.created_at)}{run.finished_at && ` – ${formatTime(run.finished_at)}`}</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to={`/operations/workflows/edit/${run.workflow_id}`} className={QUIET}>Open workflow</Link>
          {run.state === 'paused' && (
            <>
              <button onClick={() => act(id => continueRun(id))} className={QUIET} title="Start the next steps, then pause again"><StepForward size={12} /> Continue</button>
              <button onClick={() => act(id => continueRun(id, true))} className={QUIET} title="Run the rest without pausing"><FastForward size={12} /> Run to end</button>
            </>
          )}
          {live && <button onClick={() => act(stopRun)} className={`${QUIET} hover:text-red-400`}><Square size={12} /> Stop</button>}
          {!live && <button onClick={() => setDeleting(true)} className={QUIET} title="Delete the run with all it made"><Trash2 size={12} /></button>}
        </div>
      </div>
      {run.error && <div className="px-4 py-1.5 text-xs font-mono text-red-400 border-b border-edge whitespace-pre-wrap break-words max-h-40 overflow-auto">{run.error}</div>}
      {error && <div className="px-4 py-1.5 text-xs text-red-400 border-b border-edge break-words">{error}</div>}
      {run.state === 'paused' && (
        <div className="px-4 py-1.5 text-xs text-amber-400 border-b border-edge">
          Paused after {pendingNames}. Look at what they did, then continue with the steps after them.
        </div>
      )}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <WorkflowCanvas
            nodes={shown}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodeClick={(_, n) => setOpen(n.type === 'step' ? { key: n.id } : null)}
            onPaneClick={() => setOpen(null)}
          />
        </div>
        <aside className="w-[30rem] shrink-0 border-l border-edge overflow-auto p-4">
          {open ? (
            <StepDetail
              key={open.key}
              run={run}
              stepKey={open.key}
              round={open.round}
              onRound={round => setOpen({ ...open, round })}
              onBack={() => setOpen(null)}
            />
          ) : (
            <div className="space-y-2">
              <div className={LABEL}>Steps, in the order they ran</div>
              <p className="text-[10px] text-subtle">Open a step's arrow to see the artifacts it left, or click it for all it did.</p>
              <Timeline run={run} onOpen={(key, round) => setOpen({ key, round })} />
            </div>
          )}
        </aside>
      </div>
      {deleting && (
        <ConfirmModal title="Delete this run?" onConfirm={remove} onClose={() => setDeleting(false)}>
          Run {run.id} is deleted with every step's results and artifacts.
        </ConfirmModal>
      )}
    </div>
  )
}

// A workflow run as it goes: its graph with each step's state, and what each step did.
export default function WorkflowRunPage() {
  const { runId } = useParams()
  const { data: run, error } = useQuery({
    queryKey: ['workflow-run', runId],
    queryFn: () => fetchRun(runId),
    refetchInterval: query => (FINISHED.includes(query.state.data?.state) || query.state.data?.state === 'paused' ? false : 2000),
  })
  if (error) return <p className="p-6 text-xs text-red-400">{error.status === 404 ? 'No such run.' : orderError(error)}</p>
  if (!run) return <p className="p-6 text-xs text-subtle">Loading…</p>
  return (
    <ReactFlowProvider>
      <RunView key={run.id} run={run} />
    </ReactFlowProvider>
  )
}
