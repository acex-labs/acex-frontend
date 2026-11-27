// The shared layout people saved: positions of items per container, from GET /api/v1/topology/positions.
//
// A container is the frame its items are placed in: `site:<name>` (the nodes of a site), `region:<name>` (the
// sites of a region), `site-boxes`, `region-boxes` and `regions`. Positions are relative to the container's origin,
// so the nodes of a site keep their places whether the site is shown alone or as one box among others.

const GAP = 60

export class SavedLayout {
  static EMPTY = new SavedLayout()

  constructor(rows = []) {
    this.byKey = new Map(rows.map(r => [SavedLayout.key(r.container, r.item), { x: r.x, y: r.y }]))
  }

  static key(container, item) {
    return `${container}|${item}`
  }

  get(container, item) {
    return this.byKey.get(SavedLayout.key(container, item))
  }

  // Positions in the container for items [{ id, width, height, auto, anchor? }]. A saved position wins. Items
  // nobody placed keep their automatic layout, moved as a block below the placed ones so nothing lands on them.
  // anchor is where an item's top left lies relative to its position, for items positioned by their origin.
  place(container, items) {
    const result = new Map()
    const placed = []
    const unplaced = []
    for (const item of items) {
      const saved = this.get(container, item.id)
      if (saved) {
        result.set(item.id, saved)
        placed.push(SavedLayout.rect(saved, item))
      } else {
        unplaced.push(item)
      }
    }
    if (!placed.length || !unplaced.length) {
      for (const item of unplaced) result.set(item.id, item.auto)
      return result
    }
    const below = SavedLayout.bounds(placed)
    const block = SavedLayout.bounds(unplaced.map(item => SavedLayout.rect(item.auto, item)))
    const dx = below.minX - block.minX
    const dy = below.maxY + GAP - block.minY
    for (const item of unplaced) result.set(item.id, { x: item.auto.x + dx, y: item.auto.y + dy })
    return result
  }

  // What resetting the shown items forgets: a site's or region's container as a whole, but only the shown items
  // of the outer containers, which hold the boxes of the whole network. layouts: [{ container, item }]
  static resets(layouts) {
    const whole = new Set()
    const items = new Map()
    for (const { container, item } of layouts) {
      if (container.includes(':')) whole.add(container)
      else items.set(container, [...(items.get(container) ?? []), item])
    }
    return [
      ...(whole.size ? [{ containers: [...whole] }] : []),
      ...[...items].map(([container, list]) => ({ containers: [container], items: list })),
    ]
  }

  static rect(position, item) {
    return { x: position.x + (item.anchor?.x ?? 0), y: position.y + (item.anchor?.y ?? 0), width: item.width, height: item.height }
  }

  static bounds(rects) {
    return {
      minX: Math.min(...rects.map(r => r.x)),
      minY: Math.min(...rects.map(r => r.y)),
      maxX: Math.max(...rects.map(r => r.x + r.width)),
      maxY: Math.max(...rects.map(r => r.y + r.height)),
    }
  }
}
