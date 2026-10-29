const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

function sortValue(value, key) {
  if (key === 'published' || key === 'modified') {
    const date = Date.parse(value)
    if (!Number.isNaN(date)) return { type: 0, value: date }
  }
  if (key === 'severityScore') {
    const score = Number(value)
    if (Number.isFinite(score)) return { type: 0, value: score }
  }
  return { type: 1, value }
}

export function sortCves(items, key, order, fieldValue) {
  if (!key) return items

  const direction = order === 'desc' ? -1 : 1
  return items
    .map(item => {
      const value = fieldValue(item.cve, key).trim()
      return { item, value, sort: value ? sortValue(value, key) : null }
    })
    .sort((a, b) => {
      if (!a.sort || !b.sort) return a.sort ? -1 : b.sort ? 1 : a.item.index - b.item.index
      const comparison = a.sort.type - b.sort.type
        || (a.sort.type === 0
          ? a.sort.value - b.sort.value
          : collator.compare(a.sort.value, b.sort.value))
      return direction * comparison || a.item.index - b.item.index
    })
    .map(({ item }) => item)
}
