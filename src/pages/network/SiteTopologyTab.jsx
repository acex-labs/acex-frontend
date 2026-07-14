import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
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
import { fetchLldpNeighborsBySite } from '../../api/lldp'
import { fetchNodes } from '../../api/inventory'

// ── Shared handle/node styles ─────────────────────────────────────────────────

const HANDLE_INVIS = { opacity: 0, pointerEvents: 'none', width: 1, height: 1 }

const HANDLES_ALL = () => (
  <>
    <Handle type="source" position={Position.Top} style={HANDLE_INVIS} />
    <Handle type="target" position={Position.Top} style={HANDLE_INVIS} />
  </>
)

// ── Custom node components ────────────────────────────────────────────────────

function SiteNode({ data }) {
  return (
    <>
      {HANDLES_ALL()}
      <div style={{
        background: '#111',
        border: '2px solid rgba(12,165,233,0.75)',
        borderRadius: 10,
        padding: '10px 18px',
        minWidth: 160,
        textAlign: 'center',
        boxShadow: '0 0 18px rgba(12,165,233,0.18)',
        cursor: 'pointer',
      }}>
        <div style={{ fontSize: 9, color: '#0CA5E9', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 4 }}>
          On-site
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#ECECEC' }}>
          {data.label}
        </div>
      </div>
    </>
  )
}

