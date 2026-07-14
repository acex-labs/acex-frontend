import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function ConfigViewer({ content, isLoading, error }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(content ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  if (error)     return <div className="p-6 text-xs text-red-400">{error}</div>
  if (!content)  return <div className="p-6 text-xs text-subtle">No configuration available.</div>

  const lines = content.split('\n')

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
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse font-mono text-[11px] leading-5">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-surface-hi/50">
                <td className="select-none w-10 pr-3 text-right text-subtle/40 border-r border-edge/30 sticky left-0 bg-surface">
                  {i + 1}
                </td>
                <td className="pl-4 text-content whitespace-pre">{line || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
