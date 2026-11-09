import { useState } from 'react'
import { NavLink, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { createWorkflow, fetchWorkflows } from '../../../api/workflows'
import DataTable from '../../../components/table/DataTable'
import { formatTime } from '../../../components/jobs/jobs'
import { orderError } from '../../../components/operations/runs'
import WorkflowRunsTable from '../../../components/workflows/WorkflowRunsTable'

const BUTTON = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed'

// Saved workflows; a new one opens in the builder with only its start and end.
function WorkflowList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isFetching } = useQuery({ queryKey: ['workflows'], queryFn: fetchWorkflows })
  const [name, setName] = useState(null)
  const [error, setError] = useState(null)

  const create = async e => {
    e.preventDefault()
    setError(null)
    try {
      const workflow = await createWorkflow({ name: name.trim() })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      navigate(`/operations/workflows/edit/${workflow.id}`)
    } catch (err) {
      setError(orderError(err))
    }
  }

  const columns = [
    { key: 'name', label: 'Name', render: v => <span className="font-semibold">{v}</span> },
    { key: 'description', label: 'Description', render: v => v ?? '—' },
    { key: 'steps', label: 'Steps', render: (_, w) => w.graph.nodes.filter(n => n.kind === 'step').length },
    {
      key: 'check', label: 'Ready',
      render: check => {
        const problems = Object.values(check.problems).flat().length
        return problems
          ? <span className="text-amber-400">{problems} problem{problems === 1 ? '' : 's'}</span>
          : <span className="text-green-400">Ready to run</span>
      },
    },
    { key: 'updated_by', label: 'Changed by' },
    { key: 'updated_at', label: 'Changed', render: formatTime },
  ]

  return (
    <div className="space-y-4">
      {name == null ? (
        <button onClick={() => setName('')} className={BUTTON}><Plus size={12} /> New workflow</button>
      ) : (
        <form onSubmit={create} className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setName(null)}
            placeholder="Name"
            className="w-64 px-3 py-1.5 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50"
          />
          <button type="submit" disabled={!name.trim()} className={BUTTON}>Create</button>
          <button type="button" onClick={() => setName(null)} className="text-subtle hover:text-content"><X size={14} /></button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </form>
      )}
      <section className="border border-edge rounded-md overflow-hidden flex flex-col">
        <DataTable columns={columns} data={data ?? []} isLoading={isFetching && !data} onRowClick={w => navigate(`/operations/workflows/edit/${w.id}`)} />
      </section>
    </div>
  )
}

// Runs of every workflow, or with ?workflow= of one.
function RunList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const workflowId = params.get('workflow')
  const { data: workflows } = useQuery({ queryKey: ['workflows'], queryFn: fetchWorkflows, enabled: !!workflowId })
  const workflow = workflows?.find(w => String(w.id) === workflowId)
  return (
    <div className="space-y-4">
      {workflowId && (
        <div className="flex items-center gap-2 text-[11px] text-subtle">
          Runs of <span className="text-content font-semibold">{workflow?.name ?? `workflow ${workflowId}`}</span>
          <button onClick={() => setParams({})} className="text-subtle hover:text-content" title="Show every workflow's runs"><X size={12} /></button>
        </div>
      )}
      <section className="border border-edge rounded-md overflow-hidden flex flex-col">
        <WorkflowRunsTable workflowId={workflowId} onOpen={id => navigate(`/operations/workflows/run/${id}`)} />
      </section>
    </div>
  )
}

const SECTIONS = [
  {
    key: 'workflows',
    label: 'Workflows',
    about: 'Steps on a canvas from start to end: each step runs when the steps before it are done, on the nodes it is given, and leaves named artifacts for the steps after it.',
    Panel: WorkflowList,
  },
  {
    key: 'runs',
    label: 'Runs',
    about: 'Every workflow run by anyone, newest first. Deleting a run deletes all it made.',
    Panel: RunList,
  },
]

export default function WorkflowsPage() {
  const { section } = useParams()
  const current = SECTIONS.find(s => s.key === section)
  if (!current) return <Navigate to={`/operations/workflows/${SECTIONS[0].key}`} replace />

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-edge px-4 shrink-0">
        {SECTIONS.map(({ key, label }) => (
          <NavLink
            key={key}
            to={`/operations/workflows/${key}`}
            className={({ isActive }) => [
              'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
              isActive ? 'border-brand text-content' : 'border-transparent text-subtle hover:text-content',
            ].join(' ')}
          >
            {label}
          </NavLink>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <p className="text-[11px] text-subtle">{current.about}</p>
        <current.Panel key={current.key} />
      </div>
    </div>
  )
}
