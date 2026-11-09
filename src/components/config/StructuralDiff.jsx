import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import UnparsedLines from './UnparsedLines'

// Labels say what the device is, compared with intent — not what a patch would do (the op names).
const OP = {
  add:    { label: 'Missing on device', hint: 'Declared, but not on the device.',
            color: 'text-green-400',  bg: 'bg-green-500/10', border: 'border-green-500/20', dot: 'bg-green-400' },
  change: { label: 'Different',         hint: 'On the device with other values than declared.',
            color: 'text-yellow-400', bg: 'bg-yellow-500/10',border: 'border-yellow-500/20',dot: 'bg-yellow-400' },
  remove: { label: 'Not declared',      hint: 'On the device, but not in the desired configuration. Not counted in compliance.',
            color: 'text-red-400',    bg: 'bg-red-500/10',   border: 'border-red-500/20',   dot: 'bg-red-400' },
}

function ComplianceBadge({ pct }) {
  if (pct === null) return <span className="text-xs text-subtle">No desired configuration declared — compliance does not apply.</span>
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

// An attribute value as the backend serializes it: a scalar, a list, or a nested object. Unset reads as "—".
function formatValue(value) {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Where in the config maps a declared value was added: the code location, for a tooltip.
function originSource(origin) {
  const at = origin.file ? `${origin.file}${origin.line ? `:${origin.line}` : ''}` : ''
  return [origin.config_map && `config map ${origin.config_map}`, at, origin.path.join('.')].filter(Boolean).join(' · ')
}

// The config component a declared difference derives from, and the config map code that added it.
function OriginLine({ origin }) {
  return (
    <div className="text-[10px] text-subtle mb-1 truncate" title={originSource(origin)}>
      from <span className="text-content">{origin.component}</span>
      {origin.name && <> · {origin.name}</>}
      {origin.config_map && <> — config map <span className="text-content">{origin.config_map}</span></>}
      {origin.file && <span className="font-mono"> ({origin.file}{origin.line ? `:${origin.line}` : ''})</span>}
    </div>
  )
}

function DiffItem({ item }) {
  const op = OP[item.op] ?? OP.change
  const path = item.path?.join(' › ') ?? ''
  const attrs = item.changed_attributes ?? []
  // A component missing on the device opens to show what's declared for it.
  const declared = item.op === 'add' ? Object.entries(item.after_dict ?? {}) : []
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded border ${op.border} ${op.bg} px-3 py-2.5`}>
      <div
        className={`flex items-center gap-2 mb-1 ${declared.length ? 'cursor-pointer' : ''}`}
        onClick={declared.length ? () => setOpen(o => !o) : undefined}
      >
        {declared.length > 0 ? (
          <ChevronRight size={12} className={`text-subtle transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
        ) : (
          <span className={`w-2 h-2 rounded-full shrink-0 ${op.dot}`} />
        )}
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
      {item.origin && <OriginLine origin={item.origin} />}
      {attrs.length > 0 && (
        <div className="mt-1.5 space-y-0.5 pl-4 border-l border-edge/40">
          {attrs.map((attr, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="text-subtle w-28 shrink-0 truncate" title={attr.attribute_name}>{attr.attribute_name}</span>
              <span className="text-red-400/80 font-mono truncate max-w-[160px]" title={formatValue(attr.before)}>
                {formatValue(attr.before)}
              </span>
              <span className="text-subtle">→</span>
              <span className="text-green-400/80 font-mono truncate max-w-[160px]" title={formatValue(attr.after)}>
                {formatValue(attr.after)}
              </span>
              {/* An attribute set by a component of its own, e.g. a hostname on the system config. */}
              {attr.origin && attr.origin.path.join('.') !== item.origin?.path.join('.') && (
                <span className="text-[10px] text-subtle truncate" title={originSource(attr.origin)}>
                  · {attr.origin.component}{attr.origin.config_map ? ` (${attr.origin.config_map})` : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-1.5 space-y-0.5 pl-4 border-l border-edge/40">
          {declared.map(([name, value]) => (
            <div key={name} className="flex items-center gap-2 text-[11px]">
              <span className="text-subtle w-28 shrink-0 truncate" title={name}>{name}</span>
              <span className="text-green-400/80 font-mono truncate max-w-[320px]" title={formatValue(value)}>
                {formatValue(value)}
              </span>
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
        <span className="normal-case tracking-normal font-normal text-subtle">— {style.hint}</span>
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

  const pct = diff.compliance_percentage ?? null
  const totalChanges = (diff.added?.length ?? 0) + (diff.changed?.length ?? 0) + (diff.removed?.length ?? 0)
  const unparsed = diff.unparsed ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-edge shrink-0">
        <ComplianceBadge pct={pct} />
        {!diff.added?.length && !diff.changed?.length && pct !== null && (
          <p className="mt-2 text-xs text-green-400">Fully compliant — no differences found.</p>
        )}
      </div>
      {(totalChanges > 0 || unparsed.length > 0) && (
        <div className="flex-1 overflow-auto p-4 space-y-6">
          <DiffGroup op="add"    items={diff.added} />
          <DiffGroup op="change" items={diff.changed} />
          <DiffGroup op="remove" items={diff.removed} />
          {unparsed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">
                <span className="w-2 h-2 rounded-full bg-subtle/50" />
                Not parsed ({unparsed.length} lines)
                <span className="normal-case tracking-normal font-normal">
                  — the driver doesn't cover these lines yet, so they aren't compared or counted.
                </span>
              </div>
              <div className="rounded border border-edge px-3 py-2.5">
                <UnparsedLines unmatched={unparsed} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
