import dagre from '@dagrejs/dagre'
import { MarkerType } from '@xyflow/react'
import { cleanStep } from './steps'

// Box sizes on the canvas, for laying out a graph whose boxes have no position yet.
const SIZES = { start: { width: 110, height: 40 }, end: { width: 110, height: 40 }, step: { width: 230, height: 96 } }

// An edge as the canvas draws it: an arrow from one box to the next, from a condition's true or false side.
export function flowEdge({ source, target, branch = null }) {
  return {
    id: `${source}>${target}${branch ? `:${branch}` : ''}`,
    source,
    target,
    sourceHandle: branch,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    ...(branch && {
      label: branch,
      labelStyle: { fontSize: 10, fill: branch === 'true' ? '#4ade80' : '#f87171' },
      labelBgStyle: { fill: 'var(--surface)' },
    }),
  }
}

// Positions, left to right, for every box of a graph.
function layout(graph) {
  const g = new dagre.graphlib.Graph().setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 70 }).setDefaultEdgeLabel(() => ({}))
  graph.nodes.forEach(n => g.setNode(n.key, SIZES[n.kind]))
  graph.edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return Object.fromEntries(graph.nodes.map(n => {
    const { x, y } = g.node(n.key)
    return [n.key, { x: x - SIZES[n.kind].width / 2, y: y - SIZES[n.kind].height / 2 }]
  }))
}

// The canvas's boxes and arrows for a saved graph. A box's id is its key; boxes without a position (a new
// workflow's start and end) are laid out. Start and end can't be deleted.
export function toFlow(graph) {
  const positions = graph.nodes.every(n => n.position) ? {} : layout(graph)
  return {
    nodes: graph.nodes.map(n => ({
      id: n.key,
      type: n.kind,
      position: n.position ?? positions[n.key],
      deletable: n.kind === 'step',
      data: { name: n.name ?? '', step: n.step ?? null, targets: n.targets ?? [] },
    })),
    edges: graph.edges.map(flowEdge),
  }
}

// The graph as the API saves it, from the canvas.
export function toGraph(nodes, edges) {
  return {
    nodes: nodes.map(n => ({
      key: n.id,
      kind: n.type,
      name: n.data.name ?? '',
      step: n.data.step ? cleanStep(n.data.step) : null,
      targets: n.data.targets ?? [],
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    })),
    edges: edges.map(e => ({ source: e.source, target: e.target, branch: e.sourceHandle ?? null })),
  }
}
