import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAllSites } from '../../api/inventory'
import ComplianceBar from './ComplianceBar'
import { formatPct } from './compliance'

// The best or worst sites by one compliance KPI, as a meter list: name, bar and figure per row. Sites with
// nothing measured for the KPI are left out.
// sites: { [siteName]: compliance summary }; kind: 'configuration' | 'software'; order: 'best' | 'worst'.
export default function SiteRanking({ sites, kind, order, limit = 5, title, loading }) {
  // Sites are opened by id; compliance names them. Shares its cache with the dashboard map.
  const { data: allSites = [] } = useQuery({ queryKey: ['all-sites'], queryFn: fetchAllSites, staleTime: 120_000 })
  const idOf = new Map(allSites.map(s => [s.name, s.id]))

  const rows = Object.entries(sites ?? {})
    .map(([name, summary]) => ({ name, pct: summary[kind]?.compliance_percentage ?? null }))
    .filter(r => r.pct != null)
    .sort((a, b) => (order === 'best' ? b.pct - a.pct : a.pct - b.pct) || a.name.localeCompare(b.name))
    .slice(0, limit)

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-edge">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
      </div>
      {loading ? (
        <p className="px-4 py-3 text-xs text-subtle animate-pulse">Checking…</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-3 text-xs text-subtle">No site measured yet.</p>
      ) : (
        <ul className="px-4 py-2 space-y-2">
          {rows.map(r => (
            <li key={r.name} className="grid grid-cols-[minmax(0,8rem)_1fr_3.5rem] items-center gap-3 text-xs">
              {idOf.has(r.name)
                ? <Link to={`/network/sites/${idOf.get(r.name)}`} className="truncate text-content hover:text-brand">{r.name}</Link>
                : <span className="truncate text-content">{r.name}</span>}
              <ComplianceBar pct={r.pct} />
              <span className="text-right tabular-nums text-content">{formatPct(r.pct)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
