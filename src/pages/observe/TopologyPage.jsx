import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'
import TopologyCanvas from '../../components/topology/TopologyCanvas'
import { ToggleButton, Segmented, FilterSelect, MultiSelect } from '../../components/topology/TopologyControls'
import { TopologyModel, DEVICE, UNMANAGED, NO_SITE, NO_REGION } from '../../components/topology/TopologyModel'
import { TopologyFlow } from '../../components/topology/TopologyFlow'
import { fetchTopology, fetchTopologyLayers } from '../../api/topology'
import { fetchRegions, fetchSites } from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import { useTopologyLayout } from '../../hooks/useTopologyLayout'

const PERSPECTIVES = [
  { value: 'nodes',   label: 'Nodes' },
  { value: 'sites',   label: 'Sites' },
  { value: 'regions', label: 'Regions' },
]

const DEFAULTS = { perspective: 'sites', regions: '', site: '', roles: '', layers: '', unmanaged: '1' }

const list = value => (value ? value.split(',') : [])

function kicker(node) {
  if (node.kind !== DEVICE) return 'Unmanaged'
  return node.in_scope ? (node.role ?? 'Node') : `${node.site ?? 'Out of scope'} ↗`
}

export default function TopologyPage() {
  const navigate = useNavigate()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const { perspective, site } = params
  const regions = useMemo(() => list(params.regions), [params.regions])
  const roles = useMemo(() => list(params.roles), [params.roles])
  const showUnmanaged = params.unmanaged === '1'

  const { data: layerList = [] } = useQuery({ queryKey: ['topology-layers'], queryFn: fetchTopologyLayers, staleTime: 300_000 })
  const { data: regionData } = useQuery({ queryKey: ['regions', { limit: 1000 }], queryFn: () => fetchRegions({ limit: 1000 }) })
  // The sites API filters on one region, so the sites of several are fetched one region at a time.
  const siteQueries = useQueries({
    queries: (regions.length ? regions : ['']).map(region => ({
      queryKey: ['sites', { region, limit: 1000 }],
      queryFn: () => fetchSites({ region: region || undefined, limit: 1000 }),
    })),
  })
  const siteNames = [...new Set(siteQueries.flatMap(q => (q.data?.items ?? []).map(s => s.name)))].sort()
  const { data, isLoading, error } = useQuery({
    queryKey: ['topology', { regions, site }],
    queryFn: () => fetchTopology({ regions, site }),
    retry: false,
  })

  const layout = useTopologyLayout()
  const { saved } = layout
  const model = useMemo(() => new TopologyModel(data), [data])
  const layerKeys = useMemo(() => (layerList.length ? layerList.map(l => l.key) : model.layers), [layerList, model])
  const visibleLayers = useMemo(() => (params.layers ? list(params.layers) : layerKeys), [params.layers, layerKeys])
  const flow = useMemo(
    () => new TopologyFlow({ layers: layerKeys, layerLabels: Object.fromEntries(layerList.map(l => [l.key, l.label])) }),
    [layerKeys, layerList],
  )

  const shown = useMemo(() => model.filter({
    roles,
    layers: visibleLayers,
    unmanaged: perspective === 'nodes' && showUnmanaged,
  }), [model, roles, visibleLayers, perspective, showUnmanaged])

  const graph = useMemo(() => {
    const regionOf = n => TopologyModel.regionOf(n, regions)
    if (perspective === 'sites') {
      const box = { of: g => regionOf(g.members[0]), container: key => `region:${key}`, boxes: 'region-boxes' }
      return flow.groups(shown, { kind: 'site', groupOf: TopologyModel.siteOf, box, saved })
    }
    if (perspective === 'regions') return flow.groups(shown, { kind: 'region', groupOf: regionOf, saved })
    return flow.devices(shown, { kicker, saved })
  }, [flow, shown, perspective, regions, saved])

  // Drilling down narrows the scope; a group outside the region filter drops it.
  function handleNodeClick(target) {
    if (target.node) navigate(`/network/nodes/${target.node}`)
    else if (target.site && target.site !== NO_SITE) {
      setParams({ perspective: 'nodes', site: target.site, regions: target.inScope ? params.regions : '' })
    } else if (target.region && target.region !== NO_REGION) {
      setParams({ perspective: 'sites', regions: target.region, site: '' })
    }
  }

  const inScopeDevices = model.count({ kind: DEVICE, inScope: true })
  const canvasKey = [perspective, params.regions, site, params.roles, visibleLayers.join(','), shown.nodes.length, shown.links.length].join('|')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Topology" description="Links between nodes as observed, by node, site or region." />

      <div className="shrink-0 px-4 py-2.5 border-b border-edge flex flex-wrap items-center gap-3">
        <Segmented value={perspective} options={PERSPECTIVES} onChange={value => setParams({ perspective: value })} />

        <MultiSelect
          label="Regions"
          selected={regions}
          options={(regionData?.items ?? []).map(r => ({ value: r.name, label: r.name }))}
          onChange={next => setParams({ regions: next.join(','), site: '' })}
        />
        <FilterSelect
          value={site}
          allLabel="All sites"
          options={siteNames}
          onChange={value => setParams({ site: value, perspective: value ? 'nodes' : perspective })}
        />
        <MultiSelect
          label="Roles"
          selected={roles}
          options={model.roles().map(r => ({ value: r, label: r }))}
          onChange={next => setParams({ roles: next.join(',') })}
        />

        {layerKeys.length > 1 && (
          <MultiSelect
            label="Layers"
            selected={params.layers ? visibleLayers : []}
            options={layerList.map(l => ({ value: l.key, label: l.label }))}
            onChange={next => setParams({ layers: next.length === layerKeys.length ? '' : next.join(',') })}
          />
        )}

        {perspective === 'nodes' && (
          <ToggleButton
            shown={showUnmanaged}
            onClick={() => setParams({ unmanaged: showUnmanaged ? '0' : '1' })}
            hideLabel={`Hide unmanaged (${model.count({ kind: UNMANAGED })})`}
            showLabel="Show unmanaged"
          />
        )}

        <div className="ml-auto text-[11px] text-subtle flex items-center gap-3">
          <span className="text-subtle/50 hidden lg:block">
            {perspective === 'nodes' ? 'Click nodes to navigate' : 'Click to drill down'}
          </span>
          <span>
            {inScopeDevices} {inScopeDevices === 1 ? 'node' : 'nodes'}
            {' · '}
            {shown.links.length} {shown.links.length === 1 ? 'link' : 'links'}
          </span>
        </div>
      </div>

      <div
        className="flex-1 min-h-0"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, var(--surface) 0%, var(--canvas) 65%)' }}
      >
        {isLoading ? (
          <div className="p-6 text-xs text-subtle animate-pulse">Loading topology…</div>
        ) : error ? (
          <div className="p-6 text-xs text-subtle">Could not load the topology{error.detail ? `: ${error.detail}` : '.'}</div>
        ) : !shown.nodes.length ? (
          <div className="p-6 text-xs text-subtle">No nodes match these filters.</div>
        ) : (
          <TopologyCanvas
            key={canvasKey}
            nodes={graph.nodes}
            edges={graph.edges}
            legend={flow.legend({ grouped: perspective !== 'nodes' })}
            onNodeClick={handleNodeClick}
            onSaveLayout={layout.save}
            onResetLayout={layout.reset}
          />
        )}
      </div>
    </div>
  )
}
