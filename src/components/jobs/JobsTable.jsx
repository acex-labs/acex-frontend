import { useNavigate } from 'react-router-dom'
import DataTable from '../table/DataTable'
import JobStateBadge from './JobStateBadge'
import { childSummary, formatTime } from './jobs'

const COLUMNS = [
  { key: 'id',         label: 'ID' },
  { key: 'type',       label: 'Type' },
  { key: 'state',      label: 'State', render: (v, row) => (
    <span className="inline-flex items-center gap-2">
      <JobStateBadge state={v} />
      {row.children && <span className="text-[11px] text-subtle">{childSummary(row.children)}</span>}
    </span>
  ) },
  { key: 'subject_type', label: 'Subject', render: (v, row) => (v ? `${v} ${row.subject_id}` : '—') },
  { key: 'attempts',   label: 'Attempts' },
  { key: 'claimed_by', label: 'Worker', render: v => v ?? '—' },
  { key: 'created_at', label: 'Created', render: formatTime },
  { key: 'finished_at', label: 'Finished', render: formatTime },
]

// Shared by the job list and a batch's page, which lists the batch's jobs.
export default function JobsTable({ jobs, isLoading }) {
  const navigate = useNavigate()
  return (
    <DataTable
      columns={COLUMNS}
      data={jobs}
      isLoading={isLoading}
      onRowClick={job => navigate(`/activity/jobs/${job.id}`)}
    />
  )
}
