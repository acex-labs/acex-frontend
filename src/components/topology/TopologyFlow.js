import { DEVICE, NO_SITE, TopologyModel } from './TopologyModel.js'
import { TopologyLayout } from './TopologyLayout.js'
import { SavedLayout } from './SavedLayout.js'

// One colour per layer, in the order the API lists the layers.
const LAYER_RGB = ['12,165,233', '168,85,247', '245,158,11', '16,185,129', '244,63,94']
const PARALLEL_GAP = 9
const MAX_ANIMATED = 150
const DEVICE_SIZE = { width: 170, height: 60 }
const GROUP_SIZE = { width: 200, height: 80 }
const BOX_PAD = 32
const BOX_HEADER = 36

// Turns a TopologyModel into React Flow nodes and edges, for one perspective.
export class TopologyFlow {
  constructor({ layers = [], layerLabels = {} } = {}) {
    this.layers = layers
    this.layerLabels = layerLabels
  }

  rgb(layer) {
    const i = Math.max(0, this.layers.indexOf(layer))
    return LAYER_RGB[i % LAYER_RGB.length]
  }

  // The tooltip names the layer only when there is more than one to tell apart.
  layerLabel(layer) {
    return this.layers.length > 1 ? (this.layerLabels[layer] ?? layer) : undefined
  }

  // With one layer the legend tells link kinds apart; with several it tells the layers apart.
  legend({ grouped = false, labels = {} } = {}) {
    if (this.layers.length > 1) {
      return [
        ...this.layers.map(l => ({ color: `rgba(${this.rgb(l)},0.7)`, label: this.layerLabels[l] ?? l })),
        ...(grouped ? [] : [{ color: 'var(--edge)', dash: true, label: 'Unmanaged (dashed)' }]),
      ]
    }
    const rgb = this.rgb(this.layers[0])
    if (grouped) return [{ color: `rgba(${rgb},0.7)`, label: labels.grouped ?? 'Links (thicker = more)' }]
    return [
      { color: `rgba(${rgb},0.7)`, label: labels.internal ?? 'Within scope' },
      { color: `rgba(${rgb},0.3)`, label: labels.external ?? 'Out of scope (managed)' },
      { color: 'var(--edge)', dash: true, label: labels.unmanaged ?? 'Unmanaged' },
    ]
  }

  // Parallel links of one pair of nodes are fanned out around the straight line between them.
  static offsets(items, pairOf) {
    const byPair = new Map()
    for (const item of items) {
      const key = pairOf(item)
      if (!byPair.has(key)) byPair.set(key, [])
      byPair.get(key).push(item)
    }
    const offsets = new Map()
    for (const group of byPair.values()) {
      group.forEach((item, i) => offsets.set(item, (i - (group.length - 1) / 2) * PARALLEL_GAP))
    }
    return offsets
  }

  // Items for SavedLayout.place from an automatic layout.
  static items(auto, size) {
    return [...auto].map(([id, position]) => ({ id, auto: position, ...size }))
  }

  // Boxes [{ key, container, parentContainer, items }] around their items. Each box is sized to what it holds; items keep their
  // place in the box's container and boxes theirs in the outer one. A box is saved by its origin (where its
  // container's 0,0 lies), so its items can be moved anywhere without moving the box.
  static composeBoxes(boxes, { container, saved, arrange }) {
    const sized = boxes.map(b => {
      const placed = saved.place(b.container, b.items)
      const bounds = SavedLayout.bounds(b.items.map(i => ({ ...placed.get(i.id), width: i.width, height: i.height })))
      const shift = { x: bounds.minX - BOX_PAD, y: bounds.minY - BOX_PAD - BOX_HEADER }
      return {
        ...b,
        placed,
        shift,
        width:  bounds.maxX - bounds.minX + 2 * BOX_PAD,
        height: bounds.maxY - bounds.minY + 2 * BOX_PAD + BOX_HEADER,
      }
    })
    const auto = arrange(sized)
    const origins = saved.place(container, sized.map(b => ({
      id: b.key,
      width: b.width,
      height: b.height,
      anchor: b.shift,
      auto: { x: auto.get(b.key).x - b.shift.x, y: auto.get(b.key).y - b.shift.y },
    })))
    return sized.map(b => ({ ...b, origin: origins.get(b.key) }))
  }

