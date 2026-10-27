import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDesiredConfig, fetchAnnotatedDesiredConfig, fetchObservedConfig, fetchIntentDiff } from '../../api/config'
import ConfigViewer from '../../components/config/ConfigViewer'
import { SyncSummary } from '../../components/config/ConfigSync'
import { useConfigSync } from '../../hooks/useConfigSync'
import StructuredConfig from '../../components/config/StructuredConfig'
import StructuralDiff from '../../components/config/StructuralDiff'
import ConfigHistory from '../../components/config/ConfigHistory'
import { unparsedText } from '../../components/config/unparsed'
import ComplianceRules from '../../components/config/ComplianceRules'

const SUB_TABS = [
  { key: 'desired',  label: 'Desired' },
  { key: 'observed', label: 'Observed' },
  { key: 'diff',     label: 'Diff' },
  { key: 'history',  label: 'History' },
]

const FORMAT_OPTIONS = [
  { key: 'rendered',   label: 'Rendered' },
  { key: 'functional', label: 'Functional' },
]

const DIFF_OPTIONS = [
  { key: 'structural', label: 'Functional' },
  { key: 'line',       label: 'Rendered' },
]

function Toggle({ options, value, onChange }) {
  return (
    <div className="flex rounded border border-edge overflow-hidden">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={[
            'px-2.5 py-1 text-[11px] font-medium transition-colors',
            value === opt.key ? 'bg-brand/15 text-brand' : 'text-subtle hover:text-content',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function CompliancePill({ diff, isLoading }) {
  if (isLoading) return <span className="text-[10px] text-subtle animate-pulse">…</span>
  if (!diff) return null
  const pct = diff.compliance_percentage
  const color = pct === null ? 'text-subtle bg-surface-hi border-edge'
              : pct >= 90 ? 'text-green-400 bg-green-500/10 border-green-500/20'
              : pct >= 70 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span className="relative group">
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border cursor-help ${color}`}>
        {pct === null ? 'No desired config' : `${pct}% compliant`}
      </span>
      <span className="absolute right-0 top-full mt-2 z-50 hidden group-hover:block">
        <ComplianceRules diff={diff} />
      </span>
    </span>
  )
}

// What the device has beyond intent, shown next to compliance but kept out of it.
function ExtraConfigBadges({ diff }) {
  if (!diff) return null
  const badges = [
    [diff.undeclared_count, 'not declared', 'Components on the device that the desired configuration does not declare.'],
    [diff.unparsed_count, 'unparsed lines', 'Device configuration the driver does not cover yet. Tells how complete the driver is.'],
  ].filter(([count]) => count > 0)
  return badges.map(([count, label, title]) => (
    <span key={label} title={title} className="text-[10px] px-2 py-0.5 rounded border border-edge bg-surface-hi text-subtle cursor-help">
      {count} {label}
    </span>
  ))
}

export default function ConfigurationTab({ nodeId, logicalNodeId, nodeHostname, sub, onSubChange, onContextChange, onAnalysisContext }) {
  const [desiredView, setDesiredView] = useState('rendered')
  const [observedView, setObservedView] = useState('rendered')
  const [diffView, setDiffView] = useState('structural')
  const { data: sync, isSuccess: syncKnown } = useConfigSync(nodeId)

  const needsDesiredRendered = (sub === 'desired' && desiredView === 'rendered') || (sub === 'diff' && diffView === 'line')
  const needsObservedRendered = (sub === 'observed' && observedView === 'rendered') || (sub === 'diff' && diffView === 'line')

  const { data: desiredRendered, isLoading: desiredRendLoading, error: desiredRendError } = useQuery({
    queryKey: ['config-desired-annotated', nodeId],
    queryFn: () => fetchAnnotatedDesiredConfig(nodeId),
    enabled: needsDesiredRendered,
    retry: false,
  })

  const { data: desiredFunctional, isLoading: desiredFuncLoading } = useQuery({
    queryKey: ['config-desired', logicalNodeId],
    queryFn: () => fetchDesiredConfig(logicalNodeId),
    enabled: sub === 'desired' && desiredView === 'functional',
  })

  const { data: observedRendered, isLoading: obsRendLoading } = useQuery({
    queryKey: ['config-observed-rendered', nodeId],
    queryFn: () => fetchObservedConfig(nodeId, 'rendered'),
    enabled: needsObservedRendered,
  })

  const { data: observedFunctional, isLoading: obsFuncLoading } = useQuery({
    queryKey: ['config-observed-parsed', nodeId],
    queryFn: () => fetchObservedConfig(nodeId, 'parsed'),
    enabled: sub === 'observed' && observedView === 'functional',
  })

  const { data: intentDiff, isLoading: diffLoading } = useQuery({
    queryKey: ['config-intent-diff', nodeId],
    queryFn: () => fetchIntentDiff(nodeId),
  })

  const desiredRendContent = desiredRendered?.content ?? null
  const desiredRendErr = desiredRendError ? 'No NED configured for this node — rendered config unavailable.' : null

  useEffect(() => {
    // History reports its own context.
    if (!onContextChange || sub === 'history') return
    let ctx = ''
    if (sub === 'desired') {
      if (desiredView === 'rendered' && desiredRendContent) {
        ctx = `Viewing: Desired configuration (rendered)\n\n${desiredRendContent.slice(0, 4000)}`
      } else if (desiredView === 'functional' && desiredFunctional) {
        ctx = `Viewing: Desired configuration (functional/structured)\n\n${JSON.stringify(desiredFunctional, null, 2).slice(0, 4000)}`
      } else {
        ctx = 'Viewing: Desired configuration'
      }
    } else if (sub === 'observed') {
      if (observedView === 'rendered' && observedRendered?.content) {
        ctx = `Viewing: Observed (actual) configuration (rendered)\n\n${observedRendered.content.slice(0, 4000)}`
      } else if (observedView === 'functional' && observedFunctional?.content) {
        const unmatched = observedFunctional.metadata?.unmatched ?? []
        const parsed = JSON.stringify(observedFunctional.content, null, 2).slice(0, 4000)
        const unparsed = unmatched.length
          ? `\n\nLines the driver could not parse (${unmatched.length}):\n${unparsedText(unmatched).slice(0, 2000)}`
          : ''
        ctx = `Viewing: Observed (actual) configuration (functional/structured)\n\n${parsed}${unparsed}`
      } else {
        ctx = 'Viewing: Observed (actual) configuration'
      }
    } else if (sub === 'diff') {
      if (intentDiff) {
        const pct = intentDiff.compliance_percentage
        const lines = (intentDiff.diff ?? []).map(l =>
          (l.type === 'add' ? '+ ' : l.type === 'remove' ? '- ' : '  ') + l.text
        ).join('\n')
        ctx = `Viewing: Diff between desired and observed configuration\nCompliance: ${pct === null ? 'n/a, nothing desired' : `${pct}%`}\n\n${lines.slice(0, 4000)}`
      } else {
        ctx = 'Viewing: Diff between desired and observed configuration'
      }
    }
    onContextChange(ctx)
  }, [sub, desiredView, observedView, desiredRendContent, desiredFunctional, observedRendered, observedFunctional, intentDiff])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-edge shrink-0">
        <div className="flex">
          {SUB_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSubChange(key)}
              className={[
                'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
                sub === key ? 'border-brand text-content' : 'border-transparent text-subtle hover:text-content',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ExtraConfigBadges diff={intentDiff} />
          <CompliancePill diff={intentDiff} isLoading={diffLoading} />
        </div>
      </div>

      {/* Controls bar */}
      {(sub === 'desired' || sub === 'observed' || sub === 'diff') && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-edge shrink-0">
          {sub === 'desired' && (
            <>
              <Toggle value={desiredView} onChange={setDesiredView} options={FORMAT_OPTIONS} />
              {desiredView === 'rendered' && (
                <span className="ml-2 text-[10px] text-subtle">Use this for manual device bootstrapping</span>
              )}
            </>
          )}
          {sub === 'observed' && (
            <>
              <Toggle value={observedView} onChange={setObservedView} options={FORMAT_OPTIONS} />
              {syncKnown && (
                <span className="ml-auto text-[11px] text-subtle"><SyncSummary snapshot={sync} /></span>
              )}
            </>
          )}
          {sub === 'diff' && (
            <Toggle value={diffView} onChange={setDiffView} options={DIFF_OPTIONS} />
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {sub === 'desired' && desiredView === 'rendered' && (
          <ConfigViewer
            content={desiredRendContent}
            spans={desiredRendered?.spans}
            isLoading={desiredRendLoading}
            error={desiredRendErr}
          />
        )}
        {sub === 'desired' && desiredView === 'functional' && (
          <StructuredConfig config={desiredFunctional} isLoading={desiredFuncLoading} />
        )}

        {sub === 'observed' && observedView === 'rendered' && (
          <ConfigViewer
            content={observedRendered?.content}
            isLoading={obsRendLoading}
          />
        )}
        {sub === 'observed' && observedView === 'functional' && (
          <StructuredConfig config={observedFunctional?.content || null} isLoading={obsFuncLoading} unmatched={observedFunctional?.metadata?.unmatched} />
        )}

        {sub === 'diff' && diffView === 'structural' && (
          <StructuralDiff diff={intentDiff} isLoading={diffLoading} />
        )}
        {sub === 'diff' && diffView === 'line' && (
          <LineDiff
            desired={desiredRendContent}
            observed={observedRendered?.content}
            desiredLoading={desiredRendLoading}
            observedLoading={obsRendLoading}
          />
        )}

        {sub === 'history' && (
          <ConfigHistory
            nodeId={nodeId}
            nodeHostname={nodeHostname}
            onAnalysisContext={onAnalysisContext}
            onContextChange={onContextChange}
          />
        )}
      </div>
    </div>
  )
}

function computeDiff(a, b) {
  const aLines = (a ?? '').split('\n')
  const bLines = (b ?? '').split('\n')
  const m = aLines.length, n = bLines.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = aLines[i-1] === bLines[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])
  const result = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i-1] === bLines[j-1]) {
      result.unshift({ type: 'equal', a: aLines[i-1], b: bLines[j-1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'add', a: null, b: bLines[j-1] }); j--
    } else {
      result.unshift({ type: 'remove', a: aLines[i-1], b: null }); i--
    }
  }
  return result
}

function LineDiff({ desired, observed, desiredLoading, observedLoading }) {
  if (desiredLoading || observedLoading)
    return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  if (!desired && !observed)
    return <div className="p-6 text-xs text-subtle">No rendered config available for diff.</div>

  const hunks = computeDiff(desired, observed)
  const equal = hunks.filter(h => h.type === 'equal').length
  const total = hunks.length
  const pct = total ? Math.round((equal / total) * 100) : 100

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-edge shrink-0 text-xs text-subtle">
        <span className="font-semibold text-content">Desired</span>
        <span className="mx-auto text-[11px]">{equal}/{total} lines match ({pct}%)</span>
        <span className="font-semibold text-content">Observed</span>
      </div>
      <div className="flex flex-1 overflow-auto font-mono text-[11px] leading-5">
        <div className="flex-1 border-r border-edge">
          {hunks.map((h, i) => (
            <div key={i} className={['px-3 whitespace-pre', h.type === 'remove' ? 'bg-red-500/10 text-red-300' : h.type === 'equal' ? 'text-subtle' : 'text-content'].join(' ')}>
              {h.a ?? ' '}
            </div>
          ))}
        </div>
        <div className="flex-1">
          {hunks.map((h, i) => (
            <div key={i} className={['px-3 whitespace-pre', h.type === 'add' ? 'bg-green-500/10 text-green-300' : h.type === 'equal' ? 'text-subtle' : 'text-content'].join(' ')}>
              {h.b ?? ' '}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