function ExternalManagedNode({ data }) {
  return (
    <>
      {HANDLES_ALL()}
      <div style={{
        background: '#0d0d0d',
        border: '1.5px solid rgba(12,165,233,0.3)',
        borderRadius: 9,
        padding: '9px 14px',
        minWidth: 145,
        textAlign: 'center',
        cursor: 'pointer',
      }}>
        <div style={{ fontSize: 9, color: 'rgba(12,165,233,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>
          External ↗
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa' }}>
          {data.label}
        </div>
      </div>
    </>
  )
}

function UnmanagedNode({ data }) {
  return (
    <>
      {HANDLES_ALL()}
      <div style={{
        background: '#0a0a0a',
        border: '1.5px dashed #222',
        borderRadius: 9,
        padding: '9px 14px',
        minWidth: 145,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>
          Unmanaged
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>
          {data.label}
        </div>
      </div>
    </>
  )
}

const NODE_TYPES = {
  siteNode:             SiteNode,
  externalManagedNode:  ExternalManagedNode,
  unmanagedNode:        UnmanagedNode,
}

const EDGE_TYPES = { floatingEdge: FloatingEdge }

// ── Role-based layout ─────────────────────────────────────────────────────────

// Map role keywords → vertical rank (lower = higher in the diagram)
const ROLE_RANK = {
  superspine: 0, backbone: 0,
  core: 1, spine: 1,
  distribution: 2, dist: 2, aggregation: 2,
  access: 3, leaf: 3, edge: 3,
}

const ROW_SPACING = 170
const COL_SPACING = 210
const PER_ROW     = 7

function getRoleRank(role) {
  if (!role) return null
  const key = role.toLowerCase().replace(/[^a-z]/g, '')
  if (key in ROLE_RANK) return ROLE_RANK[key]
  for (const [k, v] of Object.entries(ROLE_RANK)) {
    if (key.includes(k)) return v
  }
  return null
}

// For roles that don't match keywords, infer their vertical order from the
// topology: BFS through the role-connectivity graph starting from the role
// with the most external (non-site) connections — that role is likely the
// "top" of the hierarchy (core / uplink layer).
function inferRoleRanks(siteNodes, edgeMap, baseRank) {
  const gidToRole = new Map(siteNodes.map(n => [`site-${n.id}`, n.role ?? '__none__']))
  const roles = [...new Set(siteNodes.map(n => n.role ?? '__none__'))]

  const roleAdj     = new Map(roles.map(r => [r, new Set()]))
  const roleExternal = new Map()

  for (const e of edgeMap.values()) {
    const rSrc = gidToRole.get(e.source)
    const rTgt = gidToRole.get(e.target)
    if (rSrc && (e.target.startsWith('ext-') || e.target.startsWith('unmanaged-')))
      roleExternal.set(rSrc, (roleExternal.get(rSrc) ?? 0) + 1)
    if (rTgt && (e.source.startsWith('ext-') || e.source.startsWith('unmanaged-')))
      roleExternal.set(rTgt, (roleExternal.get(rTgt) ?? 0) + 1)
    if (!rSrc || !rTgt || rSrc === rTgt) continue
    roleAdj.get(rSrc)?.add(rTgt)
    roleAdj.get(rTgt)?.add(rSrc)
  }

  // Start BFS from the role with the most external connections
  const start = roles.reduce((a, b) =>
    (roleExternal.get(a) ?? 0) >= (roleExternal.get(b) ?? 0) ? a : b
  )

  const result = new Map([[start, baseRank]])
  const queue  = [start]
  while (queue.length) {
    const cur = queue.shift()
    for (const nb of roleAdj.get(cur) ?? []) {
      if (!result.has(nb)) {
        result.set(nb, result.get(cur) + 1)
        queue.push(nb)
      }
    }
  }
  // disconnected roles go at the bottom
  let max = Math.max(...result.values())
  for (const r of roles) {
    if (!result.has(r)) result.set(r, ++max)
  }
  return result
}

function computeRoleRanks(siteNodes, edgeMap) {
  const uniqueRoles = [...new Set(siteNodes.map(n => n.role ?? '__none__'))]

  const keywordRanks = new Map()
  const unmatched   = []
  for (const role of uniqueRoles) {
    const r = getRoleRank(role === '__none__' ? null : role)
    if (r !== null) keywordRanks.set(role, r)
    else unmatched.push(role)
  }

  if (!unmatched.length) return keywordRanks

  // All roles are custom — infer order from topology
  if (!keywordRanks.size) return inferRoleRanks(siteNodes, edgeMap, 0)

  // Mixed: keyword-matched roles keep their ranks, unmatched go below
  const base = Math.max(...keywordRanks.values()) + 1
  const inferred = inferRoleRanks(
    siteNodes.filter(n => unmatched.includes(n.role ?? '__none__')),
    edgeMap,
    base,
  )
  return new Map([...keywordRanks, ...inferred])
}

function layerPositions(gids, startY) {
  return gids.map((gid, i) => {
    const row    = Math.floor(i / PER_ROW)
    const col    = i % PER_ROW
    const rowLen = Math.min(PER_ROW, gids.length - row * PER_ROW)
    return [gid, {
      x: -(rowLen - 1) * COL_SPACING / 2 + col * COL_SPACING,
      y: startY + row * ROW_SPACING,
    }]
  })
}

function buildLayout(neighbors, siteNodes) {
  const siteNodeIds = new Set(siteNodes.map(n => n.id))

  const graphNodeMap = new Map()
  for (const sn of siteNodes) {
    const gid = `site-${sn.id}`
    graphNodeMap.set(gid, { gid, type: 'siteNode', label: sn.hostname ?? `Node ${sn.id}`, nodeId: sn.id })
  }

  const edgeMap = new Map()
  for (const n of neighbors) {
    const srcGid = `site-${n.node_instance_id}`
    let tgtGid

    if (n.remote_node_id) {
      tgtGid = siteNodeIds.has(n.remote_node_id) ? `site-${n.remote_node_id}` : `ext-${n.remote_node_id}`
      if (!graphNodeMap.has(tgtGid)) {
        graphNodeMap.set(tgtGid, { gid: tgtGid, type: 'externalManagedNode', label: n.remote_device, nodeId: n.remote_node_id })
      }
    } else {
      tgtGid = `unmanaged-${n.remote_device}`
      if (!graphNodeMap.has(tgtGid)) {
        graphNodeMap.set(tgtGid, { gid: tgtGid, type: 'unmanagedNode', label: n.remote_device, nodeId: null })
      }
    }

    const [a, b] = [srcGid, tgtGid].sort()
    const portPart = [n.local_interface, n.remote_interface].filter(Boolean).join(':')
    const eKey = `${a}||${b}||${portPart}`
    if (!edgeMap.has(eKey)) {
      edgeMap.set(eKey, {
        id: eKey,
        source: srcGid,
        target: tgtGid,
        isSiteInternal: srcGid.startsWith('site-') && tgtGid.startsWith('site-'),
        isManaged: !!n.remote_node_id,
        localInterface:  n.local_interface,
        remoteInterface: n.remote_interface,
        protocol:        n.discovery_protocol,
        collectedAt:     n.collected_at,
      })
    }
  }

  // Group site nodes by role rank; unknown roles get their own bottom layer
  const roleGroups = new Map()
  for (const sn of siteNodes) {
    const rank = getRoleRank(sn.role)
    const key  = rank ?? 'unknown'
    if (!roleGroups.has(key)) roleGroups.set(key, [])
    roleGroups.get(key).push(`site-${sn.id}`)
  }

  const sortedKeys = [...roleGroups.keys()].sort((a, b) => {
    if (a === 'unknown') return 1
    if (b === 'unknown') return -1
    return a - b
  })

  // Assign positions layer by layer
  const positions = new Map()
  let currentY = 0
  for (const key of sortedKeys) {
    const gids = roleGroups.get(key)
    layerPositions(gids, currentY).forEach(([gid, pos]) => positions.set(gid, pos))
    currentY += Math.ceil(gids.length / PER_ROW) * ROW_SPACING
  }

  // External managed nodes below site layers
  const extGids = [...graphNodeMap.keys()].filter(g => g.startsWith('ext-'))
  if (extGids.length) {
    layerPositions(extGids, currentY).forEach(([gid, pos]) => positions.set(gid, pos))
    currentY += Math.ceil(extGids.length / PER_ROW) * ROW_SPACING
  }

  // Unmanaged nodes at the bottom
  const unmanagedGids = [...graphNodeMap.keys()].filter(g => g.startsWith('unmanaged-'))
  layerPositions(unmanagedGids, currentY).forEach(([gid, pos]) => positions.set(gid, pos))

  const rfNodes = [...graphNodeMap.values()].map(gn => ({
    id:       gn.gid,
    type:     gn.type,
    position: positions.get(gn.gid) ?? { x: 0, y: 0 },
    data:     { label: gn.label, nodeId: gn.nodeId },
  }))

  const rfEdges = [...edgeMap.values()].map(e => ({
    id:       e.id,
    source:   e.source,
    target:   e.target,
    type:     'floatingEdge',
    animated: e.isSiteInternal,
    data: {
      localInterface:  e.localInterface,
      remoteInterface: e.remoteInterface,
      protocol:        e.protocol,
      collectedAt:     e.collectedAt,
    },
    style: {
      stroke: e.isSiteInternal
        ? 'rgba(12,165,233,0.6)'
        : e.isManaged
          ? 'rgba(12,165,233,0.25)'
          : 'rgba(40,40,40,0.9)',
      strokeWidth:    e.isSiteInternal ? 2.5 : 1.5,
      strokeDasharray: e.isSiteInternal || e.isManaged ? undefined : '5 4',
    },
  }))

  return { nodes: rfNodes, edges: rfEdges }
}

// ── Topology canvas ───────────────────────────────────────────────────────────

function TopologyCanvas({ neighbors, siteNodes, onNavigate }) {
  const layout = useMemo(
    () => buildLayout(neighbors, siteNodes),
    [neighbors, siteNodes]
  )
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
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={3}
        style={{ background: '#080808' }}
        onNodeClick={(_, node) => {
          if (node.data?.nodeId) onNavigate(node.id, node.data.nodeId)
        }}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseMove={onEdgeMouseMove}
        onEdgeMouseLeave={onEdgeMouseLeave}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#1a1a1a" />
        <Controls style={{ background: '#111', border: '1px solid #222' }} />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'siteNode')            return '#0CA5E9'
            if (n.type === 'externalManagedNode') return 'rgba(12,165,233,0.4)'
            return '#1e1e1e'
          }}
          style={{ background: '#0a0a0a', border: '1px solid #222' }}
          maskColor="rgba(0,0,0,0.65)"
          pannable
          zoomable
        />
        <Panel position="top-left">
          <div style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: 7,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {[
              { color: 'rgba(12,165,233,0.7)', dash: false,  label: 'On-site link' },
              { color: 'rgba(12,165,233,0.3)', dash: false,  label: 'External managed' },
              { color: '#222',                  dash: true,   label: 'Unmanaged' },
            ].map(({ color, dash, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 20,
                  height: 0,
                  borderTop: `1.5px ${dash ? 'dashed' : 'solid'} ${color}`,
                }} />
                <span style={{ fontSize: 10, color: '#3a3a3a' }}>{label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>
      <EdgeTooltip tooltip={edgeTooltip} />
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SiteTopologyTab({ siteName }) {
  const navigate = useNavigate()
  const [showUnmanaged, setShowUnmanaged] = useState(true)
  const [showExternal, setShowExternal]   = useState(true)

  const { data: nodesData, isLoading: nodesLoading } = useQuery({
    queryKey: ['nodes', { site: siteName, limit: 100 }],
    queryFn: () => fetchNodes({ site: siteName, limit: 100 }),
    enabled: !!siteName,
  })
  const siteNodes = nodesData?.items ?? []

  const { data: neighbors = [], isLoading: neighborsLoading } = useQuery({
    queryKey: ['lldp-neighbors-site', siteName],
    queryFn: () => fetchLldpNeighborsBySite(siteName),
    enabled: !!siteName,
    retry: false,
  })

  const isLoading = nodesLoading || neighborsLoading

  const siteNodeIds = useMemo(() => new Set(siteNodes.map(n => n.id)), [siteNodes])

  const { filtered, stats } = useMemo(() => {
    let f = neighbors
    if (!showUnmanaged) f = f.filter(n => n.remote_node_id)
    if (!showExternal)  f = f.filter(n => !n.remote_node_id || siteNodeIds.has(n.remote_node_id))

    const unmanagedCount = neighbors.filter(n => !n.remote_node_id).length
    const externalCount  = neighbors.filter(n => n.remote_node_id && !siteNodeIds.has(n.remote_node_id)).length

    return { filtered: f, stats: { unmanagedCount, externalCount } }
  }, [neighbors, siteNodeIds, showUnmanaged, showExternal])

  function handleNodeClick(graphId, nodeId) {
    if (graphId.startsWith('site-') || graphId.startsWith('ext-')) {
      navigate(`/network/nodes/${nodeId}`)
    }
  }

  if (isLoading) {
    return <div className="p-6 text-xs text-subtle animate-pulse">Loading topology…</div>
  }

  if (!neighbors.length) {
    return <div className="p-6 text-xs text-subtle">No LLDP/CDP neighbor data for nodes at this site.</div>
  }

  const uniqueDevices = new Set(
    filtered.map(n => n.remote_node_id ? `node-${n.remote_node_id}` : `unmanaged-${n.remote_device}`)
  ).size

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-edge flex items-center gap-3">
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
          {showUnmanaged ? `Hide unmanaged (${stats.unmanagedCount})` : 'Show unmanaged'}
        </button>

        <button
          onClick={() => setShowExternal(v => !v)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-medium transition-colors',
            showExternal
              ? 'border-edge text-subtle hover:text-content'
              : 'border-brand/40 text-brand bg-brand/5',
          ].join(' ')}
        >
          {showExternal ? <Eye size={12} /> : <EyeOff size={12} />}
          {showExternal ? `Hide external (${stats.externalCount})` : 'Show external'}
        </button>

        <div className="ml-auto text-[11px] text-subtle flex items-center gap-3">
          <span className="text-subtle/50 hidden sm:block">Click nodes to navigate</span>
          <span>
            {siteNodes.length} {siteNodes.length === 1 ? 'node' : 'nodes'}
            {' · '}
            {uniqueDevices} {uniqueDevices === 1 ? 'neighbor' : 'neighbors'}
          </span>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1">
        <TopologyCanvas
          key={`${filtered.length}-${siteNodes.length}`}
          neighbors={filtered}
          siteNodes={siteNodes}
          onNavigate={handleNodeClick}
        />
      </div>
    </div>
  )
}
