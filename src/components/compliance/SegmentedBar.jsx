// One whole split into parts: a thin bar with no text, parts in their order separated by a 2px gap, and a legend
// beside it carrying each part's name and figure. A part at zero draws nothing; hovering a part names it.
// parts: [{ key, label, value, fill }] where fill is a background class.

const share = (value, total) => (total ? `${Math.round((value / total) * 100)}%` : '0%')

export default function SegmentedBar({ parts, label, legend = true }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  const describe = p => `${p.label}: ${p.value} (${share(p.value, total)})`
  return (
    <div className="space-y-2">
      <div
        className="flex h-2 w-full gap-[2px] rounded-full overflow-hidden bg-surface-hi"
        role="img"
        aria-label={`${label}: ${parts.map(describe).join(', ')}`}
      >
        {parts.filter(p => p.value > 0).map(p => (
          <div key={p.key} title={describe(p)} className={`h-full ${p.fill}`} style={{ flexGrow: p.value, flexBasis: 0 }} />
        ))}
      </div>
      {legend && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {parts.map(p => (
            <li key={p.key} className="flex items-center gap-1.5 text-[11px] text-subtle">
              <span className={`inline-block w-2 h-2 rounded-full ${p.fill}`} aria-hidden="true" />
              {p.label}
              <span className="text-content tabular-nums">{p.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
