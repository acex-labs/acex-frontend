import { useCallback, useMemo, useState } from 'react'

const PREFIX = 'acex.table-columns.'

// The keys chosen earlier for this table, as long as the table still has those columns. Storage can be blocked or
// empty (a private window), and a column can have been removed since: then the table opens as it did before.
function read(storageKey, known, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (Array.isArray(saved)) {
      const keys = saved.filter(key => known.has(key))
      if (keys.length > 0) return keys
    }
  } catch {
    // fall through to the default columns
  }
  return fallback
}

// Which columns of a table are shown, and in which order. The choice is kept in this browser, per table.
//   allColumns   every column the table can show (DataTable columns)
//   defaultKeys  the keys shown until someone chooses
export function useTableColumns(tableId, allColumns, defaultKeys) {
  const storageKey = PREFIX + tableId
  const known = useMemo(() => new Set(allColumns.map(column => column.key)), [allColumns])
  const [keys, setKeys] = useState(() => read(storageKey, known, defaultKeys))

  const choose = useCallback((next) => {
    setKeys(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // kept for this visit only
    }
  }, [storageKey])

  const columns = useMemo(
    () => keys.map(key => allColumns.find(column => column.key === key)).filter(Boolean),
    [keys, allColumns],
  )

  return { columns, keys, choose }
}
