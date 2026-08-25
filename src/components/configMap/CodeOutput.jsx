import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import { useTheme } from '../../context/ThemeContext'

function PythonCode({ code }) {
  const { resolved } = useTheme()
  const theme = resolved === 'light' ? themes.nightOwlLight : themes.nightOwl
  return (
    <Highlight theme={theme} code={code.trimEnd()} language="python">
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          style={{ ...style, background: 'transparent', margin: 0 }}
          className="text-[12.5px] leading-relaxed font-mono"
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              <span className="inline-block w-9 select-none text-right pr-4 text-[11px] text-subtle/50">
                {i + 1}
              </span>
              {line.map((token, j) => (
                <span key={j} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}

export default function CodeOutput({ code, loading, placeholder = 'Generated code will appear here…' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full rounded-md border border-edge overflow-hidden bg-surface">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">
          Python
        </span>
        {code && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] transition-colors"
            style={{ color: copied ? '#16a34a' : 'var(--color-subtle)' }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-xs animate-pulse" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Generating…
          </div>
        ) : code ? (
          <PythonCode code={code} />
        ) : (
          <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {placeholder}
          </p>
        )}
      </div>
    </div>
  )
}
