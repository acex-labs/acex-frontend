import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchObservedHistory, fetchObservedByHash, fetchObservedDiff, streamConfigAnalysis, streamAsk } from '../../api/config'
import AiPanel from '../ai/AiPanel'
import ConfigViewer from './ConfigViewer'
import StructuredConfig from './StructuredConfig'

const FORMAT_OPTIONS = [
  { key: 'rendered',   label: 'Rendered' },
  { key: 'functional', label: 'Functional' },
]

const CONFIG_DIFF_STARTERS = [
  { key: 'explain',         label: 'Explain changes' },
  { key: 'risk_assessment', label: 'Risk assessment' },
  { key: 'alignment',       label: 'Intent alignment' },
]

const CONTEXT_LINES = 3

function Toggle({ options, value, onChange }) {
  return (
    <div className="flex rounded border border-edge overflow-hidden">
      {options.map(opt => (
        <button key={opt.key} onClick={() => onChange(opt.key)}
          className={['px-2.5 py-1 text-[11px] font-medium transition-colors',
            value === opt.key ? 'bg-brand/15 text-brand' : 'text-subtle hover:text-content'].join(' ')}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function diffToText(diffLines) {
  return (diffLines ?? []).map(l =>
    (l.type === 'add' ? '+ ' : l.type === 'remove' ? '- ' : '  ') + l.text
  ).join('\n')
}

function buildHunks(lines) {
  // Mark which equal lines are within CONTEXT_LINES of a change
  const changed = new Set()
  lines.forEach((l, i) => { if (l.type !== 'equal') changed.add(i) })

  const visible = new Set()
  changed.forEach(i => {
    for (let j = Math.max(0, i - CONTEXT_LINES); j <= Math.min(lines.length - 1, i + CONTEXT_LINES); j++)
      visible.add(j)
  })

  // Group into segments: visible lines and collapsed equal groups
  const segments = []
  let i = 0
  while (i < lines.length) {
    if (visible.has(i) || changed.has(i)) {
      segments.push({ type: 'line', line: lines[i], index: i })
      i++
    } else {
      // Start of a collapsed group
      const start = i
      while (i < lines.length && !visible.has(i)) i++
      segments.push({ type: 'collapsed', from: start, to: i - 1, count: i - start })
    }
  }
  return segments
}

function DiffViewer({ diff, isLoading }) {
  const [expanded, setExpanded] = useState(new Set())

  if (isLoading) return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  if (!diff) return <div className="p-6 text-xs text-subtle">Select two snapshots to compare.</div>

  const lines = diff.diff ?? []
  const adds    = lines.filter(l => l.type === 'add').length
  const removes = lines.filter(l => l.type === 'remove').length
  const equals  = lines.filter(l => l.type === 'equal').length

  const segments = buildHunks(lines)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-edge shrink-0 text-[11px]">
        <span className="text-green-400 font-medium">+{adds} added</span>
        <span className="text-red-400 font-medium">-{removes} removed</span>
        <span className="text-subtle">{equals} unchanged</span>
      </div>
      <div className="flex-1 overflow-auto font-mono text-[11px] leading-5">
        {segments.map((seg, si) => {
          if (seg.type === 'collapsed') {
            if (expanded.has(si)) {
              return lines.slice(seg.from, seg.to + 1).map((line, li) => (
                <DiffLine key={`${si}-${li}`} line={line} />
              ))
            }
            return (
              <button key={si} onClick={() => setExpanded(prev => new Set([...prev, si]))}
                className="w-full flex items-center gap-2 px-4 py-0.5 text-[10px] text-subtle hover:bg-surface-hi transition-colors border-y border-edge/20">
                <span className="flex-1 border-t border-dashed border-edge/40" />
                <span className="shrink-0">↕ {seg.count} unchanged lines</span>
                <span className="flex-1 border-t border-dashed border-edge/40" />
              </button>
            )
          }
          return <DiffLine key={si} line={seg.line} />
        })}
      </div>
    </div>
  )
}

function DiffLine({ line }) {
  return (
    <div className={['flex gap-3 px-3 whitespace-pre',
      line.type === 'add'    ? 'bg-green-500/10 text-green-300' : '',
      line.type === 'remove' ? 'bg-red-500/10 text-red-300' : '',
      line.type === 'equal'  ? 'text-subtle/50' : '',
    ].join(' ')}>
      <span className="w-4 shrink-0 select-none text-right opacity-50">
        {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
      </span>
      <span className="w-8 shrink-0 select-none text-right opacity-40 tabular-nums">
        {line.type !== 'add' ? (line.line_a ?? '') : ''}
      </span>
      <span className="w-8 shrink-0 select-none text-right opacity-40 tabular-nums">
        {line.type !== 'remove' ? (line.line_b ?? '') : ''}
      </span>
      <span>{line.text}</span>
    </div>
  )
}

export default function ConfigHistory({ nodeId }) {
  const [compareMode, setCompareMode] = useState(false)
  const [selectedHash, setSelectedHash] = useState(null)
  const [checkedHashes, setCheckedHashes] = useState([])
  const [view, setView] = useState('rendered')

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ['config-history', nodeId],
    queryFn: () => fetchObservedHistory(nodeId),
  })

  const sorted = history
    ? [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : []

  const activeHash = selectedHash ?? sorted[0]?.hash

  const toggleCheck = (hash) => {
    setCheckedHashes(prev => {
      if (prev.includes(hash)) return prev.filter(h => h !== hash)
      if (prev.length >= 2) return [prev[1], hash]
      return [...prev, hash]
    })
  }

  // Sort selected pair chronologically: older = from, newer = to
  const selectedSnaps = checkedHashes
    .map(h => sorted.find(s => s.hash === h))
    .filter(Boolean)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const snapFrom = selectedSnaps[0]
  const snapTo   = selectedSnaps[1]

  const { data: snapshot, isLoading: snapLoading } = useQuery({
    queryKey: ['config-snapshot', nodeId, activeHash],
    queryFn: () => fetchObservedByHash(nodeId, activeHash),
    enabled: !compareMode && !!activeHash,
  })

  const { data: diff, isLoading: diffLoading } = useQuery({
    queryKey: ['config-diff', nodeId, snapFrom?.hash, snapTo?.hash],
    queryFn: () => fetchObservedDiff(nodeId, snapFrom.hash, snapTo.hash),
    enabled: compareMode && !!snapFrom && !!snapTo,
  })

  const handleToggleCompare = () => {
    setCompareMode(m => !m)
    if (!compareMode && sorted.length >= 2)
      setCheckedHashes([sorted[0].hash, sorted[1].hash])
  }

  if (histLoading)
    return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  if (!sorted.length)
    return <div className="p-6 text-xs text-subtle">No observed config snapshots yet.</div>

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Snapshot list */}
      <div className="w-60 shrink-0 border-r border-edge flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-edge shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">
            {sorted.length} snapshot{sorted.length !== 1 ? 's' : ''}
          </span>
          <button onClick={handleToggleCompare}
            className={['text-[11px] font-medium px-2 py-0.5 rounded transition-colors',
              compareMode ? 'bg-brand/15 text-brand' : 'text-subtle hover:text-content'].join(' ')}>
            Compare
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {sorted.map((snap, i) => {
            const isViewSelected = !compareMode && snap.hash === activeHash
            const isChecked = compareMode && checkedHashes.includes(snap.hash)
            return (
              <div key={snap.hash}
                onClick={() => compareMode ? toggleCheck(snap.hash) : setSelectedHash(snap.hash)}
                className={['px-3 py-2.5 border-b border-edge/50 transition-colors cursor-pointer flex items-start gap-2.5',
                  isViewSelected || isChecked ? 'bg-brand/10' : 'hover:bg-surface-hi'].join(' ')}>
                {compareMode && (
                  <div className={['mt-0.5 w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-colors',
                    isChecked ? 'bg-brand border-brand' : 'border-edge'].join(' ')}>
                    {isChecked && <span className="text-[8px] text-white font-bold leading-none">✓</span>}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-medium text-content flex-1">{formatDate(snap.created_at)}</span>
                    {i === 0 && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1 py-px rounded bg-brand/15 text-brand">Latest</span>
                    )}
                  </div>
                  <span className="text-[10px] text-subtle font-mono">{snap.hash.slice(0, 8)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Controls bar */}
        {!compareMode && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-edge shrink-0">
            <Toggle value={view} onChange={setView} options={FORMAT_OPTIONS} />
          </div>
        )}
        {compareMode && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-edge shrink-0 text-[11px]">
            {snapFrom && snapTo ? (
              <>
                <span className="text-subtle">From</span>
                <span className="text-content font-medium">{formatDate(snapFrom.created_at)}</span>
                <span className="text-subtle mx-1">→</span>
                <span className="text-subtle">To</span>
                <span className="text-content font-medium">{formatDate(snapTo.created_at)}</span>
              </>
            ) : (
              <span className="text-subtle">
                {checkedHashes.length === 0 ? 'Select two snapshots to compare' : 'Select one more snapshot'}
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {!compareMode && view === 'rendered' && (
            <ConfigViewer content={snapshot?.content} isLoading={snapLoading} />
          )}
          {!compareMode && view === 'functional' && (
            <StructuredConfig config={snapshot?.content} isLoading={snapLoading} />
          )}
          {compareMode && (
            <DiffViewer diff={diff} isLoading={diffLoading} />
          )}
        </div>

        {/* AI panel — sibling to content, always rendered in compare mode */}
        {compareMode && (
          <AiPanel
            starters={CONFIG_DIFF_STARTERS}
            disabled={!diff}
            placeholder="Or type your own question…"
            onStarterClick={(key, streaming) => streamConfigAnalysis({
              task: key,
              diff: diffToText(diff?.diff),
              snapAHash: snapFrom?.hash,
              snapBHash: snapTo?.hash,
              snapATimestamp: snapFrom?.created_at,
              snapBTimestamp: snapTo?.created_at,
              ...streaming,
            })}
            onSend={(text, history, streaming) => streamAsk({
              prompt: history.length === 0
                ? `Configuration diff context:\n${diffToText(diff?.diff)}\n\nQuestion: ${text}`
                : text,
              messages: history,
              ...streaming,
            })}
          />
        )}
      </div>
    </div>
  )
}
