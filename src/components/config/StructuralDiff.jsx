const OP = {
  add:    { label: 'Added',   color: 'text-green-400',  bg: 'bg-green-500/10', border: 'border-green-500/20', dot: 'bg-green-400' },
  remove: { label: 'Removed', color: 'text-red-400',    bg: 'bg-red-500/10',   border: 'border-red-500/20',   dot: 'bg-red-400' },
  change: { label: 'Changed', color: 'text-yellow-400', bg: 'bg-yellow-500/10',border: 'border-yellow-500/20',dot: 'bg-yellow-400' },
}

function ComplianceBadge({ pct }) {
  const color = pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400'
  const barColor = pct >= 90 ? 'bg-green-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-surface-hi rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{pct}%</span>
      <span className="text-xs text-subtle">compliance</span>
    </div>
  )
}

function DiffItem({ item }) {
  const op = OP[item.op] ?? OP.change
  const path = item.path?.join(' › ') ?? ''
  const attrs = item.changed_attributes ?? []

  return (
    <div className={`rounded border ${op.border} ${op.bg} px-3 py-2.5`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${op.dot}`} />
        <span className="text-xs font-medium text-content">{item.component_type}</span>
        {item.component_name && item.component_name !== item.component_type && (
          <span className="text-[11px] text-subtle">· {item.component_name}</span>
        )}
        <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wider ${op.color}`}>
          {op.label}
        </span>
      </div>
      {path && (
        <div className="text-[10px] text-subtle/70 font-mono mb-1">{path}</div>
      )}
      {attrs.length > 0 && (
        <div className="mt-1.5 space-y-0.5 pl-4 border-l border-edge/40">
          {attrs.map((attr, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="text-subtle w-28 shrink-0 truncate">{attr.key}</span>
              {attr.before !== undefined && attr.before !== null && (
                <span className="text-red-400/80 font-mono truncate max-w-[120px]">
                  {String(attr.before)}
                </span>
              )}
              {attr.before !== undefined && attr.after !== undefined && (
                <span className="text-subtle">→</span>
              )}
              {attr.after !== undefined && attr.after !== null && (
                <span className="text-green-400/80 font-mono truncate max-w-[120px]">
                  {String(attr.after)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DiffGroup({ op, items }) {
  if (!items?.length) return null
  const style = OP[op]
  return (
    <div>
      <div className={`flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-widest ${style.color}`}>
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        {style.label} ({items.length})
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => <DiffItem key={i} item={item} />)}
      </div>
    </div>
  )
}

export default function StructuralDiff({ diff, isLoading }) {
  if (isLoading) return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  if (!diff)     return <div className="p-6 text-xs text-subtle">No diff available.</div>

  const pct = diff.compliance_percentage ?? 0
  const totalChanges = (diff.added?.length ?? 0) + (diff.changed?.length ?? 0) + (diff.removed?.length ?? 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-edge shrink-0">
        <ComplianceBadge pct={pct} />
        {totalChanges === 0 && (
          <p className="mt-2 text-xs text-green-400">Fully compliant — no differences found.</p>
        )}
      </div>
      {totalChanges > 0 && (
        <div className="flex-1 overflow-auto p-4 space-y-6">
          <DiffGroup op="add"    items={diff.added} />
          <DiffGroup op="change" items={diff.changed} />
          <DiffGroup op="remove" items={diff.removed} />
        </div>
      )}
    </div>
  )
}
