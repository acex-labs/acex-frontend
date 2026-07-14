import { useState, useRef, useCallback, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { X, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamAsk } from '../../api/config'
import { useAiStore } from '../../context/AiContext'

// Maps URL path patterns to human-readable page names.
// More specific patterns must come before generic ones.
const ROUTE_NAMES = [
  [/^\/network\/nodes\/[^/]+$/, 'Node detail'],
  [/^\/network\/nodes$/,        'Nodes'],
  [/^\/network\/sites\/[^/]+$/, 'Site detail'],
  [/^\/network\/sites$/,        'Sites'],
  [/^\/network\/regions$/,      'Regions'],
  [/^\/network\/logical-nodes$/, 'Logical Nodes'],
  [/^\/network\/assets$/,       'Assets'],
  [/^\/network\/neds$/,         'NEDs'],
  [/^\/$/,                      'Dashboard'],
]

const TAB_LABELS = {
  overview:      'Overview',
  configuration: 'Configuration',
  hardware:      'Hardware',
  lldp:          'LLDP',
  history:       'History',
  nodes:         'Nodes',
  topology:      'Topology',
}

function resolvePageName(pathname) {
  for (const [pattern, name] of ROUTE_NAMES) {
    if (pattern.test(pathname)) return name
  }
  return null
}

export function AiToggleButton() {
  const { open, setOpen } = useAiStore()
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className={[
        'fixed bottom-5 right-5 z-50 flex items-center justify-center rounded-full w-10 h-10 shadow-lg transition-colors',
        open
          ? 'bg-brand text-white'
          : 'bg-surface border border-edge text-subtle hover:text-content',
      ].join(' ')}
      title={open ? 'Close AI' : 'Open AI'}
    >
      <Sparkles size={16} />
    </button>
  )
}

