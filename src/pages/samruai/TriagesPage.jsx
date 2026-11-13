import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { fetchTriages } from '../../api/samruai'
import { formatTime } from '../../components/jobs/jobs'
import { PriorityBadge } from '../../components/samruai/Assessment'
import { TRIAGES_KEY, TRIAGE_STATUSES, triageTitle } from '../../components/samruai/triage'
import DataTable from '../../components/table/DataTable'
import TableToolbar from '../../components/table/TableToolbar'
import PageHeader from '../../components/ui/PageHeader'

const FILTERS = [
  { key: 'q', label: 'Search triages and their steps', width: '280px' },
  { key: 'status', label: 'Any status', options: Object.keys(TRIAGE_STATUSES) },
  { key: 'priority', label: 'Any priority', options: ['P1', 'P2', 'P3', 'P4'], width: '110px' },
]

const COLUMNS = [
  { key: 'id', label: '#', render: v => <span className="font-mono text-subtle">{v}</span> },
  { key: 'priority', label: 'Priority', render: v => <PriorityBadge priority={v} /> },
  { key: 'description', label: 'Triage', render: (_, t) => <span className="block max-w-[420px] truncate font-semibold" title={t.description}>{triageTitle(t)}</span> },
  {
    key: 'status', label: 'Status',
    render: s => <span className={`px-1.5 py-0.5 text-[10px] rounded border ${TRIAGE_STATUSES[s].className}`}>{TRIAGE_STATUSES[s].label}</span>,
  },
  { key: 'assignee', label: 'Lead', render: v => v ?? <span className="text-amber-400">None</span> },
  { key: 'steps', label: 'Steps' },
  { key: 'created_by', label: 'Started by', render: v => v ?? '—' },
  { key: 'created_at', label: 'Started', render: formatTime },
  { key: 'updated_at', label: 'Last change', render: formatTime },
]

// Earlier and ongoing triages, newest first: find one by what is in it, or start a new one.
export default function TriagesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filters = { q: params.get('q') ?? '', status: params.get('status') ?? '', priority: params.get('priority') ?? '' }
  const { data, isFetching, error } = useQuery({
    queryKey: [...TRIAGES_KEY, filters],
    queryFn: () => fetchTriages({ ...filters, priority: filters.priority.replace('P', '') }),
    placeholderData: keepPreviousData,
    retry: false,
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Triage"
        description="Each triage is worked out as a hypotree, from the fault description. Search finds text in a triage or any of its steps, such as a carrier or a case number."
        actions={(
          <Link to="/samruai/triage/new" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90">
            <Plus size={12} /> New triage
          </Link>
        )}
      />
      <TableToolbar
        filters={FILTERS}
        values={filters}
        onChange={next => setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })}
      />
      {error && <p className="px-6 py-2 text-xs text-red-400">{error.detail ?? error.message}</p>}
      <DataTable columns={COLUMNS} data={data ?? []} isLoading={isFetching && !data} onRowClick={t => navigate(`/samruai/triage/${t.id}`)} />
    </div>
  )
}
