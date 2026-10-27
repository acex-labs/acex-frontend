import { useQuery } from '@tanstack/react-query'
import { fetchRuns } from '../../api/operations'
import DataTable from '../table/DataTable'
import JobStateBadge from '../jobs/JobStateBadge'
import { formatDuration, formatTime } from '../jobs/jobs'
import { runDuration, runProgress, runSummary, FINISHED } from './runs'

// Runs of one kind, newest first, kept fresh while any is still running. A row opens its run.
export default function RunsTable({ kind, onOpen }) {
  const { data, isFetching } = useQuery({
    queryKey: ['runs', kind],
    queryFn: () => fetchRuns({ kind, limit: 50 }),
    refetchInterval: query => (query.state.data?.items?.some(r => !FINISHED.includes(r.state)) ? 3000 : false),
  })

  const columns = [
    { key: 'id', label: 'Run' },
    { key: 'summary', label: 'Request', render: (_, run) => <span className="font-mono truncate inline-block max-w-md align-bottom">{runSummary(run)}</span> },
    {
      key: 'progress', label: 'Nodes',
      render: (_, run) => {
        const { done, total, failed } = runProgress(run)
        return <span className="tabular-nums">{done}/{total}{failed ? <span className="text-red-400"> · {failed} failed</span> : null}</span>
      },
    },
    { key: 'state', label: 'State', render: state => <JobStateBadge state={state} /> },
    { key: 'created_by', label: 'Ordered by' },
    { key: 'created_at', label: 'Ordered', render: formatTime },
    // Refreshed with the table while the run is going, so a running one's time counts up.
    {
      key: 'took', label: 'Took',
      render: (_, run) => {
        if (run.finished_at) return <span className="tabular-nums">{formatDuration(runDuration(run))}</span>
        if (FINISHED.includes(run.state)) return '—'
        return <span className="tabular-nums text-subtle">{formatDuration(runDuration(run))}</span>
      },
    },
  ]

  return <DataTable columns={columns} data={data?.items ?? []} isLoading={isFetching && !data} onRowClick={run => onOpen(run.id)} />
}
