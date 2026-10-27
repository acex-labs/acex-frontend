import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'

// Each line's origin: that of the innermost span holding it. Spans nest — an interface block holds
// a span per field line — so the innermost one names the most specific component behind the line.
function lineOrigins(lineCount, spans) {
  const origins = new Array(lineCount).fill(null)
  const widths = new Array(lineCount).fill(Infinity)
  for (const span of spans ?? []) {
    for (let n = span.start; n <= span.end && n <= lineCount; n++) {
      if (span.end - span.start < widths[n - 1]) {
        widths[n - 1] = span.end - span.start
        origins[n - 1] = span.origin ?? null
      }
    }
  }
  return origins
}

const originKey = (origin) => origin ? origin.path.join('\u0000') : null

function OriginCard({ origin, x, y }) {
  return (
    <div
      className="fixed z-50 pointer-events-none max-w-sm rounded-md border border-edge bg-surface-hi shadow-lg px-3 py-2 text-[11px] space-y-0.5"
      style={{ left: x + 14, top: y + 14 }}
    >
      <div className="font-semibold text-content">
        {origin.component}{origin.name ? <span className="text-subtle font-normal"> · {origin.name}</span> : null}
      </div>
      {origin.config_map && <div className="text-subtle">Config map <span className="text-content">{origin.config_map}</span></div>}
      {origin.file && (
        <div className="font-mono text-subtle break-all">{origin.file}{origin.line ? `:${origin.line}` : ''}</div>
      )}
      <div className="font-mono text-[10px] text-subtle/60">{origin.path.join('.')}</div>
    </div>
  )
}

export default function ConfigViewer({ content, isLoading, error, spans }) {
  const [copied, setCopied] = useState(false)
  const [hover, setHover] = useState(null)  // { origin, x, y }

  const lines = useMemo(() => (content ? content.split('\n') : []), [content])
  const origins = useMemo(() => lineOrigins(lines.length, spans), [lines, spans])

  const copy = () => {
    navigator.clipboard.writeText(content ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  if (error)     return <div className="p-6 text-xs text-red-400">{error}</div>
  if (!content)  return <div className="p-6 text-xs text-subtle">No configuration available.</div>

  const hoveredKey = originKey(hover?.origin)

  return (
    <div className="relative flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-edge shrink-0">
        <span className="text-[10px] text-subtle">{lines.length} lines</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] text-subtle hover:text-content transition-colors"
        >
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex-1 overflow-auto" onMouseLeave={() => setHover(null)}>
        <table className="w-full border-collapse font-mono text-[11px] leading-5">
          <tbody>
            {lines.map((line, i) => {
              const origin = origins[i]
              const highlighted = hoveredKey !== null && originKey(origin) === hoveredKey
              return (
                <tr
                  key={i}
                  onMouseMove={spans ? (e) => setHover(origin ? { origin, x: e.clientX, y: e.clientY } : null) : undefined}
                  className={highlighted ? 'bg-brand/10' : 'hover:bg-surface-hi/50'}
                >
                  <td className="select-none w-10 pr-3 text-right text-subtle/40 border-r border-edge/30 sticky left-0 bg-surface">
                    {i + 1}
                  </td>
                  <td className={['pl-4 whitespace-pre', highlighted ? 'border-l-2 border-brand text-content' : 'text-content'].join(' ')}>
                    {line || ' '}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hover && <OriginCard {...hover} />}
    </div>
  )
}
