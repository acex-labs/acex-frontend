import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { fetchJob, fetchJobs } from '../../api/workers'
import JobStateBadge from '../../components/jobs/JobStateBadge'
import JobsTable from '../../components/jobs/JobsTable'
import JobActions from '../../components/jobs/JobActions'
import { childSummary, formatTime } from '../../components/jobs/jobs'
import { REFRESH_MS } from './JobsPage'

const FINISHED = ['succeeded', 'failed', 'cancelled']

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-4 py-2 border-b border-edge last:border-0">
      <dt className="w-32 shrink-0 text-[11px] text-subtle">{label}</dt>
      <dd className="text-xs text-content break-all">{value}</dd>
    </div>
  )
}

function Json({ title, value, tone = 'text-content' }) {
  if (value === undefined || value === null) return null
  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2 border-b border-edge text-[11px] font-semibold text-subtle uppercase tracking-wider">
        {title}
      </div>
      <pre className={`px-4 py-3 text-xs font-mono whitespace-pre-wrap break-all ${tone}`}>
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

export default function JobPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id),
    // Keep following a job until it has finished.
    refetchInterval: query => (FINISHED.includes(query.state.data?.state) ? false : REFRESH_MS),
  })

  const isBatch = !!job?.children
  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ['jobs', { parent_id: id }],
    queryFn: () => fetchJobs({ parent_id: id, limit: 1000 }),
    enabled: isBatch,
    refetchInterval: FINISHED.includes(job?.state) ? false : REFRESH_MS,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <Link
          to="/activity/jobs"
          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-content mb-2 transition-colors"
        >
          <ChevronLeft size={11} />
          Jobs
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-content">
            {isLoading ? '—' : job ? `Job ${job.id} · ${job.type}` : `Job ${id}`}
          </h1>
          {job && <JobStateBadge state={job.state} />}
          {job && (
            <span className="ml-auto">
              <JobActions
                job={job}
                onDeleted={() => navigate(job.parent_id ? `/activity/jobs/${job.parent_id}` : '/activity/jobs')}
              />
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {error && (
          <p className="text-xs text-red-400">
            {error.status === 404 ? `There is no job ${id}.` : `Could not load job ${id}.`}
          </p>
        )}

        {job && (
          <>
            <div className="max-w-2xl bg-surface border border-edge rounded-md overflow-hidden px-4">
              <dl>
                <Field label="Type" value={job.type} />
                <Field label="State" value={<JobStateBadge state={job.state} />} />
                {isBatch && <Field label="Jobs" value={childSummary(job.children)} />}
                {job.parent_id && (
                  <Field
                    label="Batch"
                    value={<Link to={`/activity/jobs/${job.parent_id}`} className="text-brand hover:underline">Job {job.parent_id}</Link>}
                  />
                )}
                {job.subject_type && <Field label="Subject" value={`${job.subject_type} ${job.subject_id}`} />}
                <Field label="Attempts" value={String(job.attempts)} />
                <Field label="Created by" value={job.created_by} />
                <Field label="Worker" value={job.claimed_by} />
                <Field label="Cancelled by" value={job.cancelled_by} />
                <Field label="Created" value={formatTime(job.created_at)} />
                {job.started_at && <Field label="Started" value={formatTime(job.started_at)} />}
                {job.finished_at && <Field label="Finished" value={formatTime(job.finished_at)} />}
              </dl>
            </div>

            <div className="max-w-2xl space-y-4">
              <Json title="Error" value={job.error} tone="text-red-400" />
              <Json title="Data" value={job.data} />
              <Json title="Result" value={job.result} />
            </div>
          </>
        )}

        {isBatch && (
          <div className="bg-surface border border-edge rounded-md overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-edge text-[11px] font-semibold text-subtle uppercase tracking-wider">
              Jobs in this batch
            </div>
            <JobsTable jobs={batch?.items ?? []} isLoading={batchLoading} />
          </div>
        )}
      </div>
    </div>
  )
}