export default function GlobalAiPanel() {
  const { open, setOpen, messages, setMessages, pageContext, pageName, tabName, starters, placeholder } = useAiStore()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const hasConversation = messages.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && !hasConversation) inputRef.current?.focus()
  }, [open, hasConversation])

  const appendToken = useCallback((token) => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { ...last, content: last.content + token }]
    })
  }, [setMessages])

  const finishStreaming = useCallback(() => {
    setStreaming(false)
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last) return prev
      const { streaming: _, ...rest } = last
      return [...prev.slice(0, -1), rest]
    })
  }, [setMessages])

  // Builds context at call time — always reflects the current page state.
  // Pages may set explicit pageName/tabName/pageContext via usePageAiContext;
  // otherwise we derive them from the URL and read visible text from the DOM.
  const buildContext = useCallback(() => {
    const effectivePageName = pageName || resolvePageName(pathname)
    const urlTab = searchParams.get('tab')
    const effectiveTabName = tabName || (urlTab ? (TAB_LABELS[urlTab] ?? urlTab) : '')
    const locationLine = [effectivePageName, effectiveTabName].filter(Boolean).join(' › ')

    // Prefer structured context set by the page; fall back to DOM text.
    const data = pageContext || (() => {
      const el = document.querySelector('[data-ai-content]')
      return el ? el.innerText.trim() : ''
    })()

    return [
      locationLine ? `Current view: ${locationLine}` : null,
      data || null,
    ].filter(Boolean).join('\n\n')
  }, [pathname, searchParams, pageName, tabName, pageContext])

  const beginStream = () => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStreaming(true)
    return { signal: ctrl.signal, onToken: appendToken, onDone: finishStreaming }
  }

  const runStarter = useCallback(async (label) => {
    const { signal, onToken, onDone } = beginStream()
    setMessages([{ role: 'assistant', content: '', streaming: true }])
    try {
      await streamAsk({ prompt: label, context: buildContext(), messages: [], signal, onToken, onDone })
    } catch (e) {
      if (e.name !== 'AbortError') appendToken('\n[Error: ' + e.message + ']')
      finishStreaming()
    }
  }, [buildContext])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    const history = [...messages]
    const { signal, onToken, onDone } = beginStream()
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true },
    ])
    setInput('')
    try {
      await streamAsk({ prompt: text, context: buildContext(), messages: history, signal, onToken, onDone })
    } catch (e) {
      if (e.name !== 'AbortError') appendToken('\n[Error: ' + e.message + ']')
      finishStreaming()
    }
  }, [input, messages, streaming, buildContext])

  const clear = () => {
    abortRef.current?.abort()
    setMessages([])
    setStreaming(false)
  }

  return (
    <div className={[
      'flex flex-col h-full border-l border-edge bg-canvas overflow-hidden transition-all duration-200 shrink-0',
      open ? 'w-[380px]' : 'w-0',
    ].join(' ')}>
      {open && (
        <>
          {/* Header */}
          <div className="flex items-center px-4 shrink-0 border-b border-edge" style={{ height: 44 }}>
            <span className="text-[11px] font-semibold text-subtle uppercase tracking-widest">AI Assistant</span>
            <div className="ml-auto flex items-center gap-3">
              {hasConversation && (
                <button onClick={clear} className="text-[10px] text-subtle hover:text-content">
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-subtle hover:text-content">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Empty state: starters + input */}
          {!hasConversation && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {starters.length > 0 && (
                <div className="flex flex-col gap-1.5 px-4 pt-4">
                  {starters.map(s => (
                    <button
                      key={s.key}
                      onClick={() => runStarter(s.label)}
                      className="text-left text-[11px] px-3 py-2 rounded border border-edge text-subtle hover:text-content hover:border-edge/80 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              {starters.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[11px] text-subtle/50">Navigate to a page to get started</p>
                </div>
              )}
              <div className="mt-auto flex items-center border-t border-edge/50 px-4 shrink-0" style={{ height: 44 }}>
                <span className="text-brand/50 font-mono text-[11px] mr-2 select-none">›</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent text-[11px] font-mono text-content outline-none placeholder:text-subtle/30"
                />
              </div>
            </div>
          )}

          {/* Conversation */}
          {hasConversation && (
            <>
              <div className="flex-1 overflow-auto px-4 py-3 space-y-4 font-mono text-[11px] leading-relaxed">
                {messages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === 'user' ? (
                      <div className="flex gap-2">
                        <span className="text-brand/50 select-none shrink-0 mt-0.5">›</span>
                        <span className="whitespace-pre-wrap text-subtle">{msg.content}</span>
                      </div>
                    ) : (
                      <div className="text-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                            ul:     ({ children }) => <ul className="mb-1.5 pl-4 list-disc space-y-0.5">{children}</ul>,
                            ol:     ({ children }) => <ol className="mb-1.5 pl-4 list-decimal space-y-0.5">{children}</ol>,
                            li:     ({ children }) => <li>{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-content">{children}</strong>,
                            em:     ({ children }) => <em className="text-subtle">{children}</em>,
                            code:   ({ inline, children }) => inline
                              ? <code className="bg-surface-hi px-1 py-0.5 rounded text-[10px] text-brand">{children}</code>
                              : <pre className="bg-surface-hi p-2 rounded text-[10px] overflow-x-auto mb-1.5"><code>{children}</code></pre>,
                            h1:     ({ children }) => <p className="font-semibold text-content mb-1">{children}</p>,
                            h2:     ({ children }) => <p className="font-semibold text-content mb-1">{children}</p>,
                            h3:     ({ children }) => <p className="font-medium text-content mb-0.5">{children}</p>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {msg.streaming && (
                          <span className="inline-block w-1.5 h-3 bg-brand/60 animate-pulse ml-0.5 align-middle" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex items-center border-t border-edge/50 px-4 shrink-0" style={{ height: 44 }}>
                <span className="text-brand/50 font-mono text-[11px] mr-2 select-none">›</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Ask a follow-up…"
                  disabled={streaming}
                  className="flex-1 bg-transparent text-[11px] font-mono text-content outline-none placeholder:text-subtle/30 disabled:opacity-50"
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