  // The React Flow node of a box; data.layout says how to save where it is dragged.
  static boxNode(box, data) {
    const container = box.parentContainer
    return {
      id: `box:${container}:${box.key}`,
      type: 'cluster',
      position: { x: box.origin.x + box.shift.x, y: box.origin.y + box.shift.y },
      style: { width: box.width, height: box.height },
      selectable: false,
      data: { ...data, layout: { container, item: box.key, offset: { x: -box.shift.x, y: -box.shift.y } } },
    }
  }

  // An item inside a box: positioned relative to the box, saved relative to the box's container.
  static inBox(node, box, id) {
    const p = box.placed.get(id)
    return {
      ...node,
      parentId: `box:${box.parentContainer}:${box.key}`,
      position: { x: p.x - box.shift.x, y: p.y - box.shift.y },
      data: { ...node.data, layout: { container: box.container, item: id, offset: box.shift } },
    }
  }

  // The nodes of a site, and the neighbours that hang off them, by site.
  static siteMembers(model) {
    const members = new Map()
    for (const n of model.nodes) {
      const anchor = n.kind === DEVICE ? n : model.anchorOf(n.id)
      const key = TopologyModel.siteOf(anchor ?? n)
      if (!members.has(key)) members.set(key, [])
      members.get(key).push(n)
    }
    return members
  }

  // Every device and neighbour; boxed per site when the scope spans more than one site.
  devices(model, { kicker, saved = SavedLayout.EMPTY }) {
    const inScopeSites = new Set(model.devices.filter(n => n.in_scope).map(TopologyModel.siteOf))
    const nodes = inScopeSites.size > 1
      ? TopologyFlow.siteBoxes(model, kicker, saved)
      : TopologyFlow.oneSite(model, kicker, saved, `site:${[...inScopeSites][0] ?? NO_SITE}`)

    const animated = model.links.length <= MAX_ANIMATED
    const offsets = TopologyFlow.offsets(model.links, l => [l.a.node, l.b.node].sort().join('|'))
    const edges = model.links.map(l => {
      const a = model.byId.get(l.a.node)
      const b = model.byId.get(l.b.node)
      const internal  = a.kind === DEVICE && b.kind === DEVICE && a.in_scope && b.in_scope
      const unmanaged = a.kind !== DEVICE || b.kind !== DEVICE
      const rgb = this.rgb(l.layer)
      return {
        id: l.id,
        source: l.a.node,
        target: l.b.node,
        type: 'floatingEdge',
        animated: internal && animated,
        data: {
          offset:          offsets.get(l),
          layer:           this.layerLabel(l.layer),
          localInterface:  l.a.interface,
          remoteInterface: l.b.interface,
          protocol:        l.attributes?.protocol,
          collectedAt:     l.attributes?.collected_at,
        },
        style: {
          stroke: internal
            ? `rgba(${rgb},0.6)`
            : unmanaged
              ? (this.layers.length > 1 ? `rgba(${rgb},0.35)` : 'var(--edge)')
              : `rgba(${rgb},0.25)`,
          strokeWidth:     internal ? 2.5 : 1.5,
          strokeDasharray: unmanaged ? '5 4' : undefined,
        },
      }
    })
    return { nodes, edges }
  }

  static deviceNode(n, kicker, position) {
    return {
      id: n.id,
      type: 'device',
      position,
      data: {
        label:  n.label,
        kicker: kicker(n),
        tone:   n.kind !== DEVICE ? 'unmanaged' : n.in_scope ? 'in' : 'out',
        target: n.node_instance_id ? { node: n.node_instance_id } : null,
      },
    }
  }

  // One site, no box: its nodes and their neighbours, saved in the site's container.
  static oneSite(model, kicker, saved, container) {
    const placed = saved.place(container, TopologyFlow.items(TopologyLayout.site(model.nodes), DEVICE_SIZE))
    return model.nodes.map(n => {
      const node = TopologyFlow.deviceNode(n, kicker, placed.get(n.id))
      return { ...node, data: { ...node.data, layout: { container, item: n.id, offset: { x: 0, y: 0 } } } }
    })
  }

