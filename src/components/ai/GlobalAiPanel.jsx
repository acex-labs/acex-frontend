import { useState, useRef, useCallback, useEffect } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { X, Sparkles, TriangleAlert, ArrowRight, Loader2, Check, Circle, Minus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamAsk, streamConfigAnalysis } from '../../api/config'
import { fetchSites, fetchNodes } from '../../api/inventory'
import { useAiStore } from '../../context/AiContext'
import ModelPicker from './ModelPicker'
import SessionUsageBar from './SessionUsageBar'
import ThinkingDots from './ThinkingDots'

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

// Labels shown above an assistant reply that came from a task-specific
// starter (dedicated analysis endpoint) instead of the chat prompt.
const TASK_LABELS = {
  explain:         'Explain · analysis model',
  risk_assessment: 'Risk assessment · analysis model',
  alignment:       'Alignment check · analysis model',
}

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

// Resolves a navigate_to tool call (see backend NAVIGATE_TOOL) to an actual
// route. The model usually only knows a site/node by name, not its internal
// id, so name-based calls are looked up here. Returns null for anything
// malformed or unresolvable — the button is only rendered when this
// resolves, so a bad or ambiguous suggestion just silently doesn't show one.
async function resolveNavPath(nav) {
  if (!nav?.page) return null
  switch (nav.page) {
    case 'node_detail': {
      if (nav.id) return `/network/nodes/${nav.id}${nav.tab ? `?tab=${nav.tab}` : ''}`
      if (!nav.name) return null
      const { items } = await fetchNodes({ hostname: nav.name, limit: 5 })
      const match = items.find(n => n.hostname?.toLowerCase() === nav.name.toLowerCase()) ?? (items.length === 1 ? items[0] : null)
      return match ? `/network/nodes/${match.id}${nav.tab ? `?tab=${nav.tab}` : ''}` : null
    }
    case 'site_detail': {
      if (nav.id) return `/network/sites/${nav.id}`
      if (!nav.name) return null
      const { items } = await fetchSites({ name: nav.name, limit: 5 })
      const match = items.find(s => s.name?.toLowerCase() === nav.name.toLowerCase()) ?? (items.length === 1 ? items[0] : null)
      return match ? `/network/sites/${match.id}` : null
    }
    case 'nodes_list':  return '/network/nodes'
    case 'sites_list':  return '/network/sites'
    case 'dashboard':   return '/'
    default: return null
  }
}

export function AiToggleButton() {
  const { open, setOpen } = useAiStore()
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className={[
        'fixed bottom-5 right-5 z-50 flex items-center justify-center rounded-full w-11 h-11 shadow-lg transition-colors',
        open
          ? 'bg-brand text-white'
          : 'bg-surface border-2 border-brand text-brand hover:bg-brand/10',
      ].join(' ')}
      title={open ? 'Close AI' : 'Open AI'}
    >
      <Sparkles size={18} />
    </button>
  )
}

