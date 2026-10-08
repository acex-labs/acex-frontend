import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchJobs } from '../../api/workers'
import { useQueryParams } from '../../hooks/useQueryParams'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import Pagination from '../../components/table/Pagination'
import JobsTable from '../../components/jobs/JobsTable'
import { JOB_STATES } from '../../components/jobs/jobs'

// Jobs move on their own, so the list follows them without a reload.
export const REFRESH_MS = 5000

const DEFAULTS = { state: '', type: '', limit: 50, offset: 0 }

const FILTERS = [
  { key: 'state', label: 'State', width: '120px', options: JOB_STATES },
  { key: 'type',  label: 'Type',  width: '180px' },
]

export default function JobsPage() {
  const [params, setParams] = useQueryParams(DEFAULTS)

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', params],
    queryFn: () => fetchJobs(params),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Jobs" description="Work the backend has handed to workers, newest first" />
      <TableToolbar
        filters={FILTERS}
        values={{ state: params.state, type: params.type }}
        onChange={values => setParams({ ...values, offset: 0 })}
      />
      <JobsTable jobs={data?.items ?? []} isLoading={isLoading} />
      <Pagination
        offset={params.offset}
        limit={params.limit}
        total={data?.total ?? 0}
        onChange={offset => setParams({ offset })}
      />
    </div>
  )
}
