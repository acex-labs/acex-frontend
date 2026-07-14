import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AiCtx = createContext(null)

export function AiProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [pageContext, setPageContext] = useState('')
  const [pageName, setPageName] = useState('')
  const [tabName, setTabName] = useState('')
  const [starters, setStarters] = useState([])
  const [placeholder, setPlaceholder] = useState('Ask a question…')

  return (
    <AiCtx.Provider value={{ open, setOpen, messages, setMessages, pageContext, setPageContext, pageName, setPageName, tabName, setTabName, starters, setStarters, placeholder, setPlaceholder }}>
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