  // Several sites: a box per site, sites in scope first.
  static siteBoxes(model, kicker, saved) {
    const boxes = [...TopologyFlow.siteMembers(model)].map(([key, nodes]) => ({
      key,
      container: `site:${key}`,
      parentContainer: 'site-boxes',
      nodes,
      inScope: nodes.some(n => n.kind === DEVICE && n.in_scope),
      items: TopologyFlow.items(TopologyLayout.site(nodes), DEVICE_SIZE),
    }))
    boxes.sort((a, b) => (b.inScope - a.inScope) || a.key.localeCompare(b.key))

    const composed = TopologyFlow.composeBoxes(boxes, { container: 'site-boxes', saved, arrange: TopologyLayout.grid })
    return composed.flatMap(box => [
      TopologyFlow.boxNode(box, {
        label: box.key, tone: box.inScope ? 'in' : 'out', target: { site: box.key, inScope: box.inScope },
      }),
      ...box.nodes.map(n => TopologyFlow.inBox(TopologyFlow.deviceNode(n, kicker, null), box, n.id)),
    ])
  }

  // Sites or regions as cards, the links between them folded into one edge per pair and layer. box puts each
  // group in a box ({ of: group → key, container: key → container of its cards, boxes: container of the boxes });
  // the boxes are drawn when there is more than one. Without box the cards are saved in `<kind>s`.
  groups(model, { kind, groupOf, box = null, saved = SavedLayout.EMPTY }) {
    const { groups, edges } = model.aggregate(groupOf)
    const byId = new Map(groups.map(g => [g.id, g]))
    const keyOf = id => box.of(byId.get(id))
    const boxed = box && new Set(groups.map(g => box.of(g))).size > 1
    const cards = ids => ids.map(id => ({ id, ...GROUP_SIZE }))
    const pairs = list => list.map(e => [e.a, e.b])

    const card = (g, position) => ({
      id: `group:${g.id}`,
      type: 'aggregate',
      position,
      data: {
        label:  g.id,
        kicker: kind,
        tone:   g.inScope ? 'in' : 'out',
        stats:  `${g.members.length} ${g.members.length === 1 ? 'node' : 'nodes'} · ${g.internal} internal ${g.internal === 1 ? 'link' : 'links'}`,
        target: { [kind]: g.id, inScope: g.inScope },
      },
    })

    let nodes
    if (boxed) {
      const members = new Map()
      for (const g of groups) {
        if (!members.has(box.of(g))) members.set(box.of(g), [])
        members.get(box.of(g)).push(g)
      }
      const boxes = [...members].map(([key, inside]) => {
        const ids = new Set(inside.map(g => g.id))
        const auto = TopologyLayout.dagre(cards([...ids]), pairs(edges.filter(e => ids.has(e.a) && ids.has(e.b))))
        return {
          key,
          container: box.container(key),
          parentContainer: box.boxes,
          inside,
          inScope: inside.some(g => g.inScope),
          items: TopologyFlow.items(auto, GROUP_SIZE),
        }
      })
      const composed = TopologyFlow.composeBoxes(boxes, {
        container: box.boxes,
        saved,
        arrange: sized => TopologyLayout.boxes(sized, edges.map(e => [keyOf(e.a), keyOf(e.b)])),
      })
      nodes = composed.flatMap(b => [
        TopologyFlow.boxNode(b, { label: b.key, tone: b.inScope ? 'in' : 'out', target: { region: b.key, inScope: b.inScope } }),
        ...b.inside.map(g => TopologyFlow.inBox(card(g, null), b, g.id)),
      ])
    } else {
      const container = box && groups.length ? box.container(box.of(groups[0])) : `${kind}s`
      const auto = TopologyLayout.dagre(cards(groups.map(g => g.id)), pairs(edges))
      const placed = saved.place(container, TopologyFlow.items(auto, GROUP_SIZE))
      nodes = groups.map(g => {
        const node = card(g, placed.get(g.id))
        return { ...node, data: { ...node.data, layout: { container, item: g.id, offset: { x: 0, y: 0 } } } }
      })
    }

    const inScope = new Map(groups.map(g => [g.id, g.inScope]))
    const offsets = TopologyFlow.offsets(edges, e => `${e.a}|${e.b}`)
    const rfEdges = edges.map(e => {
      const count = e.links.length
      const rgb = this.rgb(e.layer)
      return {
        id: e.id,
        source: `group:${e.a}`,
        target: `group:${e.b}`,
        type: 'floatingEdge',
        label: count > 1 ? String(count) : undefined,
        data: { offset: offsets.get(e), layer: this.layerLabel(e.layer), links: e.links },
        style: {
          stroke:      `rgba(${rgb},${inScope.get(e.a) && inScope.get(e.b) ? 0.6 : 0.3})`,
          strokeWidth: 1.5 + Math.min(6, Math.log2(count) * 1.5),
        },
      }
    })
    return { nodes, edges: rfEdges }
  }
}
