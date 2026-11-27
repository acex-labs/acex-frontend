import { formatValue, humanize } from './actions'

// What one node answered to an action: a table of its rows, or its fields one per line.
export default function ActionResult({ result, action }) {
  if (action.rows) {
    const rows = result[action.rows] ?? []
    return (
      <div className="border-t border-edge overflow-x-auto">
        {result.truncated && (
          <div className="px-3 py-1.5 text-[11px] text-amber-400">The first {rows.length} of {result.total}</div>
        )}
        {rows.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-subtle">None</div>
        ) : (
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr>
                {action.columns.map(c => (
                  <th key={c} className="px-3 py-1 text-left font-semibold text-subtle whitespace-nowrap">{humanize(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-edge/50">
                  {action.columns.map(c => (
                    <td key={c} className="px-3 py-1 text-content whitespace-nowrap">{formatValue(row[c], c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }
  // Text over several lines, such as a configuration, keeps its lines under the fields.
  const multiline = c => typeof result[c] === 'string' && result[c].includes('\n')
  const fields = action.columns.filter(c => !multiline(c))
  return (
    <div className="border-t border-edge">
      {fields.length > 0 && (
        <dl className="px-3 py-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[11px] font-mono">
          {fields.map(c => (
            <div key={c} className="contents">
              <dt className="text-subtle">{humanize(c)}</dt>
              <dd className="text-content break-all">{formatValue(result[c], c)}</dd>
            </div>
          ))}
        </dl>
      )}
      {action.columns.filter(multiline).map(c => (
        <pre key={c} className="px-3 py-2 text-[11px] font-mono whitespace-pre-wrap break-all text-content max-h-[60vh] overflow-auto">{result[c]}</pre>
      ))}
    </div>
  )
}
