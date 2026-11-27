import assert from 'node:assert/strict'
import test from 'node:test'
import { TopologyModel, NO_REGION } from './TopologyModel.js'
import { TopologyFlow } from './TopologyFlow.js'
import { SavedLayout } from './SavedLayout.js'

const device = (id, site, role, inScope = true, regions = ['north']) => ({
  id: `node:${id}`, kind: 'node_instance', label: id, node_instance_id: id.length, site, regions, role, in_scope: inScope,
})
const link = (a, ai, b, bi, layer = 'lldp') => ({
  id: `${layer}|${a}#${ai}|${b}#${bi}`, layer, a: { node: a, interface: ai }, b: { node: b, interface: bi }, attributes: {},
})

// sto-core — sto-acc, sto-core — upp-core (twice, on two layers), sto-acc — ap (unmanaged), mmo-core out of scope.
const graph = {
  layers: ['lldp', 'physical'],
  nodes: [
    device('sto-core', 'sto', 'core'),
    device('sto-acc', 'sto', 'access'),
    device('upp-core', 'upp', 'core', true, ['north', 'nordics']),
    device('mmo-core', 'mmo', 'core', false, ['south']),
    { id: 'unmanaged:ap', kind: 'unmanaged', label: 'ap', in_scope: true },
  ],
  links: [
    link('node:sto-core', 'Gi1', 'node:sto-acc', 'Gi49'),
    link('node:sto-core', 'Gi2', 'node:upp-core', 'Gi2'),
    link('node:sto-core', 'Gi2', 'node:upp-core', 'Gi2', 'physical'),
    link('node:upp-core', 'Gi3', 'node:mmo-core', 'Gi3'),
    link('node:sto-acc', 'Gi1', 'unmanaged:ap', 'eth0'),
  ],
}

const labels = model => model.nodes.map(n => n.label).sort()

test('filtering on a role keeps devices of it and drops neighbours left without a link', () => {
  const model = new TopologyModel(graph).filter({ roles: ['core'] })

  assert.deepEqual(labels(model), ['mmo-core', 'sto-core', 'upp-core'])
  assert.equal(model.links.length, 3)
})

test('filtering on a layer keeps only its links', () => {
  const model = new TopologyModel(graph).filter({ layers: ['physical'] })

  assert.deepEqual(model.links.map(l => l.layer), ['physical'])
  assert.ok(!labels(model).includes('ap'))
})

test('hiding out of scope drops those devices and their links', () => {
  const model = new TopologyModel(graph).filter({ outOfScope: false })

  assert.ok(!labels(model).includes('mmo-core'))
  assert.ok(model.links.every(l => l.b.node !== 'node:mmo-core'))
})

test('sites fold their inner links and get one edge per pair of sites and layer', () => {
  const { groups, edges } = new TopologyModel(graph).aggregate(TopologyModel.siteOf)
  const sto = groups.find(g => g.id === 'sto')

  assert.equal(sto.internal, 1)
  assert.equal(sto.members.length, 2)
  assert.deepEqual(edges.map(e => `${e.a}-${e.b}:${e.layer}`).sort(), ['mmo-upp:lldp', 'sto-upp:lldp', 'sto-upp:physical'])
  assert.equal(groups.find(g => g.id === 'mmo').inScope, false)
})

test('a node in several regions goes to the region filtered on, else the first', () => {
  const upp = graph.nodes[2]

  assert.equal(TopologyModel.regionOf(upp, ['nordics', 'south']), 'nordics')
  assert.equal(TopologyModel.regionOf(upp, []), 'north')
  assert.equal(TopologyModel.regionOf({ regions: [] }), NO_REGION)
})

