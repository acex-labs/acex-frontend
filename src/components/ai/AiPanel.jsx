import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Generic AI chat panel that can be dropped in on any page.
 *
 * Props:
 *   starters       [{key, label}]   — chips shown before conversation starts
 *   context        string           — page context sent as a system message on every call
 *   onStarterClick (key, {onToken, onDone, signal, context}) => Promise<void>
 *   onSend         (text, messages, {onToken, onDone, signal, context}) => Promise<void>
 *                  — messages is history before this turn
 *   disabled       boolean          — disables the toggle (e.g. no context loaded yet)
 *   placeholder    string           — input placeholder text
 */
export default function AiPanel({
  starters = [],
  context,
  onStarterClick,
  onSend,
  disabled = false,
  placeholder = 'Ask a question…',
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const hasConversation = messages.length > 0 || streaming

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && !hasConversation) inputRef.current?.focus()
  }, [open])

  const appendToken = useCallback((token) => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { ...last, content: last.content + token }]
    })
  }, [])

  const finishStreaming = useCallback(() => {
    setStreaming(false)
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last) return prev
      const { streaming: _, ...rest } = last
      return [...prev.slice(0, -1), rest]
    })
  }, [])

  const beginStream = () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStreaming(true)
    return { controller, signal: controller.signal, onToken: appendToken, onDone: finishStreaming, context }
  }

  const handleStarterClick = useCallback(async (key) => {
    const { signal, onToken, onDone } = beginStream()
    setOpen(true)
    setMessages([{ role: 'assistant', content: '', streaming: true }])
    try {
      await onStarterClick?.(key, { onToken, onDone, signal })
    } catch (e) {
      if (e.name !== 'AbortError') appendToken('\n[Error: ' + e.message + ']')
      finishStreaming()
    }
  }, [onStarterClick])

  const handleSend = useCallback(async () => {
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
      await onSend?.(text, history, { onToken, onDone, signal })
    } catch (e) {
      if (e.name !== 'AbortError') appendToken('\n[Error: ' + e.message + ']')
      finishStreaming()
    }
  }, [input, messages, streaming, onSend])

  const clear = () => {
    abortRef.current?.abort()
    setMessages([])
    setStreaming(false)
  }

  return (
    <div
      className="border-t border-edge shrink-0 flex flex-col overflow-hidden transition-all"
      style={{ height: open ? 280 : 44 }}
    >
      {/* Toggle bar */}
      <div className="flex items-center px-4 shrink-0" style={{ height: 44 }}>
        <button
          onClick={() => setOpen(o => !o)}
          disabled={disabled}
          className="flex items-center gap-1.5 text-[11px] font-medium text-subtle hover:text-content disabled:opacity-40 transition-colors"
        >
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          Ask AI
        </button>
        {open && hasConversation && (
          <button onClick={clear} className="ml-auto text-[10px] text-subtle hover:text-content">
            Clear
          </button>
        )}
      </div>

      {open && (
        <>
          {/* Empty state: starters + free input */}
          {!hasConversation && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {starters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-2">
                  {starters.map(s => (
                    <button
                      key={s.key}
                      onClick={() => handleStarterClick(s.key)}
                      className="text-[11px] px-2.5 py-1 rounded border border-edge text-subtle hover:text-content hover:border-edge/80 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-auto flex items-center border-t border-edge/50 px-4" style={{ height: 36 }}>
                <span className="text-brand/50 font-mono text-[11px] mr-2 select-none">›</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent text-[11px] font-mono text-content outline-none placeholder:text-subtle/30"
                />
              </div>
            </div>
          )}

          {/* Conversation */}
          {hasConversation && (
            <>
              <div className="flex-1 overflow-auto px-4 py-2 space-y-3 font-mono text-[11px] leading-relaxed">
                {messages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === 'user' ? (
                      <>
                        <span className="text-brand/50 select-none mr-1.5">›</span>
                        <span className="whitespace-pre-wrap text-subtle">{msg.content}</span>
                      </>
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
              <div className="flex items-center border-t border-edge/50 px-4 shrink-0" style={{ height: 36 }}>
                <span className="text-brand/50 font-mono text-[11px] mr-2 select-none">›</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
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
