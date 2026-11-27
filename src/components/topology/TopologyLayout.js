import dagre from '@dagrejs/dagre'
import { DEVICE } from './TopologyModel.js'

// Automatic layouts, used for whatever nobody placed by hand. Positions are top-left corners.

// Role keyword → vertical rank (lower = higher in the diagram).
const ROLE_RANK = {
  superspine: 0, backbone: 0,
  core: 1, spine: 1,
  distribution: 2, dist: 2, aggregation: 2,
  access: 3, leaf: 3, edge: 3,
}

const ROW = 170
const COL = 210
const PER_ROW = 7
const BOX_GAP = 90

export class TopologyLayout {
  static roleRank(role) {
    if (!role) return null
    const key = role.toLowerCase().replace(/[^a-z]/g, '')
    if (key in ROLE_RANK) return ROLE_RANK[key]
    for (const [k, v] of Object.entries(ROLE_RANK)) {
      if (key.includes(k)) return v
    }
    return null
  }

  // Ids split into rows of PER_ROW, each row centred on x = 0.
  static rows(ids, startY) {
    return ids.map((id, i) => {
      const row    = Math.floor(i / PER_ROW)
      const rowLen = Math.min(PER_ROW, ids.length - row * PER_ROW)
      return [id, { x: -(rowLen - 1) * COL / 2 + (i % PER_ROW) * COL, y: startY + row * ROW }]
    })
  }

  // Bands of ids from top to bottom → Map id → position.
  static bands(bands) {
    const positions = new Map()
    let y = 0
    for (const ids of bands) {
      if (!ids.length) continue
      for (const [id, pos] of TopologyLayout.rows(ids, y)) positions.set(id, pos)
      y += Math.ceil(ids.length / PER_ROW) * ROW
    }
    return positions
  }

  // Devices in bands by role, unknown roles last.
  static roleBands(devices) {
    const byRank = new Map()
    for (const n of devices) {
      const rank = TopologyLayout.roleRank(n.role) ?? Infinity
      if (!byRank.has(rank)) byRank.set(rank, [])
      byRank.get(rank).push(n.id)
    }
    return [...byRank.keys()].sort((a, b) => a - b).map(rank => byRank.get(rank))
  }

  // The nodes shown in a site: its devices by role, then devices elsewhere, then everything else.
  static site(nodes) {
    const devices = nodes.filter(n => n.kind === DEVICE)
    return TopologyLayout.bands([
      ...TopologyLayout.roleBands(devices.filter(n => n.in_scope)),
      devices.filter(n => !n.in_scope).map(n => n.id),
      nodes.filter(n => n.kind !== DEVICE).map(n => n.id),
    ])
  }

  // Boxes [{ key, width, height }] in rows of a square-ish grid, in the order given → Map key → position.
  static grid(boxes) {
    const perRow = Math.ceil(Math.sqrt(boxes.length))
    const positions = new Map()
    let x = 0
    let y = 0
    let rowHeight = 0
    boxes.forEach((b, i) => {
      if (i && i % perRow === 0) {
        x = 0
        y += rowHeight + BOX_GAP
        rowHeight = 0
      }
      positions.set(b.key, { x, y })
      x += b.width + BOX_GAP
      rowHeight = Math.max(rowHeight, b.height)
    })
    return positions
  }

  // Items [{ id, width, height }] placed by dagre from the edges [a, b] between them → Map id → position.
  static dagre(items, edges, { nodesep = 70, ranksep = 110 } = {}) {
    const g = new dagre.graphlib.Graph().setGraph({ rankdir: 'TB', nodesep, ranksep }).setDefaultEdgeLabel(() => ({}))
    for (const { id, width, height } of items) g.setNode(id, { width, height })
    for (const [a, b] of edges) if (a !== b) g.setEdge(a, b)
    dagre.layout(g)
    return new Map(items.map(({ id, width, height }) => {
      const { x, y } = g.node(id)
      return [id, { x: x - width / 2, y: y - height / 2 }]
    }))
  }

  // Boxes [{ key, width, height }] placed by dagre from the edges between them.
  static boxes(boxes, edges) {
    return TopologyLayout.dagre(
      boxes.map(b => ({ id: b.key, width: b.width, height: b.height })),
      edges,
      { nodesep: BOX_GAP, ranksep: BOX_GAP * 1.5 },
    )
  }
}
