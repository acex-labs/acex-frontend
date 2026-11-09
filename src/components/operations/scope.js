export const pathId = path => JSON.stringify(path)

// Whether `path` lies at or below `scope`: the empty scope holds everything.
export const within = (path, scope) => path.length >= scope.length && scope.every((s, i) => path[i] === s)

// The keys of a collection's entries in a render, from the spans below it, in the order they are written.
export function entriesOf(spans, path) {
  const keys = new Set()
  for (const s of spans) if (s.path.length > path.length && within(s.path, path)) keys.add(s.path[path.length])
  return [...keys]
}

// What an item of the tree holds: a branch's or component's fields, or a collection's entries as the reference
// node has them, each with the collection's fields.
export function childrenOf(item, spans) {
  if (item.kind === 'collection') {
    return entriesOf(spans, item.path).map(key => ({ path: [...item.path, key], name: key, kind: 'entry', type: item.type, schema: item.schema }))
  }
  if (item.kind === 'attribute') return []
  return item.schema.children.map(c => ({ path: [...item.path, c.name], name: c.name, kind: c.kind, type: c.type, schema: c }))
}

// Whether any of the drivers can write at `path`, from the top-level paths their syntax covers, where `{param}`
// stands for any key. Without the drivers' paths, everything counts as writable.
export function writable(path, templates) {
  if (!templates) return true
  return templates.some(template => {
    const segments = template.split('.')
    return segments.slice(0, path.length).every((s, i) => s.startsWith('{') || s === path[i])
  })
}

// The rendered lines any of the scopes covers, 1-based, from the spans at or below them.
export function coveredLines(spans, scopes) {
  const lines = new Set()
  for (const s of spans) {
    if (scopes.some(scope => within(s.path, scope))) for (let l = s.start; l <= s.end; l++) lines.add(l)
  }
  return lines
}

// The scopes with `path` checked: it replaces any below it, and the whole tree replaces everything.
export function check(scopes, path) {
  return [...scopes.filter(s => !within(s, path)), path]
}
