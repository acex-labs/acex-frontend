import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Check, Minus } from 'lucide-react'
import { coverageStatus, coverageCounts } from './agentUtils'

// Reason codes from the backend's telemetry providers.
const REASONS = {
  no_management_ip: 'No management IP',
  no_logical_node:  'Missing logical node',
  node_not_found:   'Node not found',
  component_error:  'Render error',
  not_produced:     'Not produced by provider',
}

const reasonText = (c) => {
  const label = REASONS[c.reason] ?? c.reason ?? 'Skipped'
  return c.detail ? `${label}: ${c.detail}` : label
}

const TABS = [
  { key: 'all',      label: 'All'          },
  { key: 'rendered', label: 'Rendered'     },
  { key: 'partial',  label: 'Partial'      },
  { key: 'excluded', label: 'Not rendered' },
]

const SOURCE_CLASSES = {
  explicit: 'text-blue-400 bg-blue-400/8 border-blue-400/20',
  rule:     'text-purple-400 bg-purple-400/8 border-purple-400/20',
  both:     'text-teal-400 bg-teal-400/8 border-teal-400/20',
}

function CapCell({ coverage }) {
  if (!coverage) return <span className="text-subtle/40">—</span>
  if (coverage.status === 'rendered') {
    return <Check size={13} className="text-emerald-400" aria-label="Rendered" />
  }
  return (
    <span title={reasonText(coverage)} aria-label={`Skipped: ${reasonText(coverage)}`}>
      <Minus size={13} className="text-amber-400" />
    </span>
  )
}

export default function NodeCoverageModal({
  coverage,               // node_coverage from GET /agents/{id}; undefined while loading
  capabilityLabel = c => c,
  capabilityOrder = [],
  initialTab = 'all',
  onClose,
}) {
  const [tab, setTab] = useState(initialTab)
  const [filter, setFilter] = useState('')
  const isLoading = coverage === undefined
  const nodes = coverage ?? []
  const counts = coverageCounts(nodes)

  // Columns: node-scoped capabilities present in the coverage, in the page's canonical order.
  const present = new Set(nodes.flatMap(n => Object.keys(n.capabilities ?? {})))
  const caps = [
    ...capabilityOrder.filter(c => present.has(c)),
    ...[...present].filter(c => !capabilityOrder.includes(c)),
  ]
  const colCount = 3 + caps.length + 1

  const q = filter.trim().toLowerCase()
  const rows = nodes
    .filter(n => tab === 'all' || coverageStatus(n) === tab)
    .filter(n => !q || String(n.node_id).includes(q) || (n.hostname ?? '').toLowerCase().includes(q))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-canvas border border-edge rounded-xl w-[860px] max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
          <div>
            <h3 className="text-sm font-semibold text-content">Resolved Nodes</h3>
            <p className="text-[11px] text-subtle mt-0.5">
              {counts.all} covered
              {counts.rendered > 0 && ` · ${counts.rendered} fully rendered`}
              {counts.partial > 0 && ` · ${counts.partial} partial`}
              {counts.excluded > 0 && ` · ${counts.excluded} not rendered`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs + filter */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-edge">
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'px-2.5 py-1 rounded text-xs transition-colors',
                  tab === t.key ? 'bg-surface-hi text-content font-medium' : 'text-subtle hover:text-content',
                ].join(' ')}
              >
                {t.label}
                <span className={`ml-1.5 tabular-nums ${t.key !== 'all' && t.key !== 'rendered' && counts[t.key] > 0 ? 'text-amber-400' : 'text-subtle'}`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Filter by hostname or ID…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            autoFocus
            className="flex-1 h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 transition-colors"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="sticky top-0 bg-canvas border-b border-edge z-10">
                {['ID', 'Hostname', 'Source'].map(col => (
                  <th key={col} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    {col}
                  </th>
                ))}
                {caps.map(cap => (
                  <th key={cap} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    {capabilityLabel(cap)}
                  </th>
                ))}
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">Reason</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-edge/50">
                    {Array.from({ length: colCount }).map((_, j) => (
                      <td key={j} className="px-4 py-2.5">
                        <div className="h-2.5 rounded bg-surface-hi animate-pulse" style={{ width: `${50 + ((i * 6 + j) % 5) * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-xs text-subtle">No nodes match</td>
                </tr>
              ) : (
                rows.map(n => {
                  const skipped = caps
                    .filter(cap => n.capabilities?.[cap]?.status === 'skipped')
                    .map(cap => ({ cap, text: reasonText(n.capabilities[cap]) }))
                  // Same reason for every skipped capability → show it once.
                  const sameReason = skipped.length > 1 && skipped.every(s => s.text === skipped[0].text)
                  return (
                    <tr key={n.node_id} className="border-b border-edge/50 hover:bg-surface-hi transition-colors">
                      <td className="px-4 py-2.5 text-xs font-mono text-subtle">#{n.node_id}</td>
                      <td className="px-4 py-2.5 text-xs font-medium">
                        <Link to={`/network/nodes/${n.node_id}`} className="text-content hover:text-brand transition-colors">
                          {n.hostname ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SOURCE_CLASSES[n.source] ?? ''}`}>
                          {n.source}
                        </span>
                      </td>
                      {caps.map(cap => (
                        <td key={cap} className="px-3 py-2.5">
                          <div className="flex justify-center"><CapCell coverage={n.capabilities?.[cap]} /></div>
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-[11px] text-subtle">
                        {skipped.length === 0 ? null : sameReason ? (
                          skipped[0].text
                        ) : (
                          skipped.map(s => (
                            <div key={s.cap}>
                              <span className="text-content/80">{capabilityLabel(s.cap)}:</span> {s.text}
                            </div>
                          ))
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
