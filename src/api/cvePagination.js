const FETCH_LIMIT = 1000

export async function fetchAllCvePages(fetchPage, signal) {
  const items = []
  let total

  do {
    const offset = items.length
    const page = await fetchPage({ limit: FETCH_LIMIT, offset, signal })
    if (!page || !Array.isArray(page.items) || !Number.isInteger(page.total) || page.total < 0
      || page.offset !== offset || !Number.isInteger(page.limit) || page.limit < 1
      || page.items.length > page.limit || offset + page.items.length > page.total
      || (page.items.length === 0 && offset < page.total)) {
      throw new Error('Invalid or incomplete CVE pagination response')
    }
    items.push(...page.items)
    total = page.total
  } while (items.length < total)

  return items
}