export default function GlobalAiPanel() {
  const { open, setOpen, messages, setMessages, pageContext, pageName, tabName, starters, placeholder, taskPayload } = useAiStore()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const routerNavigate = useNavigate()

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [liveChars, setLiveChars] = useState(0)
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
    setLiveChars(c => { const n = c + token.length; if (n % 40 < token.length) console.debug('[AI] liveChars:', n); return n })
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { ...last, content: last.content + token }]
    })
  }, [setMessages])

  const attachUsage = useCallback((usage) => {
    console.debug('[AI] attachUsage called with:', usage)
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { ...last, usage }]
    })
  }, [setMessages])

  // The plan seeds the checklist; tool calls below tick its steps off.
  const attachPlan = useCallback((plan) => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      const steps = (plan.steps ?? []).map(s => ({
        name: s.description,
        tool: s.tool ?? null,
        status: 'pending',
      }))
      return [...prev.slice(0, -1), { ...last, planGoal: plan.goal ?? null, toolCalls: steps }]
    })
  }, [setMessages])

  // Tool calls are their own message metadata, not content: splicing status
  // lines into the prose leaves them in the text the user reads.
  //
  // A call is matched against the plan so the checklist ticks off rather than
  // growing a parallel list. Anything unplanned is appended — the assistant
  // following a new lead is legitimate, and hiding it would misrepresent what
  // it actually did.
  const attachToolCall = useCallback((call) => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      const calls = last.toolCalls ? [...last.toolCalls] : []

      const running = calls.findIndex(c => c.tool === call.name && c.status === 'running')
      if (running >= 0) {
        calls[running] = { ...calls[running], status: call.status, error: call.error }
        return [...prev.slice(0, -1), { ...last, toolCalls: calls }]
      }

      const planned = calls.findIndex(c => c.tool === call.name && c.status === 'pending')
      if (planned >= 0) {
        calls[planned] = { ...calls[planned], status: call.status, error: call.error }
      } else {
        calls.push({ name: call.name, tool: call.name, status: call.status, error: call.error })
      }
      return [...prev.slice(0, -1), { ...last, toolCalls: calls }]
    })
  }, [setMessages])

  const attachNavigate = useCallback(async (navigate) => {
    let path = null
    try {
      path = await resolveNavPath(navigate)
    } catch (e) {
      console.debug('[AI] navigate_to resolution failed:', e)
    }
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { ...last, navigate: { ...navigate, path } }]
    })
  }, [setMessages])

  const finishStreaming = useCallback(() => {
    setStreaming(false)
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last) return prev
      const { streaming: _, ...rest } = last
      // A planned step the assistant never ran — it used a different tool, or
      // an earlier finding made the step moot. Left pending it would read as
      // "still working"; marked skipped it reads as what happened.
      if (rest.toolCalls?.some(c => c.status === 'pending' || c.status === 'running')) {
        rest.toolCalls = rest.toolCalls.map(c =>
          c.status === 'pending' || c.status === 'running' ? { ...c, status: 'skipped' } : c,
        )
      }
      return [...prev.slice(0, -1), rest]
    })
  }, [setMessages])

  const failStreaming = useCallback((message) => {
    setStreaming(false)
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { role: 'assistant', content: message, error: true }]
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
    setLiveChars(0)
    setStreaming(true)
    return { signal: ctrl.signal, onToken: appendToken, onUsage: attachUsage, onNavigate: attachNavigate, onToolCall: attachToolCall, onPlan: attachPlan, onDone: finishStreaming }
  }

  // Task-specific starters (starter.task set, e.g. from a config diff) run
  // the backend's dedicated analysis endpoint/chain instead of chat. That
  // endpoint has no tool calling, so no onNavigate there — navigate_to is
  // chat-only (see backend NAVIGATE_TOOL).
  const runStarter = useCallback(async (starter) => {
    const { signal, onToken, onUsage, onNavigate, onToolCall, onPlan, onDone } = beginStream()
    if (starter.task && taskPayload) {
      setMessages([{ role: 'assistant', content: '', streaming: true, task: starter.task }])
      try {
        await streamConfigAnalysis({
          task: starter.task,
          diff: taskPayload.diff,
          nodeHostname: taskPayload.nodeHostname,
          snapAHash: taskPayload.snapAHash,
          snapBHash: taskPayload.snapBHash,
          snapATimestamp: taskPayload.snapATimestamp,
          snapBTimestamp: taskPayload.snapBTimestamp,
          signal, onToken, onUsage, onToolCall, onPlan, onDone,
        })
      } catch (e) {
        if (e.name !== 'AbortError') failStreaming(e.message)
        else finishStreaming()
      }
      return
    }
    setMessages([{ role: 'assistant', content: '', streaming: true }])
    try {
      await streamAsk({ prompt: starter.label, context: buildContext(), messages: [], signal, onToken, onUsage, onNavigate, onToolCall, onPlan, onDone })
    } catch (e) {
      if (e.name !== 'AbortError') failStreaming(e.message)
      else finishStreaming()
    }
  }, [buildContext, taskPayload])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    const history = [...messages]
    const { signal, onToken, onUsage, onNavigate, onToolCall, onPlan, onDone } = beginStream()
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true },
    ])
    setInput('')
    try {
      await streamAsk({ prompt: text, context: buildContext(), messages: history, signal, onToken, onUsage, onNavigate, onToolCall, onPlan, onDone })
    } catch (e) {
      if (e.name !== 'AbortError') failStreaming(e.message)
      else finishStreaming()
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
              <ModelPicker />
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
                      onClick={() => runStarter(s)}
                      className="text-left text-[11px] px-3 py-2 rounded border border-edge text-subtle hover:text-content hover:border-edge/80 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              {starters.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[11px] text-subtle/50">Say hi! 👋</p>
                </div>
              )}
              <SessionUsageBar messages={messages} streaming={streaming} liveTokens={streaming ? Math.round(liveChars / 4) : null} />
              <div className="flex items-center border-t border-edge/50 px-4 shrink-0" style={{ height: 44 }}>
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
                    <>
                    {msg.task && (
                      <div className="flex items-center gap-1.5 mb-1 text-[9px] font-semibold uppercase tracking-wider text-brand/80">
                        <Sparkles size={10} />
                        {TASK_LABELS[msg.task] ?? 'Expert review'}
                      </div>
                    )}
                    {msg.planGoal && (
                      <div className="mb-1 text-[10px] text-subtle/70">{msg.planGoal}</div>
                    )}
                    {msg.toolCalls?.length > 0 && (
                      <ul className="mb-2 space-y-1">
                        {msg.toolCalls.map((tc, n) => (
                          <li key={`${tc.name}-${n}`} className="flex items-start gap-1.5 text-[10px]">
                            <span className="shrink-0 mt-[2px]">
                              {tc.status === 'skipped'
                                ? <Minus size={10} className="text-subtle/40" />
                                : tc.status === 'pending'
                                ? <Circle size={10} className="text-subtle/40" />
                                : tc.status === 'running'
                                  ? <Loader2 size={10} className="animate-spin text-brand/70" />
                                  : tc.status === 'error'
                                    ? <TriangleAlert size={10} className="text-amber-500" />
                                    : <Check size={10} className="text-brand" />}
                            </span>
                            <span className="min-w-0">
                              <span className={
                                tc.status === 'error' ? 'text-amber-500'
                                  : (tc.status === 'pending' || tc.status === 'skipped') ? 'text-subtle/50'
                                    : 'text-subtle'
                              }>
                                {tc.name}
                              </span>
                              {tc.error && (
                                <span className="block text-subtle/60 line-clamp-2" title={tc.error}>
                                  {tc.error}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {msg.error ? (
                      <div className="flex items-start gap-2 text-amber-500 bg-amber-500/10 border border-amber-500/25 rounded px-2.5 py-2">
                        <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      </div>
                    ) : msg.streaming && !msg.content ? (
                      <ThinkingDots label={msg.task ? 'Consulting expert…' : undefined} />
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
                    {msg.navigate && msg.navigate.path && (
                      <button
                        onClick={() => routerNavigate(msg.navigate.path)}
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded border border-brand/40 text-brand hover:bg-brand/10 transition-colors"
                      >
                        {msg.navigate.label || 'Open page'}
                        <ArrowRight size={11} />
                      </button>
                    )}
                    </>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <SessionUsageBar messages={messages} streaming={streaming} liveTokens={streaming ? Math.round(liveChars / 4) : null} />
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
