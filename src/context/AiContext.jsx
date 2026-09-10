import { createContext, useContext, useState, useEffect } from 'react'
import { fetchAiProviders } from '../api/aiOps'

const AiCtx = createContext(null)

export function AiProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [pageContext, setPageContext] = useState('')
  const [pageName, setPageName] = useState('')
  const [tabName, setTabName] = useState('')
  const [starters, setStarters] = useState([])
  const [placeholder, setPlaceholder] = useState('Ask a question…')
  const [taskPayload, setTaskPayload] = useState(null)

  // --- AI providers ---
  // Fetched once, display-only: shows which model the "chat" chain (or
  // "default") would currently answer with. There is no manual override —
  // chat always runs the fast chain, task-specific starters (see
  // taskPayload) run the backend's dedicated analysis chain. No `model` is
  // ever sent with requests; the backend's own failover chain always
  // decides.
  const [aiProviders, setAiProviders] = useState(null) // {providers: [], chains: {}} | null | 'error'
  const [selectedModel, setSelectedModel] = useState(null) // {provider, model} | null

  useEffect(() => {
    let cancelled = false
    fetchAiProviders()
      .then(data => { if (!cancelled) setAiProviders(data) })
      .catch(() => { if (!cancelled) setAiProviders('error') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!aiProviders || aiProviders === 'error' || selectedModel) return
    const chain = aiProviders.chains?.chat ?? aiProviders.chains?.default
    if (chain?.length) setSelectedModel({ provider: chain[0].provider, model: chain[0].model })
  }, [aiProviders, selectedModel])

  return (
    <AiCtx.Provider value={{
      open, setOpen, messages, setMessages,
      pageContext, setPageContext, pageName, setPageName, tabName, setTabName,
      starters, setStarters, placeholder, setPlaceholder,
      taskPayload, setTaskPayload,
      aiProviders, selectedModel,
    }}>
      {children}
    </AiCtx.Provider>
  )
}

export function useAiStore() {
  return useContext(AiCtx)
}

/**
 * Hook for pages to declare their AI context.
 * Re-runs when context changes (e.g. tab switch, data load).
 * Clears context on unmount so stale data doesn't linger.
 */
export function usePageAiContext({ context, pageName, tabName, starters, placeholder, taskPayload } = {}) {
  const store = useAiStore()

  useEffect(() => {
    store.setPageContext(context ?? '')
  }, [context])

  useEffect(() => {
    store.setPageName(pageName ?? '')
  }, [pageName])

  useEffect(() => {
    store.setTabName(tabName ?? '')
  }, [tabName])

  useEffect(() => {
    store.setStarters(starters ?? [])
  }, [starters])

  useEffect(() => {
    store.setPlaceholder(placeholder ?? 'Ask a question…')
  }, [placeholder])

  // Structured payload (e.g. a config diff) that task-specific starters send
  // to the dedicated analysis endpoint instead of the chat prompt.
  useEffect(() => {
    store.setTaskPayload(taskPayload ?? null)
  }, [taskPayload])

  useEffect(() => {
    return () => {
      store.setPageContext('')
      store.setPageName('')
      store.setTabName('')
      store.setStarters([])
      store.setTaskPayload(null)
    }
  }, [])
}
