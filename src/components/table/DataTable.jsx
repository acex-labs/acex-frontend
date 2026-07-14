import { ChevronUp, ChevronDown } from 'lucide-react'

const WIDTHS = ['55%', '70%', '45%', '80%', '60%', '75%', '50%', '65%', '40%', '72%']

function SkeletonRows({ count, cols }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-4 py-2.5">
          <div
            className="h-2.5 rounded bg-surface-hi animate-pulse"
            style={{ width: WIDTHS[(i * cols + j) % WIDTHS.length] }}
          />
        </td>
      ))}
    </tr>
  ))
}

// selection prop: { ids: Set, onToggle(id), onToggleAll(allRows), allSelected }
export default function DataTable({ columns, data, isLoading, sortKey, sortOrder, onSort, onRowClick, selection, rowKey = 'id' }) {
  const handleSort = (col) => {
    if (!col.sortable || !onSort) return
    onSort(col.key, col.key === sortKey ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc')
  }

  const colCount = columns.length + (selection ? 1 : 0)
  const getKey = (row) => row[rowKey]

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="sticky top-0 bg-canvas border-b border-edge z-10">
            {selection && (
              <th className="px-4 py-2 w-9">
                <input
                  type="checkbox"
                  checked={selection.allSelected && data.length > 0}
                  onChange={() => selection.onToggleAll(data)}
                  className="accent-brand cursor-pointer"
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                className={[
                  'px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle select-none',
                  col.sortable ? 'cursor-pointer hover:text-content' : '',
                  sortKey === col.key ? 'text-brand' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortOrder === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows count={12} cols={colCount} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-12 text-center text-xs text-subtle">
                No results
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const selected = selection?.ids.has(getKey(row))
              return (
                <tr
                  key={getKey(row) ?? i}
                  onClick={() => selection ? selection.onToggle(row) : onRowClick?.(row)}
                  className={[
                    'border-b border-edge transition-colors cursor-pointer',
                    selected ? 'bg-brand/5 hover:bg-brand/8' : 'hover:bg-surface-hi',
                  ].join(' ')}
                >
                  {selection && (
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => selection.onToggle(row)}
                        className="accent-brand cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-2.5 text-xs text-content">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
