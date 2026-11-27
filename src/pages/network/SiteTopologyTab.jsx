import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import TopologyCanvas from '../../components/topology/TopologyCanvas'
import { ToggleButton } from '../../components/topology/TopologyControls'
import { TopologyModel, DEVICE, UNMANAGED } from '../../components/topology/TopologyModel'
import { TopologyFlow } from '../../components/topology/TopologyFlow'
import { fetchTopology } from '../../api/topology'
import { useTopologyLayout } from '../../hooks/useTopologyLayout'

const KICKERS = { in: 'On-site', out: 'Off-site ↗', unmanaged: 'Unmanaged' }
const LEGEND_LABELS = { internal: 'On-site link', external: 'Off-site (managed)', unmanaged: 'Unmanaged' }

function kicker(node) {
  if (node.kind !== DEVICE) return KICKERS.unmanaged
  return node.in_scope ? KICKERS.in : KICKERS.out
}

export default function SiteTopologyTab({ siteName }) {
  const navigate = useNavigate()
  const [showUnmanaged, setShowUnmanaged] = useState(true)
  const [showExternal, setShowExternal]   = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['topology', { site: siteName }],
    queryFn: () => fetchTopology({ site: siteName }),
    enabled: !!siteName,
    retry: false,
  })

  const layout = useTopologyLayout()
  const model = useMemo(() => new TopologyModel(data), [data])
  const shown = useMemo(
    () => model.filter({ unmanaged: showUnmanaged, outOfScope: showExternal }),
    [model, showUnmanaged, showExternal],
  )
  const flow = useMemo(() => new TopologyFlow({ layers: model.layers }), [model])
  const graph = useMemo(() => flow.devices(shown, { kicker, saved: layout.saved }), [flow, shown, layout.saved])

  if (isLoading) {
    return <div className="p-6 text-xs text-subtle animate-pulse">Loading topology…</div>
  }

  if (!model.links.length) {
    return <div className="p-6 text-xs text-subtle">No LLDP/CDP neighbor data for nodes at this site.</div>
  }

  const siteNodeCount = model.count({ kind: DEVICE, inScope: true })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-2.5 border-b border-edge flex items-center gap-3">
        <ToggleButton
          shown={showUnmanaged}
          onClick={() => setShowUnmanaged(v => !v)}
          hideLabel={`Hide unmanaged (${model.count({ kind: UNMANAGED })})`}
          showLabel="Show unmanaged"
        />
        <ToggleButton
          shown={showExternal}
          onClick={() => setShowExternal(v => !v)}
          hideLabel={`Hide off-site (${model.count({ kind: DEVICE, inScope: false })})`}
          showLabel="Show off-site"
        />

        <div className="ml-auto text-[11px] text-subtle flex items-center gap-3">
          <span className="text-subtle/50 hidden sm:block">Click nodes to navigate</span>
          <span>
            {siteNodeCount} {siteNodeCount === 1 ? 'node' : 'nodes'}
            {' · '}
            {shown.links.length} {shown.links.length === 1 ? 'link' : 'links'}
          </span>
        </div>
      </div>

      <div
        className="flex-1"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, var(--surface) 0%, var(--canvas) 65%)' }}
      >
        <TopologyCanvas
          key={`${shown.nodes.length}-${shown.links.length}`}
          nodes={graph.nodes}
          edges={graph.edges}
          legend={flow.legend({ labels: LEGEND_LABELS })}
          onNodeClick={target => target.node && navigate(`/network/nodes/${target.node}`)}
          onSaveLayout={layout.save}
          onResetLayout={layout.reset}
        />
      </div>
    </div>
  )
}
