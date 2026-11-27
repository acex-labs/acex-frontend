// A topology graph from GET /api/v1/topology: nodes of several kinds, and links that each belong to one layer.

export const DEVICE = 'node_instance'
export const UNMANAGED = 'unmanaged'
export const NO_SITE = '(no site)'
export const NO_REGION = '(no region)'

export class TopologyModel {
  constructor(graph) {
    this.layers = graph?.layers ?? []
    this.nodes  = graph?.nodes ?? []
    this.links  = graph?.links ?? []
    this.byId   = new Map(this.nodes.map(n => [n.id, n]))
  }

  get devices() {
    return this.nodes.filter(n => n.kind === DEVICE)
  }

  roles() {
    return [...new Set(this.devices.map(n => n.role).filter(Boolean))].sort()
  }

  count({ kind, inScope } = {}) {
    return this.nodes.filter(n =>
      (kind === undefined || n.kind === kind) && (inScope === undefined || n.in_scope === inScope)
    ).length
  }

  // A device is kept by its role and scope, an unmanaged neighbour only while a kept link still leads to it.
  filter({ roles = [], layers = null, unmanaged = true, outOfScope = true } = {}) {
    const kept = this.nodes.filter(n => {
      if (n.kind === UNMANAGED) return unmanaged
      if (n.kind !== DEVICE) return true
      if (!outOfScope && !n.in_scope) return false
      return !roles.length || roles.includes(n.role)
    })
    const keptIds = new Set(kept.map(n => n.id))
    const links = this.links.filter(l =>
      keptIds.has(l.a.node) && keptIds.has(l.b.node) && (!layers || layers.includes(l.layer))
    )
    const linked = new Set(links.flatMap(l => [l.a.node, l.b.node]))
    return new TopologyModel({
      layers: this.layers,
      nodes:  kept.filter(n => n.kind === DEVICE || linked.has(n.id)),
      links,
    })
  }

  // The device a node hangs off, for nodes that are not devices themselves.
  anchorOf(id) {
    for (const l of this.links) {
      const other = l.a.node === id ? l.b.node : l.b.node === id ? l.a.node : null
      if (other && this.byId.get(other)?.kind === DEVICE) return this.byId.get(other)
    }
    return null
  }

  // Devices folded into groups (sites, regions). Links inside a group are counted on it; links between
  // groups become one edge per pair of groups and layer.
  aggregate(groupOf) {
    const groups = new Map()
    for (const n of this.devices) {
      const key = groupOf(n)
      if (!groups.has(key)) groups.set(key, { id: key, members: [], inScope: false, internal: 0 })
      const g = groups.get(key)
      g.members.push(n)
      g.inScope ||= n.in_scope
    }

    const edges = new Map()
    for (const l of this.links) {
      const a = this.byId.get(l.a.node)
      const b = this.byId.get(l.b.node)
      if (a?.kind !== DEVICE || b?.kind !== DEVICE) continue
      const ga = groupOf(a)
      const gb = groupOf(b)
      if (ga === gb) {
        groups.get(ga).internal += 1
        continue
      }
      const [x, y] = [ga, gb].sort()
      const key = `${x}|${y}|${l.layer}`
      if (!edges.has(key)) edges.set(key, { id: key, a: x, b: y, layer: l.layer, links: [] })
      edges.get(key).links.push({ a: `${a.label} ${l.a.interface}`.trim(), b: `${b.label} ${l.b.interface}`.trim() })
    }
    return { groups: [...groups.values()], edges: [...edges.values()] }
  }

  static siteOf(node) {
    return node.site ?? NO_SITE
  }

  // A site can lie in several regions: the first by name of those filtered on wins, else the first by name.
  static regionOf(node, preferred = []) {
    const regions = node.regions ?? []
    return regions.find(r => preferred.includes(r)) ?? regions[0] ?? NO_REGION
  }
}
