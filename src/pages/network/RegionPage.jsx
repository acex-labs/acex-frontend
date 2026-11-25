import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MapPin, Pencil } from 'lucide-react'
import { fetchAllSites, fetchLogicalNodes, fetchNodes, fetchRegion } from '../../api/inventory'
import { COMPLIANCE_STALE_TIME, fetchComplianceOverview, fetchSoftwareAssets } from '../../api/compliance'
import { usePageAiContext } from '../../context/AiContext'
import SiteMap from '../../components/map/SiteMap'
import RegionFormModal from '../../components/regions/RegionFormModal'
import ComplianceTable from '../../components/compliance/ComplianceTable'
import { ConfigurationComplianceCard, SoftwareComplianceCard } from '../../components/compliance/ComplianceCards'

// A region at a glance: how many sites, nodes, logical nodes and assets it holds, how compliant it is, and which of its
// sites are furthest from compliance. Each count opens the list of that kind filtered to the region.

function buildRegionContext(region, siteNames, counts) {
  if (!region) return ''
  const rows = [
    `Name: ${region.name}`,
    region.display_name && region.display_name !== region.name ? `Display name: ${region.display_name}` : null,
    region.description ? `Description: ${region.description}` : null,
    `Sites (${siteNames.length}): ${siteNames.join(', ') || 'none'}`,
    counts ? `Node instances: ${counts.nodes}` : null,
    counts ? `Logical nodes: ${counts.logicalNodes}` : null,
    counts ? `Assets on nodes: ${counts.assets}` : null,
  ].filter(Boolean)
  return `Region:\n${rows.map(r => `  ${r}`).join('\n')}`
}

function CountTile({ to, label, value, hint }) {
  return (
    <Link
      to={to}
      title={hint}
      className="bg-surface border border-edge rounded-md px-5 py-4 hover:border-brand/40 transition-colors"
    >
      <div className="text-2xl font-semibold text-content tabular-nums">
        {value ?? <span className="text-subtle animate-pulse">—</span>}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-subtle mt-0.5">{label}</div>
    </Link>
  )
}

// The lowest percentage the site has, so the site furthest from compliance comes first; one nothing measures, last.
const weakest = summary => {
  const measured = [summary?.configuration?.compliance_percentage, summary?.software?.compliance_percentage].filter(p => p != null)
  return measured.length ? Math.min(...measured) : Infinity
}

export default function RegionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data: region, isLoading } = useQuery({
    queryKey: ['region', id],
    queryFn: () => fetchRegion(id),
  })
  const name = region?.name

  // Live counts, as the lists they open would show them. The assets are those on a node, as on the software page.
  const { data: counts } = useQuery({
    queryKey: ['region-counts', name],
    queryFn: async () => {
      const [nodes, logicalNodes, assets] = await Promise.all([
        fetchNodes({ region: name, limit: 1 }),
        fetchLogicalNodes({ region: name, limit: 1 }),
        fetchSoftwareAssets({ region: name, limit: 1 }),
      ])
      return { nodes: nodes.total, logicalNodes: logicalNodes.total, assets: assets.total }
    },
    enabled: !!name,
  })

  // The last measurement of the installation, the same the compliance overview and the dashboard show.
  const overview = useQuery({
    queryKey: ['compliance', 'overview'],
    queryFn: fetchComplianceOverview,
    staleTime: COMPLIANCE_STALE_TIME,
  })
  const summary = overview.data?.regions?.[name]

  // A region lists its sites by name; the map and the links need their id and place.
  const { data: allSites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['all-sites'],
    queryFn: fetchAllSites,
    staleTime: 120_000,
  })
  const siteNames = useMemo(() => (region?.sites ?? []).map(s => s.name), [region])
  const sites = useMemo(() => allSites.filter(s => siteNames.includes(s.name)), [allSites, siteNames])
  const siteRows = useMemo(
    () => sites
      .map(site => ({
        key: site.name,
        name: site.name,
        to: `/network/sites/${site.id}?tab=compliance`,
        summary: overview.data?.sites?.[site.name],
      }))
      .sort((a, b) => weakest(a.summary) - weakest(b.summary) || a.name.localeCompare(b.name)),
    [sites, overview.data],
  )
  const hasCoordinates = sites.some(s => s.latitude != null && s.longitude != null)

  usePageAiContext({
    pageName: `Region: ${region?.display_name || region?.name || id}`,
    context: buildRegionContext(region, siteNames, counts),
  })

  const filter = `?region=${encodeURIComponent(name ?? '')}`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <Link
          to="/network/regions"
          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-content mb-2 transition-colors"
        >
          <ChevronLeft size={11} />
          Regions
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-content">
              {isLoading ? '—' : (region?.display_name || region?.name || 'Region')}
            </h1>
            {region?.name && region.name !== region.display_name && (
              <span className="text-[10px] text-subtle font-mono">{region.name}</span>
            )}
          </div>
          {region && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
            >
              <Pencil size={11} />
              Edit
            </button>
          )}
        </div>
        {region?.description && <p className="text-[11px] text-subtle mt-1">{region.description}</p>}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
        ) : !region ? (
          <div className="p-6 text-xs text-subtle">Region not found.</div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <CountTile to={`/network/sites${filter}`} label="Sites" value={siteNames.length} />
              <CountTile to={`/network/nodes${filter}`} label="Node Instances" value={counts?.nodes} />
              <CountTile to={`/network/logical-nodes${filter}`} label="Logical Nodes" value={counts?.logicalNodes} />
              <CountTile
                to={`/compliance/software${filter}`}
                label="Assets"
                value={counts?.assets}
                hint="The assets on a node, against the software policy"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ConfigurationComplianceCard
                summary={summary?.configuration}
                loading={overview.isLoading}
                error={overview.isError}
              />
              <SoftwareComplianceCard
                summary={summary?.software}
                loading={overview.isLoading}
                error={overview.isError}
                to={`/compliance/software${filter}`}
              />
            </div>
            {overview.isSuccess && !summary && counts?.nodes > 0 && (
              <p className="text-[11px] text-subtle">
                Not measured yet. The installation is measured every ten minutes, and this region is new since the last one.
              </p>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
              <ComplianceTable
                title="Sites in the region · furthest from compliance first"
                nameLabel="Site"
                rows={siteRows}
                loading={sitesLoading || overview.isLoading}
                emptyText="No sites in this region."
              />
              <div className="bg-surface border border-edge rounded-md overflow-hidden" style={{ minHeight: 340 }}>
                {hasCoordinates ? (
                  <SiteMap sites={sites} fit onSiteClick={site => navigate(`/network/sites/${site.id}`)} />
                ) : (
                  <div className="flex items-center justify-center h-full gap-2 text-xs text-subtle">
                    <MapPin size={14} />
                    No site with coordinates
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {editing && region && (
        <RegionFormModal
          region={region}
          onClose={() => setEditing(false)}
          onSuccess={saved => {
            queryClient.invalidateQueries({ queryKey: ['regions'] })
            // A deleted region has nothing left to show; leave before the page asks for it again.
            if (saved === null) navigate('/network/regions')
            else queryClient.invalidateQueries({ queryKey: ['region', id] })
          }}
        />
      )}
    </div>
  )
}