test('the nodes perspective boxes devices per site when the scope spans several sites', () => {
  const { nodes, edges } = new TopologyFlow({ layers: graph.layers }).devices(new TopologyModel(graph), { kicker: () => '' })
  const clusters = nodes.filter(n => n.type === 'cluster').map(n => n.id).sort()

  assert.deepEqual(clusters, ['box:site-boxes:mmo', 'box:site-boxes:sto', 'box:site-boxes:upp'])
  assert.equal(nodes.find(n => n.id === 'unmanaged:ap').parentId, 'box:site-boxes:sto')
  // Parents come before their children, as React Flow wants.
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  assert.ok(nodes.every(n => !n.parentId || index.get(n.parentId) < index.get(n.id)))
  // The two links of sto-core — upp-core are fanned out to either side.
  const parallel = edges.filter(e => e.source === 'node:sto-core' && e.target === 'node:upp-core').map(e => e.data.offset)
  assert.deepEqual(parallel.sort(), [-4.5, 4.5])
})

test('the nodes perspective of one site lays it out in bands without boxes', () => {
  const oneSite = { ...graph, nodes: graph.nodes.map(n => (n.site && n.site !== 'sto' ? { ...n, in_scope: false } : n)) }
  const { nodes } = new TopologyFlow({ layers: graph.layers }).devices(new TopologyModel(oneSite), { kicker: () => '' })
  const y = id => nodes.find(n => n.id === id).position.y

  assert.ok(nodes.every(n => n.type !== 'cluster'))
  assert.ok(y('node:sto-core') < y('node:sto-acc'))
  assert.ok(y('node:sto-acc') < y('node:upp-core'))
  assert.ok(y('node:upp-core') < y('unmanaged:ap'))
})

test('the groups perspective counts the links an edge folds', () => {
  const flow = new TopologyFlow({ layers: ['lldp'] })
  const twice = { ...graph, layers: ['lldp'], links: [...graph.links.filter(l => l.layer === 'lldp'), link('node:sto-acc', 'Gi2', 'node:upp-core', 'Gi4')] }
  const { nodes, edges } = flow.groups(new TopologyModel(twice), { kind: 'site', groupOf: TopologyModel.siteOf })
  const stoUpp = edges.find(e => e.source === 'group:sto' && e.target === 'group:upp')

  assert.equal(nodes.length, 3)
  assert.equal(stoUpp.label, '2')
  assert.equal(stoUpp.data.links.length, 2)
  assert.equal(stoUpp.data.layer, undefined)
})

test('the sites perspective boxes sites per region when they lie in more than one', () => {
  const flow = new TopologyFlow({ layers: ['lldp'] })
  const box = { of: g => TopologyModel.regionOf(g.members[0], ['north', 'south']), container: k => `region:${k}`, boxes: 'region-boxes' }
  const { nodes } = flow.groups(new TopologyModel(graph), { kind: 'site', groupOf: TopologyModel.siteOf, box })
  const parent = id => nodes.find(n => n.id === id).parentId

  assert.deepEqual(nodes.filter(n => n.type === 'cluster').map(n => n.id).sort(), ['box:region-boxes:north', 'box:region-boxes:south'])
  assert.equal(parent('group:sto'), 'box:region-boxes:north')
  assert.equal(parent('group:upp'), 'box:region-boxes:north')
  assert.equal(parent('group:mmo'), 'box:region-boxes:south')
  assert.deepEqual(nodes.find(n => n.id === 'box:region-boxes:north').data.target, { region: 'north', inScope: true })
  // Parents come before their children, and a site sits inside its box.
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  assert.ok(nodes.every(n => !n.parentId || index.get(n.parentId) < index.get(n.id)))
  for (const n of nodes.filter(n => n.parentId)) {
    const box = nodes.find(b => b.id === n.parentId).style
    assert.ok(n.position.x >= 0 && n.position.y >= 0)
    assert.ok(n.position.x + 200 <= box.width && n.position.y + 80 <= box.height)
  }
})

