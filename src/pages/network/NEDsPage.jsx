import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'

function NEDCard({ ned }) {
  return (
    <div className="bg-surface border border-edge rounded-md px-5 py-4 hover:border-edge/80 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <span className="text-sm font-semibold text-content">{ned.name}</span>
        <span className="text-[10px] font-mono text-subtle bg-surface-hi px-2 py-0.5 rounded shrink-0">
          v{ned.version}
        </span>
      </div>
      {ned.description && (
        <p className="text-xs text-subtle mb-3">{ned.description}</p>
      )}
      <div className="text-[10px] text-subtle font-mono">{ned.package_name}</div>
    </div>
  )
}

export default function NEDsPage() {
  const { data: neds = [], isLoading } = useQuery({
    queryKey: ['neds'],
    queryFn: () => apiFetch('/api/v1/neds/'),
    staleTime: 300_000,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Drivers"
        description={neds.length > 0 ? `${neds.length} installed` : undefined}
      />
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bg-surface border border-edge rounded-md px-5 py-4 animate-pulse h-24" />
            ))}
          </div>
        ) : neds.length === 0 ? (
          <div className="text-xs text-subtle">No drivers installed.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {neds.map(ned => <NEDCard key={ned.name} ned={ned} />)}
          </div>
        )}
      </div>
    </div>
  )
}
