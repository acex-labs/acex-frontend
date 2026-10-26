import { useQuery } from '@tanstack/react-query'
import { fetchRuns } from '../../api/workflows'
import DataTable from '../table/DataTable'
import JobStateBadge from '../jobs/JobStateBadge'
import { formatTime } from '../jobs/jobs'
import { FINISHED } from '../operations/runs'
import { MODES } from './steps'

// Workflow runs, newest first: of one workflow, or of all. Kept fresh while any is still running.
export default function WorkflowRunsTable({ workflowId, onOpen }) {
  const { data, isFetching } = useQuery({
    queryKey: ['workflow-runs', workflowId ?? 'all'],
    queryFn: () => fetchRuns({ workflow_id: workflowId, limit: 100 }),
    refetchInterval: query => (query.state.data?.items?.some(r => r.state === 'running' || r.state === 'queued') ? 3000 : false),
  })

  const columns = [
    { key: 'id', label: 'Run' },
    { key: 'name', label: 'Workflow' },
    { key: 'mode', label: 'Mode', render: mode => MODES[mode] ?? mode },
    { key: 'state', label: 'State', render: state => <JobStateBadge state={state} /> },
    {
      key: 'error', label: 'Outcome',
      render: (error, run) => error
        ? <span className="text-red-400 truncate inline-block max-w-sm align-bottom" title={error}>{error}</span>
        : FINISHED.includes(run.state) ? '—' : <span className="text-subtle">{run.state === 'paused' ? 'Waits for continue' : 'Running'}</span>,
    },
    { key: 'created_by', label: 'Started by' },
    { key: 'created_at', label: 'Started', render: formatTime },
    { key: 'finished_at', label: 'Finished', render: formatTime },
  ]

  return <DataTable columns={columns} data={data?.items ?? []} isLoading={isFetching && !data} onRowClick={run => onOpen(run.id)} />
}
