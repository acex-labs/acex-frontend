import { Fragment, useState } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import JobStateBadge from '../jobs/JobStateBadge'

const PRE = 'px-3 py-2 text-[11px] font-mono whitespace-pre-wrap break-all text-content'
const LABEL = 'px-3 py-1 text-[10px] uppercase tracking-wider text-subtle bg-surface-hi'

const json = value => (typeof value === 'string' ? value : JSON.stringify(value, null, 2))

// A value in one line, as an expression sees it: text quoted with its \n visible, an object by its fields.
function short(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const fields = Object.keys(value)
    return `{ ${fields.slice(0, 4).join(', ')}${fields.length > 4 ? ', …' : ''} }`
  }
  const text = JSON.stringify(value) ?? 'null'
  return text.length > 80 ? `${text.slice(0, 77)}…` : text
}

// Artifacts in a table: a row per node, a column per artifact. A cell opens to its whole value. Rows without a
// node hold values the step has once for the whole run.
export function ArtifactTable({ rows }) {
  const [open, setOpen] = useState(null)
  const names = [...new Set(rows.flatMap(row => Object.keys(row.artifacts)))]
  if (names.length === 0) return <p className="text-xs text-subtle">No artifacts.</p>
  return (
    <div className="border border-edge rounded-md overflow-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="bg-surface-hi text-subtle">
            <th className="px-2 py-1 text-left font-normal">node</th>
            {names.map(name => <th key={name} className="px-2 py-1 text-left font-semibold text-brand">{name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <Fragment key={row.node}>
              <tr className="border-t border-edge align-top">
                <td className="px-2 py-1 text-content whitespace-nowrap">{row.node || <span className="text-subtle">run</span>}</td>
                {names.map(name => {
                  const cell = `${row.node}/${name}`
                  const present = name in row.artifacts
                  return (
                    <td key={name} className="px-2 py-1">
                      {present ? (
                        <button onClick={() => setOpen(open === cell ? null : cell)} className={`text-left break-all hover:text-brand ${open === cell ? 'text-brand' : 'text-content'}`}>
                          {short(row.artifacts[name])}
                        </button>
                      ) : <span className="text-subtle">—</span>}
                    </td>
                  )
                })}
              </tr>
              {names.map(name => open === `${row.node}/${name}` && (
                <tr key={name}>
                  <td colSpan={names.length + 1} className="border-t border-edge">
                    <div className="px-2 pt-1 text-[10px] text-subtle">{name}{row.node && ` on ${row.node}`}</div>
                    <pre className={PRE}>{json(row.artifacts[name])}</pre>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// What a check read, per node, when it didn't hold.
function Inputs({ inputs }) {
  const shown = Object.entries(inputs ?? {})
  if (shown.length === 0) return null
  return (
    <div className="ml-5 space-y-0.5">
      {shown.map(([node, values]) => (
        <div key={node} className="text-subtle break-all">
          {node && <span className="text-content">{node}: </span>}
          {Object.entries(values).map(([name, value]) => `${name} = ${short(value)}`).join(', ')}
        </div>
      ))}
    </div>
  )
}

// What a step did: command outputs, a ping, an assert's checks, a condition's answer, or in a dry run what it
// would have done. Anything else as it came.
function Result({ result }) {
  if (result.dry_run) {
    const { dry_run: _, ...would } = result
    return (
      <div className="border-t border-edge">
        <div className={LABEL}>Would {result.commands ? 'send' : 'do'}</div>
        <pre className={PRE}>{result.commands ? result.commands.join('\n') : json(would)}</pre>
      </div>
    )
  }
  if (result.outputs) {
    return result.outputs.map((o, i) => (
      <div key={i} className="border-t border-edge">
        <div className="px-3 py-1 text-[11px] font-mono text-brand bg-surface-hi">$ {o.command}</div>
        <pre className={PRE}>{o.output || ' '}</pre>
      </div>
    ))
  }
  if (result.checks) {
    return (
      <div className="px-3 py-2 space-y-1 border-t border-edge">
        {result.checks.map((c, i) => (
          <div key={i} className="text-[11px] font-mono space-y-0.5">
            <div className="flex items-start gap-2">
              {c.passed ? <Check size={12} className="text-green-400 shrink-0 mt-0.5" /> : <X size={12} className="text-red-400 shrink-0 mt-0.5" />}
              <span className="text-content break-all">{c.check}</span>
              {c.failed_on.length > 0 && <span className="text-red-400 shrink-0">on {c.failed_on.join(', ')}</span>}
            </div>
            <Inputs inputs={c.inputs} />
          </div>
        ))}
      </div>
    )
  }
  if ('value' in result && 'inputs' in result) {
    return (
      <div className="px-3 py-2 space-y-1 border-t border-edge text-[11px] font-mono">
        <div className="text-content">Took its <span className={result.value ? 'text-green-400' : 'text-red-400'}>{String(result.value)}</span> side, reading:</div>
        <Inputs inputs={result.inputs} />
      </div>
    )
  }
  return <pre className={`${PRE} border-t border-edge`}>{json(result)}</pre>
}

// A result in one line, for its folded row.
function summarize(result, error) {
  if (error) return error.split('\n')[0]
  if (!result) return null
  if (result.dry_run) return result.commands ? `would send ${result.commands.length} command${result.commands.length === 1 ? '' : 's'}` : 'would run'
  if (result.outputs) return `${result.outputs.length} command${result.outputs.length === 1 ? '' : 's'}`
  if ('sent' in result) return `${result.received}/${result.sent} received · ${result.success_rate}%`
  return null
}

// A row that opens to what it holds.
function Fold({ title, state, summary, failed, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <button
        onClick={() => children && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${children ? 'hover:bg-surface-hi' : 'cursor-default'}`}
      >
        <ChevronRight size={12} className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''} ${children ? 'text-subtle' : 'text-transparent'}`} />
        <span className="text-xs font-semibold text-content shrink-0">{title}</span>
        {state && <JobStateBadge state={state} />}
        {summary && (
          <span className={`ml-auto text-[11px] font-mono truncate ${failed ? 'text-red-400' : 'text-subtle'}`} title={summary}>{summary}</span>
        )}
      </button>
      {open && children}
    </div>
  )
}

// What each node did in one round of a step on nodes: its error, or what it ran and answered.
export function NodeResponses({ responses }) {
  return (
    <div className="space-y-2">
      {responses.map(r => {
        const result = r.result?.result
        return (
          <Fold key={r.job_id} title={r.hostname ?? `Node ${r.node_id}`} state={r.state} summary={summarize(result, r.error)} failed={!!r.error}>
            {(r.error || result) && (
              <>
                {r.error && <pre className={`${PRE} text-red-400 border-t border-edge`}>{r.error}</pre>}
                {result && <Result result={result} />}
              </>
            )}
          </Fold>
        )
      })}
    </div>
  )
}

// What a step that runs once did.
export function StepResult({ stepResult }) {
  if (!stepResult?.result) return null
  return (
    <div className="border border-edge rounded-md overflow-hidden [&>*:first-child]:border-t-0">
      <Result result={stepResult.result} />
    </div>
  )
}
