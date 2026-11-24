import { useQuery } from '@tanstack/react-query'
import { fetchComplianceOverview, COMPLIANCE_STALE_TIME } from '../../api/compliance'
import { fetchRegions } from '../../api/inventory'
import { ConfigurationComplianceCard, SoftwareComplianceCard } from '../../components/compliance/ComplianceCards'
import SiteRanking from '../../components/compliance/SiteRanking'
import ComplianceTable from '../../components/compliance/ComplianceTable'
import PageHeader from '../../components/ui/PageHeader'

export default function OverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['compliance', 'overview'],
    queryFn: fetchComplianceOverview,
    staleTime: COMPLIANCE_STALE_TIME,
  })
  const sites = data?.sites

  // Regions are opened by id; compliance names them. Shares its cache with the software compliance page.
  const { data: regionData } = useQuery({
    queryKey: ['regions', 'all'],
    queryFn: () => fetchRegions({ limit: 1000 }),
    staleTime: 120_000,
  })
  const regionId = new Map((regionData?.items ?? []).map(r => [r.name, r.id]))
  const regionRows = Object.entries(data?.regions ?? {}).map(([name, summary]) => ({
    key: name,
    name,
    summary,
    to: regionId.has(name) ? `/network/regions/${regionId.get(name)}` : undefined,
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Compliance overview"
        description="Configuration and software compliance over every node, measured now. The two are separate KPIs."
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConfigurationComplianceCard summary={data?.summary.configuration} loading={isLoading} error={isError} />
          <SoftwareComplianceCard summary={data?.summary.software} loading={isLoading} error={isError} to="/compliance/software" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SiteRanking sites={sites} kind="configuration" order="best" title="Top 5 sites · configuration" loading={isLoading} />
          <SiteRanking sites={sites} kind="configuration" order="worst" title="5 worst sites · configuration" loading={isLoading} />
          <SiteRanking sites={sites} kind="software" order="best" title="Top 5 sites · software" loading={isLoading} />
          <SiteRanking sites={sites} kind="software" order="worst" title="5 worst sites · software" loading={isLoading} />
        </div>

        <ComplianceTable
          title="Compliance per region"
          nameLabel="Region"
          rows={regionRows}
          loading={isLoading}
          emptyText="No regions with sites yet."
        />
      </div>
    </div>
  )
}
