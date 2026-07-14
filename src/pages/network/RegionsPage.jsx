import { useState, Fragment } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fetchRegions, fetchSites } from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import Pagination from '../../components/table/Pagination'
import SiteMap from '../../components/map/SiteMap'

const DEFAULTS = {
  name: '', sort: 'name', order: 'asc', limit: 50, offset: 0,
}

const FILTERS = [
  { key: 'name', label: 'Name', width: '180px' },
]

const COLUMNS = [
  { key: 'name',         label: 'Name',         sortable: true },
  { key: 'display_name', label: 'Display Name' },
  { key: 'description',  label: 'Description' },
]

function RegionSites({ regionName }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['sites-by-region', regionName],
    queryFn: () => fetchSites({ region: regionName, limit: 1000 }),
  })

  const sites = data?.items ?? []
  const mappable = sites.filter(s => s.latitude != null && s.longitude != null)

  if (isLoading) return <div className="px-6 py-3 text-xs text-subtle animate-pulse">Loading…</div>
  if (!sites.length) return <div className="px-6 py-3 text-xs text-subtle">No sites in this region.</div>

  return (
    <div>
      <div className="px-6 py-3 flex flex-wrap gap-2">
        {sites.map(s => (
          <a
            key={s.id ?? s.name}
            href={`/network/sites/${s.id}`}
            className="inline-flex items-center px-2.5 py-1 rounded text-[11px] bg-surface-hi border border-edge text-content hover:border-brand/40 transition-colors"
          >
            {s.display_name || s.name}
          </a>
        ))}
      </div>
      {mappable.length > 0 && (
        <div className="mx-6 mb-4 rounded overflow-hidden border border-edge" style={{ height: 280 }}>
          <SiteMap
            sites={sites}
            onSiteClick={site => navigate(`/network/sites/${site.id}`)}
          />
        </div>
      )}
    </div>
  )
}

export default function RegionsPage() {
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [expanded, setExpanded] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['regions', params],
    queryFn: () => fetchRegions(params),
    placeholderData: keepPreviousData,
  })

  const regions = data?.items ?? []
  const total = data?.total ?? 0

  const toggleExpand = (row) => {
    setExpanded(prev => prev === row.name ? null : row.name)
  }

  const columnsWithExpand = [
    {
      key: '_expand',
      label: '',
      render: (_, row) => (
        <span className="text-subtle">
          {expanded === row.name ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      ),
    },
    ...COLUMNS,
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Regions"
        description={total > 0 ? `${total} regions` : undefined}
      />
      <TableToolbar
        filters={FILTERS}
        values={{ name: params.name }}
        onChange={vals => setParams({ ...vals, offset: 0 })}
      />
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-canvas z-10">
            <tr className="border-b border-edge">
              {columnsWithExpand.map(col => (
                <th key={col.key} className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle px-4 py-2.5 first:pl-6 last:pr-6">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-edge/50">
                    {columnsWithExpand.map(col => (
                      <td key={col.key} className="px-4 py-2.5 first:pl-6 last:pr-6">
                        <div className="h-3 bg-surface-hi rounded animate-pulse" style={{ width: col.key === '_expand' ? 12 : '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : regions.map(row => (
                  <Fragment key={row.name}>
                    <tr
                      onClick={() => toggleExpand(row)}
                      className="border-b border-edge/50 hover:bg-surface-hi transition-colors cursor-pointer"
                    >
                      {columnsWithExpand.map(col => (
                        <td key={col.key} className="px-4 py-2.5 first:pl-6 last:pr-6 text-content">
                          {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                    {expanded === row.name && (
                      <tr className="border-b border-edge bg-surface">
                        <td colSpan={columnsWithExpand.length}>
                          <RegionSites regionName={row.name} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
            }
          </tbody>
        </table>
      </div>
      <Pagination
        offset={params.offset}
        limit={params.limit}
        total={total}
        onChange={offset => setParams({ offset })}
      />
    </div>
  )
}
