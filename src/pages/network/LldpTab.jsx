import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Network, List, Eye, EyeOff, ExternalLink } from 'lucide-react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  Panel,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import FloatingEdge from '../../components/topology/FloatingEdge'
import EdgeTooltip from '../../components/topology/EdgeTooltip'
import { fetchLldpNeighbors } from '../../api/lldp'
import { fetchSites } from '../../api/inventory'
import { useTheme } from '../../context/ThemeContext'

function timeAgo(datetime) {
  const diffMs = Date.now() - new Date(datetime).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Custom node components ───────────────────────────────────────────────────

function CenterNode({ data }) {
  return (
    <>
      <Handle type="source" position={Position.Top} style={HANDLE_INVIS} />
      <div style={CENTER_NODE_STYLE}>
        <div style={{ fontSize: 9, color: '#0CA5E9', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 5 }}>
          This Node
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#ECECEC' }}>
          {data.hostname}
        </div>
      </div>
    </>
  )
}

function ManagedNode({ data }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={HANDLE_INVIS} />
      <div style={MANAGED_NODE_STYLE}>
        <div style={{ fontSize: 9, color: '#0CA5E9', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>
          Managed ↗
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#ECECEC' }}>
          {data.label}
        </div>
        {data.linkCount > 1 && (
          <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
            {data.linkCount} links
          </div>
        )}
      </div>
    </>
  )
}

function UnmanagedNode({ data }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={HANDLE_INVIS} />
      <div style={UNMANAGED_NODE_STYLE}>
        <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>
          Unmanaged
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>
          {data.label}
        </div>
        {data.linkCount > 1 && (
          <div style={{ fontSize: 9, color: '#444', marginTop: 4 }}>
            {data.linkCount} links
          </div>
        )}
      </div>
    </>
  )
}

const HANDLE_INVIS = { opacity: 0, pointerEvents: 'none', width: 1, height: 1 }

const CENTER_NODE_STYLE = {
  background: 'var(--color-surface)',
  border: '2px solid #0CA5E9',
  borderRadius: 12,
  padding: '12px 20px',
  minWidth: 170,
  textAlign: 'center',
  boxShadow: '0 0 28px rgba(12,165,233,0.25), 0 0 8px rgba(12,165,233,0.12)',
}

const MANAGED_NODE_STYLE = {
  background: 'var(--color-surface)',
  border: '1.5px solid rgba(12,165,233,0.45)',
  borderRadius: 9,
  padding: '10px 16px',
  minWidth: 150,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
}

const UNMANAGED_NODE_STYLE = {
  background: 'var(--color-surface-hi)',
  border: '1.5px dashed var(--color-edge)',
  borderRadius: 9,
  padding: '10px 16px',
  minWidth: 150,
  textAlign: 'center',
}

const NODE_TYPES = {
  centerNode:    CenterNode,
  managedNode:   ManagedNode,
  unmanagedNode: UnmanagedNode,
}

const EDGE_TYPES = { floatingEdge: FloatingEdge }

// ── Layout builder ───────────────────────────────────────────────────────────

const COL_SPACING = 210
const ROW_SPACING = 170
const PER_ROW     = 6

function buildLayout(neighbors, hostname) {
  // Group by remote_device — multiple ports can connect the same pair
  const deviceMap = new Map()
  for (const n of neighbors) {
    if (!deviceMap.has(n.remote_device)) {
      deviceMap.set(n.remote_device, { info: n, connections: [] })
    }
    deviceMap.get(n.remote_device).connections.push(n)
  }

  // Managed first
  const devices = [...deviceMap.values()].sort(
    (a, b) => (b.info.remote_node_id ? 1 : 0) - (a.info.remote_node_id ? 1 : 0)
  )

  const nodes = [{
    id: '__center__',
    type: 'centerNode',
    position: { x: 0, y: 0 },
    data: { hostname: hostname ?? '—' },
  }]

  const edges = []

  devices.forEach((device, i) => {
    const row     = Math.floor(i / PER_ROW)
    const col     = i % PER_ROW
    const rowSize = Math.min(PER_ROW, devices.length - row * PER_ROW)
    const rowOffset = -((rowSize - 1) * COL_SPACING) / 2

    const x = rowOffset + col * COL_SPACING
    const y = ROW_SPACING + row * ROW_SPACING

    const nodeId   = `neighbor-${i}`
    const isManaged = !!device.info.remote_node_id

    nodes.push({
      id: nodeId,
      type: isManaged ? 'managedNode' : 'unmanagedNode',
      position: { x, y },
      data: {
        label: device.info.remote_device,
        nodeId: device.info.remote_node_id,
        linkCount: device.connections.length,
      },
    })

    device.connections.forEach((conn, j) => {
      edges.push({
        id: `edge-${i}-${j}`,
        source: '__center__',
        target: nodeId,
        type: 'floatingEdge',
        animated: isManaged,
        data: {
          localInterface:  conn.local_interface,
          remoteInterface: conn.remote_interface,
          protocol:        conn.discovery_protocol,
          collectedAt:     conn.collected_at,
        },
        style: {
          stroke: isManaged ? 'rgba(12,165,233,0.55)' : 'rgba(50,50,50,0.9)',
          strokeWidth: isManaged ? 2 : 1.5,
          strokeDasharray: isManaged ? undefined : '5 4',
        },
      })
    })
  })

  return { nodes, edges }
}

// ── Topology (ReactFlow) view ────────────────────────────────────────────────

function TopologyView({ neighbors, hostname, onNavigate }) {
  const { resolved } = useTheme()
  const light = resolved === 'light'
  const layout = useMemo(() => buildLayout(neighbors, hostname), [neighbors, hostname])
  const [nodes, , onNodesChange] = useNodesState(layout.nodes)
  const [edges, , onEdgesChange] = useEdgesState(layout.edges)
  const [edgeTooltip, setEdgeTooltip] = useState(null)

  const onEdgeMouseEnter = useCallback((event, edge) => {
    if (!edge.data) return
    setEdgeTooltip({ x: event.clientX, y: event.clientY, data: edge.data })
  }, [])

  const onEdgeMouseMove = useCallback((event) => {
    setEdgeTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : prev)
  }, [])

  const onEdgeMouseLeave = useCallback(() => {
    setEdgeTooltip(null)
  }, [])

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        colorMode={resolved}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        minZoom={0.15}
        maxZoom={3}
        onNodeClick={(_, node) => {
          if (node.data?.nodeId) onNavigate(node.data.nodeId)
        }}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseMove={onEdgeMouseMove}
        onEdgeMouseLeave={onEdgeMouseLeave}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color={light ? '#c9ccd1' : '#1c1c1c'} />
        <Controls style={light ? { background: '#fff', border: '1px solid #DFE1E5' } : { background: '#111', border: '1px solid #222' }} />
        <MiniMap
          nodeColor={(n) => {
            const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
            if (n.type === 'centerNode')   return brand
            if (n.type === 'managedNode')  return brand + '80'
            return light ? '#b9bec6' : '#2a2a2a'
          }}
          style={light ? { background: '#fff', border: '1px solid #DFE1E5' } : { background: '#0e0e0e', border: '1px solid #222' }}
          maskColor={light ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)'}
          pannable
          zoomable
        />
        <Panel position="top-left">
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-edge)',
            borderRadius: 7,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 2, background: 'rgba(12,165,233,0.6)', borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: 'var(--color-subtle)' }}>Managed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 0, borderTop: '1.5px dashed var(--color-edge)' }} />
              <span style={{ fontSize: 10, color: 'var(--color-subtle)' }}>Unmanaged</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
      <EdgeTooltip tooltip={edgeTooltip} />
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function LldpTab({ nodeId, hostname, siteName }) {
  const navigate = useNavigate()
  const [view, setView] = useState('graph')
  const [showUnmanaged, setShowUnmanaged] = useState(true)

  const { data: siteResult } = useQuery({
    queryKey: ['site-by-name', siteName],
    queryFn: () => fetchSites({ name: siteName, limit: 1 }).then(r => r.items?.[0]),
    enabled: !!siteName,
    staleTime: 5 * 60_000,
  })
  const siteId = siteResult?.id

  const { data: neighbors, isLoading } = useQuery({
    queryKey: ['lldp-neighbors', nodeId],
    queryFn: () => fetchLldpNeighbors(nodeId),
    retry: false,
  })

  const filtered = useMemo(() => {
    if (!neighbors) return []
    return showUnmanaged ? neighbors : neighbors.filter(n => n.remote_node_id)
  }, [neighbors, showUnmanaged])

  const unmanagedCount = useMemo(
    () => neighbors?.filter(n => !n.remote_node_id).length ?? 0,
    [neighbors]
  )

  if (isLoading) {
    return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  }
  if (!neighbors?.length) {
    return <div className="p-6 text-xs text-subtle">No LLDP/CDP neighbors found for this node.</div>
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-edge flex items-center gap-3">
        {/* View toggle */}
        <div className="flex bg-surface-hi rounded-md p-0.5 gap-0.5">
          {[
            { key: 'graph', Icon: Network, label: 'Graph' },
            { key: 'table', Icon: List,    label: 'Table' },
          ].map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors',
                view === key ? 'bg-surface text-content shadow-sm' : 'text-subtle hover:text-content',
              ].join(' ')}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Managed/unmanaged toggle */}
        <button
          onClick={() => setShowUnmanaged(v => !v)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-medium transition-colors',
            showUnmanaged
              ? 'border-edge text-subtle hover:text-content'
              : 'border-brand/40 text-brand bg-brand/5',
          ].join(' ')}
        >
          {showUnmanaged ? <Eye size={12} /> : <EyeOff size={12} />}
          {showUnmanaged ? `Hide unmanaged (${unmanagedCount})` : 'Show unmanaged'}
        </button>

        {siteId && (
          <Link
            to={`/network/sites/${siteId}?tab=topology`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-edge text-[11px] font-medium text-subtle hover:text-content transition-colors"
          >
            <ExternalLink size={11} />
            Site neighbors
          </Link>
        )}

        <div className="ml-auto flex items-center gap-3 text-[11px] text-subtle">
          {view === 'graph' && (
            <span className="text-[10px] text-subtle/50 hidden sm:block">Click managed nodes to navigate</span>
          )}
          <span>
            {filtered.length} {filtered.length === 1 ? 'neighbor' : 'neighbors'}
            {!showUnmanaged && unmanagedCount > 0 && (
              <span className="ml-1 text-subtle/50">· {unmanagedCount} hidden</span>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      {view === 'graph' ? (
        filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-subtle">All {unmanagedCount} neighbors are unmanaged and hidden.</p>
          </div>
        ) : (
          <div className="flex-1">
            <TopologyView
              key={filtered.map(n => n.id).join(',')}
              neighbors={filtered}
              hostname={hostname}
              onNavigate={(id) => navigate(`/network/nodes/${id}`)}
            />
          </div>
        )
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-surface border-b border-edge">
              <tr>
                {['Local Port', 'Neighbor', 'Remote Port', 'Protocol', 'Collected'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-subtle">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id} className="border-b border-edge/40 hover:bg-surface-hi/40 transition-colors">
                  <td className="px-4 py-2 font-mono text-[11px] text-content">{n.local_interface}</td>
                  <td className="px-4 py-2 text-xs">
                    {n.remote_node_id ? (
                      <Link
                        to={`/network/nodes/${n.remote_node_id}`}
                        className="text-brand hover:text-brand/80 font-medium transition-colors"
                      >
                        {n.remote_device}
                      </Link>
                    ) : (
                      <span className="text-content">{n.remote_device}</span>
                    )}
                    {!n.remote_node_id && (
                      <span className="ml-1.5 text-[10px] text-subtle/60">(not in inventory)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] text-subtle">{n.remote_interface || '—'}</td>
                  <td className="px-4 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle bg-surface-hi px-1.5 py-0.5 rounded">
                      {n.discovery_protocol ?? 'lldp'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[11px] text-subtle">
                    {n.collected_at ? timeAgo(n.collected_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
