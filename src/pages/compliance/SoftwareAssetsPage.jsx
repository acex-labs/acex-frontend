import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { fetchSoftwareAssets, SOFTWARE_ASSETS_KEY } from '../../api/compliance'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useSiteRegionFilters } from '../../hooks/useSiteRegionFilters'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import SoftwareStatus from '../../components/compliance/SoftwareStatus'
import { SOFTWARE_PART_BY_KEY } from '../../components/compliance/compliance'

// Every asset on a node against the software policy, to filter and search for the ones to work with. The statuses,
// the filters and the order are kept in the address, so a view can be shared and the compliance pages can link here.
const DEFAULTS = {
  status: '', q: '', site: '', region: '',
  sort: 'status', order: 'asc', limit: 50, offset: 0,
}

// The statuses as the list orders them: what is not on an approved version first, then what nothing measures.
const STATUS_ORDER = ['not_allowed', 'unknown_version', 'no_policy', 'accepted', 'golden']

const STATUS_HINTS = {
  not_allowed: 'The software policy covers the asset and does not approve the version it runs.',
  unknown_version: 'The policy covers the asset, but it has not reported its version. Left out of the percentage.',
  no_policy: 'No version is approved for its model or vendor, so there is nothing to measure it against. Left out of the percentage.',
  accepted: 'On an approved version that is not the golden one.',
  golden: 'On the golden version.',
}

const COLUMNS = [
  { key: 'status', label: 'Status', sortable: true, render: status => <SoftwareStatus status={status} /> },
  {
    key: 'hostname', label: 'Node', sortable: true,
    render: (hostname, row) => (
      <span className="inline-flex items-center gap-2">
        <Link
          to={`/network/nodes/${row.node_id}`}
          onClick={e => e.stopPropagation()}
          className="font-medium text-content hover:text-brand transition-colors"
        >
          {hostname ?? `Node ${row.node_id}`}
        </Link>
        {row.cluster && (
          <span className="text-[10px] text-subtle" title={`A member of the asset cluster ${row.cluster}`}>{row.cluster}</span>
        )}
      </span>
    ),
  },
  { key: 'site', label: 'Site', sortable: true },
  { key: 'hardware_model', label: 'Model', sortable: true },
  { key: 'serial_number', label: 'Serial', sortable: true, render: serial => <span className="font-mono">{serial}</span> },
  {
    key: 'os_version', label: 'Running', sortable: true,
    render: (version, row) => (
      <span className="font-mono whitespace-nowrap">
        {row.os} {version ?? <span className="font-sans text-subtle">unknown</span>}
      </span>
    ),
  },
  { key: 'golden_version', label: 'Golden', render: golden => (golden ? <span className="font-mono text-subtle">{golden}</span> : '—') },
  { key: 'regions', label: 'Regions', render: regions => (regions?.length ? regions.join(', ') : '—') },
]

function Chip({ active, onClick, title, swatch, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
        active ? 'bg-brand/10 border-brand/40 text-brand' : 'border-edge text-subtle hover:text-content hover:border-edge/80',
      ].join(' ')}
    >
      {swatch && <span className={`inline-block w-2 h-2 rounded-full ${swatch}`} aria-hidden="true" />}
      {label}
      {count != null && (
        <span
          className={[
            'inline-flex items-center justify-center rounded-full px-1.5 min-w-[18px] text-[10px] font-semibold tabular-nums',
            active ? 'bg-brand/20 text-brand' : 'bg-surface-hi text-subtle',
          ].join(' ')}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// One chip per status, any number of them on at once, and All for none; each says how many assets it would show.
function StatusChips({ selected, counts, onChange }) {
  const toggle = key => onChange(selected.includes(key) ? selected.filter(s => s !== key) : [...selected, key])
  const all = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : null
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-edge shrink-0 flex-wrap">
      <Chip active={selected.length === 0} onClick={() => onChange([])} label="All" count={all} />
      {STATUS_ORDER.map(key => (
        <Chip
          key={key}
          active={selected.includes(key)}
          onClick={() => toggle(key)}
          title={STATUS_HINTS[key]}
          swatch={SOFTWARE_PART_BY_KEY[key].fill}
          label={SOFTWARE_PART_BY_KEY[key].label}
          count={counts?.[key]}
        />
      ))}
    </div>
  )
}

export default function SoftwareAssetsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useQueryParams(DEFAULTS)

  // A status the page does not know, typed into the address, is left out rather than refused by the server.
  const statuses = useMemo(
    () => (params.status ? params.status.split(',').filter(s => STATUS_ORDER.includes(s)) : []),
    [params.status],
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: [...SOFTWARE_ASSETS_KEY, { ...params, status: statuses }],
    queryFn: () => fetchSoftwareAssets({ ...params, status: statuses }),
    placeholderData: keepPreviousData,
  })

  const filters = [
    { key: 'q', label: 'Search assets…', search: true, hint: 'Matches node, serial number, model and version.' },
    ...useSiteRegionFilters(params),
  ]

  const total = data?.total ?? 0

  // A row is an asset on a node. The asset alone does not name it: an inventory can bind one asset to two nodes,
  // and each is counted, as the compliance of the installation counts it.
  const rows = useMemo(() => (data?.items ?? []).map(row => ({ ...row, rowId: `${row.node_id}:${row.asset_id}` })), [data])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Software compliance"
        description={`Every asset on a node against the software policy${data ? ` · ${total} ${total === 1 ? 'asset' : 'assets'}` : ''}`}
        actions={
          <Link
            to="/compliance/policies"
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border border-edge text-subtle hover:text-content transition-colors"
          >
            <ScrollText size={12} />
            Software policy
          </Link>
        }
      />

      <StatusChips
        selected={statuses}
        counts={data?.status_counts}
        onChange={next => setParams({ status: next.join(','), offset: 0 })}
      />

      <TableToolbar
        filters={filters}
        values={{ q: params.q, site: params.site, region: params.region }}
        onChange={vals => setParams({ ...vals, offset: 0 })}
      />

      {isError && <p className="px-6 py-3 text-xs text-red-400">Could not load the assets.</p>}

      <DataTable
        columns={COLUMNS}
        data={rows}
        isLoading={isLoading}
        rowKey="rowId"
        sortKey={params.sort}
        sortOrder={params.order}
        onSort={(key, order) => setParams({ sort: key, order, offset: 0 })}
        onRowClick={row => navigate(`/network/assets/${row.asset_id}`)}
      />

      <Pagination
        offset={params.offset}
        limit={params.limit}
        total={total}
        onChange={offset => setParams({ offset })}
      />
    </div>
  )
}
