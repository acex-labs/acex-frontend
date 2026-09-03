import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStats, fetchAllSites } from '../api/inventory'
import SiteMap from '../components/map/SiteMap'

const STAT_DEFS = [
  { key: 'nodes',   label: 'Nodes',   href: '/network/nodes' },
  { key: 'assets',  label: 'Assets',  href: '/network/assets' },
  { key: 'sites',   label: 'Sites',   href: '/network/sites' },
  { key: 'regions', label: 'Regions', href: '/network/regions' },
]

function StatCard({ label, value, href }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(href)}
      className="bg-surface border border-edge rounded-md px-5 py-4 text-left hover:border-brand/40 transition-colors"
    >
      <div className="text-2xl font-semibold text-content tabular-nums">
        {value ?? <span className="animate-pulse text-subtle">—</span>}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-subtle mt-0.5">{label}</div>
    </button>
  )
}

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    staleTime: 60_000,
  })

  const { data: sites = [] } = useQuery({
    queryKey: ['all-sites'],
    queryFn: fetchAllSites,
    staleTime: 120_000,
  })

  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <h1 className="text-sm font-semibold text-content">Dashboard</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_DEFS.map(({ key, label, href }) => (
            <StatCard key={key} label={label} value={stats?.[key]} href={href} />
          ))}
        </div>

        {/* Map */}
        <div className="bg-surface border border-edge rounded-md overflow-hidden" style={{ height: '480px' }}>
          <div className="px-4 py-2.5 border-b border-edge">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Sites</h3>
          </div>
          <div style={{ height: 'calc(100% - 37px)' }}>
            <SiteMap
              sites={sites}
              onSiteClick={site => navigate(`/network/sites/${site.id}`)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
