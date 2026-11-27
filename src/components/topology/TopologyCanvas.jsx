import { useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import FloatingEdge from './FloatingEdge'
import EdgeTooltip from './EdgeTooltip'
import { NODE_TYPES } from './TopologyNodes'
import { LayoutControls } from './TopologyControls'
import { useTheme } from '../../context/ThemeContext'

const EDGE_TYPES = { floatingEdge: FloatingEdge }

// A topology drawn with React Flow. Remount it (key) to fit the view anew; new nodes and edges are taken in place.
// legend: [{ color, dash, label }]. onNodeClick gets the node's data.target.
// With onSaveLayout the layout can be edited: nodes move only in edit mode, and what was moved is saved together.
// Each node's data.layout ({ container, item, offset }) says where to save it: its position plus offset.
export default function TopologyCanvas({ nodes: initialNodes, edges: initialEdges, legend = [], onNodeClick, onSaveLayout, onResetLayout }) {
  const { resolved } = useTheme()
  const light = resolved === 'light'
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [edgeTooltip, setEdgeTooltip] = useState(null)
  const [editing, setEditing] = useState(false)
  const [moved, setMoved] = useState(new Map())
  const [busy, setBusy] = useState(false)

  // A new layout (a save, someone else's save, new data) is taken when not editing, so a move in progress stays.
  useEffect(() => {
    if (editing) return
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, editing, setNodes, setEdges])

  const onNodeDragStop = useCallback((_, node, dragged) => {
    setMoved(prev => {
      const next = new Map(prev)
      for (const n of dragged?.length ? dragged : [node]) {
        const layout = n.data?.layout
        if (!layout) continue
        next.set(`${layout.container}|${layout.item}`, {
          container: layout.container,
          item: layout.item,
          x: n.position.x + layout.offset.x,
          y: n.position.y + layout.offset.y,
        })
      }
      return next
    })
  }, [])

  const stopEditing = () => {
    setMoved(new Map())
    setEditing(false)
  }

  const run = async (action) => {
    setBusy(true)
    try {
      await action()
      stopEditing()
    } finally {
      setBusy(false)
    }
  }

  const save = () => run(() => onSaveLayout([...moved.values()]))
  const reset = () => {
    if (!window.confirm('Forget the saved positions of everything shown and lay it out anew, for everyone?')) return
    run(() => onResetLayout(nodes.map(n => n.data?.layout).filter(Boolean)))
  }

  const onEdgeMouseEnter = useCallback((event, edge) => {
    if (!edge.data) return
    setEdgeTooltip({ x: event.clientX, y: event.clientY, data: edge.data })
  }, [])

  const onEdgeMouseMove = useCallback((event) => {
    setEdgeTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : prev)
  }, [])

  const onEdgeMouseLeave = useCallback(() => setEdgeTooltip(null), [])

  const panelStyle = light
    ? { background: '#fff', border: '1px solid #DFE1E5' }
    : { background: 'var(--surface)', border: '1px solid var(--edge)' }

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
        style={{ backgroundColor: 'transparent' }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.05}
        maxZoom={3}
        nodesDraggable={editing}
        nodesConnectable={false}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_, node) => {
          if (!editing && node.data?.target) onNodeClick?.(node.data.target)
        }}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseMove={onEdgeMouseMove}
        onEdgeMouseLeave={onEdgeMouseLeave}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color={light ? '#c9ccd1' : '#2A2E38'} />
        <Controls style={panelStyle} />
        <MiniMap
          nodeColor={(n) => {
            const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
            if (n.type === 'cluster') return 'transparent'
            if (n.data?.tone === 'in')  return brand
            if (n.data?.tone === 'out') return brand + '66'
            return light ? '#b9bec6' : '#2A2E38'
          }}
          style={light ? { background: '#fff', border: '1px solid #DFE1E5' } : { background: 'var(--canvas)', border: '1px solid var(--edge)' }}
          maskColor={light ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)'}
          pannable
          zoomable
        />
        {onSaveLayout && (
          <Panel position="top-right">
            <LayoutControls
              editing={editing}
              moved={moved.size}
              busy={busy}
              onEdit={() => setEditing(true)}
              onSave={save}
              onCancel={stopEditing}
              onReset={onResetLayout ? reset : undefined}
            />
          </Panel>
        )}
        {legend.length > 0 && (
          <Panel position="top-left">
            <div style={{ ...panelStyle, borderRadius: 7, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {legend.map(({ color, dash, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 0, borderTop: `1.5px ${dash ? 'dashed' : 'solid'} ${color}` }} />
                  <span style={{ fontSize: 10, color: 'var(--subtle)' }}>{label}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </ReactFlow>
      <EdgeTooltip tooltip={edgeTooltip} />
    </>
  )
}