test('the sites perspective draws no box when every site lies in one region', () => {
  const north = { ...graph, nodes: graph.nodes.filter(n => n.id !== 'node:mmo-core'), links: graph.links.slice(0, 3) }
  const { nodes } = new TopologyFlow({ layers: ['lldp'] }).groups(new TopologyModel(north), {
    kind: 'site', groupOf: TopologyModel.siteOf,
    box: { of: g => TopologyModel.regionOf(g.members[0]), container: k => `region:${k}`, boxes: 'region-boxes' },
  })

  assert.ok(nodes.every(n => n.type !== 'cluster' && !n.parentId))
})

// Where a node is saved: its position plus the offset of its layout.
const savedAt = node => ({ x: node.position.x + node.data.layout.offset.x, y: node.position.y + node.data.layout.offset.y })

test('a saved position wins, and what nobody placed goes below it', () => {
  const saved = new SavedLayout([{ container: 'c', item: 'a', x: 500, y: 500 }])
  const items = [
    { id: 'a', width: 10, height: 10, auto: { x: 0, y: 0 } },
    { id: 'b', width: 10, height: 10, auto: { x: 20, y: 0 } },
    { id: 'c', width: 10, height: 10, auto: { x: 40, y: 30 } },
  ]
  const placed = saved.place('c', items)

  assert.deepEqual(placed.get('a'), { x: 500, y: 500 })
  assert.deepEqual(placed.get('b'), { x: 500, y: 570 })
  assert.deepEqual(placed.get('c'), { x: 520, y: 600 })
})

test('a node saved in its site keeps its place whether the site is shown alone or boxed', () => {
  const saved = new SavedLayout([{ container: 'site:sto', item: 'node:sto-acc', x: 777, y: 333 }])
  const flow = new TopologyFlow({ layers: graph.layers })
  const alone = flow.devices(new TopologyModel(graph).filter({ outOfScope: false, roles: ['access'] }), { kicker: () => '', saved })
  const boxed = flow.devices(new TopologyModel(graph), { kicker: () => '', saved })

  assert.deepEqual(savedAt(alone.nodes.find(n => n.id === 'node:sto-acc')), { x: 777, y: 333 })
  assert.deepEqual(savedAt(boxed.nodes.find(n => n.id === 'node:sto-acc')), { x: 777, y: 333 })
  assert.equal(boxed.nodes.find(n => n.id === 'node:sto-acc').data.layout.container, 'site:sto')
})

test('a box is saved by its origin, and grows around a node moved far inside it', () => {
  const flow = new TopologyFlow({ layers: graph.layers })
  const first = flow.devices(new TopologyModel(graph), { kicker: () => '' })
  const box = first.nodes.find(n => n.id === 'box:site-boxes:sto')
  const origin = savedAt(box)
  const saved = new SavedLayout([
    { container: 'site-boxes', item: 'sto', ...origin },
    { container: 'site:sto', item: 'node:sto-core', x: 0, y: 0 },
    { container: 'site:sto', item: 'node:sto-acc', x: 2000, y: 1500 },
  ])
  const after = flow.devices(new TopologyModel(graph), { kicker: () => '', saved })
  const grown = after.nodes.find(n => n.id === 'box:site-boxes:sto')
  const acc = after.nodes.find(n => n.id === 'node:sto-acc')

  assert.deepEqual(savedAt(grown), origin)
  assert.ok(grown.style.width > box.style.width && grown.style.height > box.style.height)
  assert.ok(acc.position.x + 170 <= grown.style.width && acc.position.y + 60 <= grown.style.height)
})

test('resetting forgets sites and regions as a whole, but only the shown boxes of the whole network', () => {
  const resets = SavedLayout.resets([
    { container: 'site:sto', item: 'node:1' },
    { container: 'site:sto', item: 'node:2' },
    { container: 'site:upp', item: 'node:3' },
    { container: 'site-boxes', item: 'sto' },
    { container: 'site-boxes', item: 'upp' },
  ])

  assert.deepEqual(resets, [
    { containers: ['site:sto', 'site:upp'] },
    { containers: ['site-boxes'], items: ['sto', 'upp'] },
  ])
})
