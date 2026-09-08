import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, ExternalLink, ArrowLeft } from 'lucide-react'
import { fetchGrafanaDashboards } from '../../api/observability'
import { GRAFANA_URL } from '../../config'

function DashboardCard({ uid, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 p-4 bg-surface border border-edge rounded-md hover:border-brand/40 transition-colors text-left w-full"
    >
      <div className="mt-0.5 shrink-0 text-brand">
        <BarChart3 size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-content truncate">{title}</div>
        <div className="text-[11px] text-subtle mt-0.5 truncate">{uid}</div>
      </div>
      <ExternalLink
        size={13}
        className="shrink-0 text-subtle opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
      />
    </button>
  )
}

export default function DashboardsPage() {
  const [activeDashboard, setActiveDashboard] = useState(null)

  const { data: dashboards = [], isLoading, isError } = useQuery({
    queryKey: ['grafana-dashboards'],
    queryFn: fetchGrafanaDashboards,
    staleTime: 60_000,
  })

  const grafanaHref = activeDashboard
    ? `${GRAFANA_URL}/d/${activeDashboard.uid}`
    : GRAFANA_URL

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-edge shrink-0 flex items-center gap-3">
        {activeDashboard && (
          <button
            onClick={() => setActiveDashboard(null)}
            className="flex items-center gap-1 text-subtle hover:text-content transition-colors"
          >
            <ArrowLeft size={13} />
          </button>
        )}
        <h1 className="text-sm font-semibold text-content flex-1">
          {activeDashboard ? activeDashboard.title : 'Dashboards'}
        </h1>
        <a
          href={grafanaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-subtle hover:text-brand transition-colors"
        >
          <span>Open in Grafana</span>
          <ExternalLink size={11} />
        </a>
      </div>

      {/* Card grid */}
      {!activeDashboard && (
        <div className="flex-1 overflow-auto p-6">
          {isLoading && (
            <div className="text-sm text-subtle animate-pulse">Loading dashboards…</div>
          )}
          {isError && (
            <div className="text-sm text-red-500">Failed to load dashboards.</div>
          )}
          {!isLoading && !isError && dashboards.length === 0 && (
            <div className="text-sm text-subtle">No dashboards available.</div>
          )}
          {!isLoading && !isError && dashboards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
              {dashboards.map(d => (
                <DashboardCard
                  key={d.uid}
                  uid={d.uid}
                  title={d.title}
                  onClick={() => setActiveDashboard(d)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Embedded dashboard */}
      {activeDashboard && (
        <div className="flex-1 min-h-0">
          <iframe
            key={activeDashboard.uid}
            src={`${GRAFANA_URL}/d/${activeDashboard.uid}?kiosk=1&theme=light`}
            title={activeDashboard.title}
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        </div>
      )}
    </div>
  )
}
