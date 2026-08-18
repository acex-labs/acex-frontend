import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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

  // --- AI providers & model selection ---
  // Fetched once. Selection defaults to the first level of the "chat" chain
  // (falling back to "default"). `modelTouched` tracks whether the user has
  // changed away from the default — untouched means no `model` is sent, so
  // the backend failover chain applies.
  const [aiProviders, setAiProviders] = useState(null) // {providers: [], chains: {}} | null | 'error'
  const [selectedModel, setSelectedModel] = useState(null) // {provider, model} | null
  const [modelTouched, setModelTouched] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAiProviders()
      .then(data => { if (!cancelled) setAiProviders(data) })
      .catch(() => { if (!cancelled) setAiProviders('error') })
    return () => { cancelled = true }
  }, [])

  // Pre-select the default chat model once providers load
  useEffect(() => {
    if (!aiProviders || aiProviders === 'error' || selectedModel) return
    const chain = aiProviders.chains?.chat ?? aiProviders.chains?.default
    if (chain?.length) setSelectedModel({ provider: chain[0].provider, model: chain[0].model })
  }, [aiProviders, selectedModel])

  const selectModel = useCallback((provider, model) => {
    setSelectedModel({ provider, model })
    setModelTouched(true)
  }, [])

  // The model string to send with requests — null when untouched, so the
  // backend uses its failover chain. Format: "provider/model".
  const requestModel = modelTouched && selectedModel
    ? `${selectedModel.provider}/${selectedModel.model}`
    : null

  return (
    <AiCtx.Provider value={{
      open, setOpen, messages, setMessages,
      pageContext, setPageContext, pageName, setPageName, tabName, setTabName,
      starters, setStarters, placeholder, setPlaceholder,
      aiProviders, selectedModel, selectModel, modelTouched, requestModel,
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
export function usePageAiContext({ context, pageName, tabName, starters, placeholder } = {}) {
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

  useEffect(() => {
    return () => {
      store.setPageContext('')
      store.setPageName('')
      store.setTabName('')
      store.setStarters([])
    }
  }, [])
}
